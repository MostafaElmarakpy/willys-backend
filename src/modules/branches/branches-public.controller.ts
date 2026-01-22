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
import { ZonesService } from "./zones.service";

@Controller("branches")
export class BranchesPublicController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly zonesService: ZonesService,
  ) {}

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

  @Get("serving")
  @Version("1")
  async findServingBranch(
    @Query("latitude") latitude: number,
    @Query("longitude") longitude: number,
  ) {
    const result = await this.zonesService.checkPointInZone({
      latitude,
      longitude,
    });

    const servingBranch = result.matchingBranches[0]?.branch || null;

    return createSuccessResponse(
      {
        branch: servingBranch,
        canDeliver: result.isInZone,
        zone: result.matchingBranches[0]?.zone || null,
      },
      servingBranch ? "Serving branch found" : "No branch serves this location",
    );
  }

  @Get(":id")
  @Version("1")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    const branch = await this.branchesService.findOne(id);

    return createSuccessResponse(branch, "Branch retrieved successfully");
  }
}
