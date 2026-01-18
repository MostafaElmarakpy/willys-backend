import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Branch } from "../../database/entities/branch.entity";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) readonly branchRepository: Repository<Branch>,
  ) {}

  async create(createBranchDto: CreateBranchDto): Promise<Branch> {
    try {
      const branch = this.branchRepository.create({
        ...createBranchDto,
        isActive: createBranchDto.isActive ?? true,
        isOpen: createBranchDto.isOpen ?? true,
      });

      return await this.branchRepository.save(branch);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create branch: ${error.message}`,
      );
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{
    branches: Branch[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const allowedSortFields = [
      "name",
      "createdAt",
      "updatedAt",
      "city",
      "area",
    ];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "name";

    const [branches, total] = await this.branchRepository.findAndCount({
      relations: ["zones"],
      order: { [orderField]: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      branches,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findActive(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{
    branches: Branch[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const allowedSortFields = [
      "name",
      "createdAt",
      "updatedAt",
      "city",
      "area",
    ];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "name";

    const [branches, total] = await this.branchRepository.findAndCount({
      where: { isActive: true },
      relations: ["zones"],
      order: { [orderField]: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      branches,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOpen(
    page: number = 1,
    limit: number = 10,
    sortBy?: string,
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{
    branches: Branch[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const allowedSortFields = [
      "name",
      "createdAt",
      "updatedAt",
      "city",
      "area",
    ];
    const orderField =
      sortBy && allowedSortFields.includes(sortBy) ? sortBy : "name";

    const [branches, total] = await this.branchRepository.findAndCount({
      where: { isActive: true, isOpen: true },
      relations: ["zones"],
      order: { [orderField]: sortOrder },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      branches,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Branch> {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: ["zones"],
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
    const branch = await this.findOne(id);

    Object.assign(branch, updateBranchDto);

    try {
      return await this.branchRepository.save(branch);
    } catch (error) {
      throw new BadRequestException(
        `Failed to update branch: ${error.message}`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOne(id);
    await this.branchRepository.remove(branch);
  }

  async toggleStatus(id: string, status: "active" | "open"): Promise<Branch> {
    const branch = await this.findOne(id);

    if (status === "active") {
      branch.isActive = !branch.isActive;
    } else if (status === "open") {
      branch.isOpen = !branch.isOpen;
    }

    return await this.branchRepository.save(branch);
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
  ): Promise<Branch[]> {
    // Using Haversine formula to find nearby branches
    const query = `
      SELECT *, 
        (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians($2)) + sin(radians($1)) * 
        sin(radians(latitude)))) AS distance
      FROM branches 
      WHERE "isActive" = true AND "deletedAt" IS NULL
      HAVING distance < $3
      ORDER BY distance
    `;

    const branches = await this.branchRepository.query(query, [
      latitude,
      longitude,
      radiusKm,
    ]);

    return branches;
  }

  async getBranchStats(id: string) {
    const branch = await this.findOne(id);

    // TODO: Add order statistics when orders module is created
    return {
      branch,
      stats: {
        totalZones: branch.zones?.length || 0,
        activeZones: branch.zones?.filter((zone) => zone.isActive).length || 0,
        // totalOrders: 0,
        // todaysOrders: 0,
        // avgDeliveryTime: branch.estimatedDeliveryTime,
      },
    };
  }
}
