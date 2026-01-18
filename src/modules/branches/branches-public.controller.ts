import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Version,
} from "@nestjs/common";
import { createSuccessResponse } from "../../common/utils/api-response-wrapper";
import { BranchesService } from "./branches.service";

@Controller("branches")
export class BranchesPublicController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Version("1")
  async findAllActive() {
    const result = await this.branchesService.findActive(1, 100);
    return createSuccessResponse(
      result.branches,
      "Branches retrieved successfully",
    );
  }

  @Get("nearby")
  @Version("1")
  async findNearby(
    @Query("latitude") latitude: number,
    @Query("longitude") longitude: number,
    @Query("radius") radius?: number,
  ) {
    const branches = await this.branchesService.findNearby(
      latitude,
      longitude,
      radius,
    );

    return createSuccessResponse(
      branches,
      "Nearby branches retrieved successfully",
    );
  }

  @Get(":id")
  @Version("1")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const branch = await this.branchesService.findOne(id);

    return createSuccessResponse(branch, "Branch retrieved successfully");
  }
}
