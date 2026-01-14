import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
  Version,
} from "@nestjs/common";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { createSuccessResponse } from "src/common/utils/api-response-wrapper";
import { DiscountsService } from "./discounts.service";
import { DiscountResponseDto } from "./dto/discount-response.dto";

@UseGuards(JwtAuthGuard)
@Controller("discounts")
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get("my-discounts")
  @Version("1")
  async getMyDiscounts(@Request() req: any) {
    const discounts = await this.discountsService.getUserDiscounts(req.user.id);
    const response = discounts.map((d) => new DiscountResponseDto(d));
    return createSuccessResponse(
      response,
      "User discounts retrieved successfully",
    );
  }

  @Get("item/:itemId")
  @Version("1")
  async getItemDiscounts(@Param("itemId") itemId: string) {
    const discounts = await this.discountsService.getItemDiscounts(itemId);
    const response = discounts.map((d) => new DiscountResponseDto(d));
    return createSuccessResponse(
      response,
      "Item discounts retrieved successfully",
    );
  }

  @Post("validate")
  @Version("1")
  async validateDiscount(
    @Body("discountId") discountId: string,
    @Body("itemId") itemId: string,
    @Request() req: any,
  ) {
    const result = await this.discountsService.canUseDiscount(
      discountId,
      req.user.id,
      itemId,
    );

    if (result.canUse) {
      const discount = await this.discountsService.findOne(discountId);
      return createSuccessResponse(
        {
          isEligible: true,
          discount: new DiscountResponseDto(discount),
        },
        "Discount is valid",
      );
    } else {
      return createSuccessResponse(
        {
          isEligible: false,
          reason: result.reason,
        },
        "Discount validation result",
      );
    }
  }

  @Post("calculate")
  @Version("1")
  async calculateDiscount(
    @Body("discountId") discountId: string,
    @Body("originalPrice") originalPrice: number,
    @Body("quantity") quantity: number = 1,
    @Request() req: any,
  ) {
    const discount = await this.discountsService.findOne(discountId);
    const canUseResult = await this.discountsService.canUseDiscount(
      discountId,
      req.user.id,
    );

    if (!canUseResult.canUse) {
      return createSuccessResponse(
        {
          canApply: false,
          reason: canUseResult.reason,
        },
        "Discount cannot be applied",
      );
    }

    const discountAmount = this.discountsService.calculateDiscountAmount(
      discount,
      originalPrice,
      quantity,
    );

    return createSuccessResponse(
      {
        canApply: true,
        discountAmount,
        finalPrice: originalPrice - discountAmount,
        discount: new DiscountResponseDto(discount),
      },
      "Discount calculated successfully",
    );
  }
}
