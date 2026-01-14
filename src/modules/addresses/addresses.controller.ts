import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { User } from "src/common/decorators/user.decorator";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import {
  createCreatedResponse,
  createSuccessResponse,
} from "src/common/utils/api-response-wrapper";
import { AddressesService } from "./addresses.service";
import { AddressResponseDto } from "./dto/address-response.dto";
import { CreateAddressDto } from "./dto/create-address.dto";
import { UpdateAddressDto } from "./dto/update-address.dto";
import {
  AddressValidationResponseDto,
  type ValidateAddressDto,
} from "./dto/validate-address.dto";

@Controller("addresses")
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  async create(@User("id") userId: string, @Body() dto: CreateAddressDto) {
    const address = await this.addressesService.create(userId, dto);
    return createCreatedResponse(
      new AddressResponseDto(address),
      "Address created successfully",
    );
  }

  @Get()
  async findAll(@User("id") userId: string) {
    const addresses = await this.addressesService.findAll(userId);
    return createSuccessResponse(
      addresses.map((address) => new AddressResponseDto(address)),
      "Addresses retrieved successfully",
    );
  }

  @Get(":id")
  async findOne(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.findOne(userId, id);
    return createSuccessResponse(
      new AddressResponseDto(address),
      "Address retrieved successfully",
    );
  }

  @Patch(":id")
  async update(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(userId, id, dto);
    return createSuccessResponse(
      new AddressResponseDto(address),
      "Address updated successfully",
    );
  }

  @Delete(":id")
  async remove(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.addressesService.remove(userId, id);
    return createSuccessResponse(null, "Address deleted successfully");
  }

  @Post(":id/default")
  async setDefault(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.setDefault(userId, id);
    return createSuccessResponse(
      new AddressResponseDto(address),
      "Address set as default successfully",
    );
  }

  @Post("validate")
  async validateAddress(@Body() dto: ValidateAddressDto) {
    const result = await this.addressesService.validateAddress(
      dto.latitude,
      dto.longitude,
    );
    return createSuccessResponse(
      new AddressValidationResponseDto(result),
      "Address validation completed",
    );
  }

  @Post(":id/revalidate")
  async revalidateAddress(
    @User("id") userId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    const address = await this.addressesService.revalidateAddress(userId, id);
    return createSuccessResponse(
      new AddressResponseDto(address),
      "Address revalidated successfully",
    );
  }
}
