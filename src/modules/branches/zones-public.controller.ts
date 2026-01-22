import { Controller, Get, Query, Version } from "@nestjs/common";
import { createSuccessResponse } from "../../common/utils/api-response-wrapper";
import { ZonesService } from "./zones.service";

@Controller("zones")
export class ZonesPublicController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get("check")
  @Version("1")
  async checkDeliveryZone(
    @Query("latitude") latitude: number,
    @Query("longitude") longitude: number,
  ) {
    const result = await this.zonesService.checkPointInZone({
      latitude,
      longitude,
    });

    return createSuccessResponse(
      {
        canDeliver: result.isInZone,
        availableBranches: result.matchingBranches,
        recommendedBranch: result.matchingBranches[0]?.branch || null,
      },
      "Zone check completed",
    );
  }
}
