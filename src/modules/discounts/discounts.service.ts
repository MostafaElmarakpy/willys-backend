import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DiscountStatus } from "src/common/enums/DiscountStatus";
import { DiscountTargetType } from "src/common/enums/DiscountTargetType";
import { DiscountType } from "src/common/enums/DiscountType";
import { Discount } from "src/database/entities/discount.entity";
import { DiscountUsageLog } from "src/database/entities/discount-usage-log.entity";
import { ItemDiscount } from "src/database/entities/item-discount.entity";
import { UserDiscount } from "src/database/entities/user-discount.entity";
import { DataSource, IsNull, type QueryRunner, type Repository } from "typeorm";
import { CreateDiscountDto } from "./dto/create-discount.dto";
import { DiscountFilterDto } from "./dto/discount-filter.dto";
import { UpdateDiscountDto } from "./dto/update-discount.dto";

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(Discount)
    readonly discountRepository: Repository<Discount>,
    @InjectRepository(UserDiscount)
    readonly userDiscountRepository: Repository<UserDiscount>,
    @InjectRepository(ItemDiscount)
    readonly itemDiscountRepository: Repository<ItemDiscount>,
    @InjectRepository(DiscountUsageLog)
    readonly usageLogRepository: Repository<DiscountUsageLog>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDiscountDto: CreateDiscountDto,
    userId: string,
  ): Promise<Discount> {
    this.validateDiscountDto(createDiscountDto);

    // Check if code is unique (if provided)
    if (createDiscountDto.code) {
      const existingDiscount = await this.discountRepository.findOne({
        where: { code: createDiscountDto.code, deletedAt: IsNull() },
      });

      if (existingDiscount) {
        throw new BadRequestException(
          `Discount code "${createDiscountDto.code}" already exists`,
        );
      }
    }

    const discount = this.discountRepository.create({
      ...createDiscountDto,
      createdBy: userId,
    });

    return await this.discountRepository.save(discount);
  }

  async findAll(filterDto: DiscountFilterDto) {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      type,
      targetType,
      isActive,
      startDate,
      endDate,
      minValue,
      maxValue,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = filterDto;

    const validSortFields = [
      "createdAt",
      "updatedAt",
      "startDate",
      "value",
      "status",
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const whereConditions: string[] = ['d."deletedAt" IS NULL'];
    const parameters: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(
        `(d.name ->> 'en' ILIKE $${paramIndex} OR d.name ->> 'ar' ILIKE $${paramIndex} OR d.description ->> 'en' ILIKE $${paramIndex} OR d.description ->> 'ar' ILIKE $${paramIndex} OR d.code ILIKE $${paramIndex})`,
      );
      parameters.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`d.status = $${paramIndex}`);
      parameters.push(status);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`d.type = $${paramIndex}`);
      parameters.push(type);
      paramIndex++;
    }

    if (targetType) {
      whereConditions.push(`d."targetType" = $${paramIndex}`);
      parameters.push(targetType);
      paramIndex++;
    }

    if (isActive !== undefined) {
      whereConditions.push(`d."isActive" = $${paramIndex}`);
      parameters.push(isActive);
      paramIndex++;
    }

    if (startDate && endDate) {
      whereConditions.push(
        `d."startDate" BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
      );
      parameters.push(startDate, endDate);
      paramIndex += 2;
    } else if (startDate) {
      whereConditions.push(`d."startDate" >= $${paramIndex}`);
      parameters.push(startDate);
      paramIndex++;
    } else if (endDate) {
      whereConditions.push(`d."endDate" <= $${paramIndex}`);
      parameters.push(endDate);
      paramIndex++;
    }

    if (minValue !== undefined && maxValue !== undefined) {
      whereConditions.push(
        `d.value BETWEEN $${paramIndex} AND $${paramIndex + 1}`,
      );
      parameters.push(minValue, maxValue);
      paramIndex += 2;
    } else if (minValue !== undefined) {
      whereConditions.push(`d.value >= $${paramIndex}`);
      parameters.push(minValue);
      paramIndex++;
    } else if (maxValue !== undefined) {
      whereConditions.push(`d.value <= $${paramIndex}`);
      parameters.push(maxValue);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const orderByClause = `ORDER BY d."${sortField}" ${sortOrder}`;

    const discountsQuery = `
      SELECT
        d.id,
        d.code,
        d.name,
        d.description,
        d.type,
        d."targetType",
        d.value,
        d."buyQuantity",
        d."getQuantity",
        d."freeItemId",
        d."minimumPurchase",
        d."maxUsageTotal",
        d."maxUsagePerUser",
        d."currentUsageCount",
        d."startDate",
        d."endDate",
        d.status,
        d."isActive",
        d."createdBy",
        d."updatedBy",
        d."createdAt",
        d."updatedAt"
      FROM discounts d
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT d.id) as total
      FROM discounts d
      ${whereClause}
    `;

    const activeCountQuery = `
      SELECT COUNT(DISTINCT d.id) as active_count
      FROM discounts d
      ${whereClause}
      ${whereConditions.length > 0 ? "AND" : "WHERE"} d."isActive" = true
    `;

    const inactiveCountQuery = `
      SELECT COUNT(DISTINCT d.id) as inactive_count
      FROM discounts d
      ${whereClause}
      ${whereConditions.length > 0 ? "AND" : "WHERE"} d."isActive" = false
    `;

    const percentageCountQuery = `
      SELECT COUNT(DISTINCT d.id) as percentage_count
      FROM discounts d
      ${whereClause}
      ${whereConditions.length > 0 ? "AND" : "WHERE"} d."type" = 'percentage'
    `;

    const discountsParameters = [...parameters, limit, (page - 1) * limit];
    const countParameters = [...parameters];

    const [
      discounts,
      countResult,
      activeCountResult,
      inactiveCountResult,
      percentageCountResult,
    ] = await Promise.all([
      this.discountRepository.query(discountsQuery, discountsParameters),
      this.discountRepository.query(countQuery, countParameters),
      this.discountRepository.query(activeCountQuery, countParameters),
      this.discountRepository.query(inactiveCountQuery, countParameters),
      this.discountRepository.query(percentageCountQuery, countParameters),
    ]);

    const total = parseInt(countResult[0].total, 10);
    const activeCount = parseInt(activeCountResult[0].active_count, 10);
    const inactiveCount = parseInt(inactiveCountResult[0].inactive_count, 10);
    const percentageDiscountsCount = parseInt(
      percentageCountResult[0].percentage_count,
      10,
    );

    return {
      discounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      activeCount,
      inactiveCount,
      percentageDiscountsCount,
    };
  }

  async findOne(id: string): Promise<Discount> {
    const discount = await this.discountRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["freeItem", "createdByUser", "updatedByUser"],
    });

    if (!discount) {
      throw new NotFoundException("Discount not found");
    }

    return discount;
  }

  async findByCode(code: string): Promise<Discount | null> {
    return this.discountRepository.findOne({
      where: { code, deletedAt: IsNull() },
      relations: ["freeItem"],
    });
  }

  async update(
    id: string,
    updateDiscountDto: UpdateDiscountDto,
    userId: string,
  ): Promise<Discount> {
    const discount = await this.findOne(id);

    if (
      updateDiscountDto.targetType &&
      updateDiscountDto.targetType !== discount.targetType
    ) {
      throw new BadRequestException("Cannot change discount target type");
    }

    this.validateDiscountDto(updateDiscountDto);

    Object.assign(discount, updateDiscountDto);
    discount.updatedBy = userId;

    return await this.discountRepository.save(discount);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.discountRepository.softDelete(id);
  }

  async duplicate(id: string, userId: string): Promise<Discount> {
    const originalDiscount = await this.findOne(id);

    const duplicatedDiscount = this.discountRepository.create({
      code: originalDiscount.code ? `${originalDiscount.code}_COPY` : undefined,
      name: {
        ar: `${originalDiscount.name.ar} - نسخة`,
        en: `${originalDiscount.name.en} - Copy`,
      },
      description: originalDiscount.description,
      type: originalDiscount.type,
      targetType: originalDiscount.targetType,
      value: originalDiscount.value,
      buyQuantity: originalDiscount.buyQuantity,
      getQuantity: originalDiscount.getQuantity,
      freeItemId: originalDiscount.freeItemId,
      minimumPurchase: originalDiscount.minimumPurchase,
      maxUsageTotal: originalDiscount.maxUsageTotal,
      maxUsagePerUser: originalDiscount.maxUsagePerUser,
      startDate: originalDiscount.startDate,
      endDate: originalDiscount.endDate,
      status: DiscountStatus.SCHEDULED,
      isActive: false,
      createdBy: userId,
    });

    return await this.discountRepository.save(duplicatedDiscount);
  }

  async assignToUsers(
    discountId: string,
    userIds: string[],
    adminUserId: string,
  ): Promise<void> {
    const discount = await this.findOne(discountId);

    if (discount.targetType !== DiscountTargetType.USER) {
      throw new BadRequestException(
        "This discount can only be assigned to items",
      );
    }

    const assignments = userIds.map((userId) => ({
      userId,
      discountId,
      assignedBy: adminUserId,
      usageCount: 0,
    }));

    await this.userDiscountRepository.save(assignments);
  }

  async assignToItems(
    discountId: string,
    itemIds: string[],
    adminUserId: string,
  ): Promise<void> {
    const discount = await this.findOne(discountId);

    if (discount.targetType !== DiscountTargetType.ITEM) {
      throw new BadRequestException(
        "This discount can only be assigned to users",
      );
    }

    const assignments = itemIds.map((itemId) => ({
      itemId,
      discountId,
      assignedBy: adminUserId,
    }));

    await this.itemDiscountRepository.save(assignments);
  }

  async removeUserAssignment(
    discountId: string,
    userId: string,
  ): Promise<void> {
    await this.userDiscountRepository.delete({ discountId, userId });
  }

  async removeItemAssignment(
    discountId: string,
    itemId: string,
  ): Promise<void> {
    await this.itemDiscountRepository.delete({ discountId, itemId });
  }

  async getUserDiscounts(userId: string): Promise<Discount[]> {
    const userDiscounts = await this.userDiscountRepository.find({
      where: { userId },
      relations: ["discount"],
    });

    return userDiscounts
      .map((ud) => ud.discount)
      .filter((d) => this.isDiscountActive(d));
  }

  async getItemDiscounts(itemId: string): Promise<Discount[]> {
    const itemDiscounts = await this.itemDiscountRepository.find({
      where: { itemId },
      relations: ["discount"],
    });

    return itemDiscounts
      .map((id) => id.discount)
      .filter((d) => this.isDiscountActive(d));
  }

  async getAssignedUsers(discountId: string): Promise<any[]> {
    const userDiscounts = await this.userDiscountRepository.find({
      where: { discountId },
      relations: ["user"],
    });

    return userDiscounts.map((ud) => ({
      id: ud.user.id,
      fullName: ud.user.fullName,
      email: ud.user.email,
      usageCount: ud.usageCount,
      lastUsedAt: ud.lastUsedAt,
      assignedAt: ud.assignedAt,
    }));
  }

  async getAssignedItems(discountId: string): Promise<any[]> {
    const itemDiscounts = await this.itemDiscountRepository.find({
      where: { discountId },
      relations: ["item"],
    });

    return itemDiscounts.map((id) => ({
      id: id.item.id,
      name: id.item.name,
      assignedAt: id.assignedAt,
    }));
  }

  async canUseDiscount(
    discountId: string,
    userId: string,
    itemId?: string,
    useTransaction = false,
  ): Promise<{ canUse: boolean; reason?: string }> {
    // Use pessimistic locking when called within a transaction
    if (useTransaction) {
      return this.canUseDiscountWithLock(discountId, userId, itemId);
    }

    const discount = await this.findOne(discountId);

    if (!this.isDiscountActive(discount)) {
      return { canUse: false, reason: "Discount is not active or has expired" };
    }

    if (
      discount.maxUsageTotal &&
      discount.currentUsageCount >= discount.maxUsageTotal
    ) {
      return { canUse: false, reason: "Discount usage limit reached" };
    }

    if (discount.targetType === DiscountTargetType.USER) {
      const userDiscount = await this.userDiscountRepository.findOne({
        where: { userId, discountId },
      });

      if (!userDiscount) {
        return { canUse: false, reason: "Discount not assigned to this user" };
      }

      if (
        discount.maxUsagePerUser &&
        userDiscount.usageCount >= discount.maxUsagePerUser
      ) {
        return {
          canUse: false,
          reason: "User has reached their usage limit for this discount",
        };
      }
    }

    if (discount.targetType === DiscountTargetType.ITEM && itemId) {
      const itemDiscount = await this.itemDiscountRepository.findOne({
        where: { itemId, discountId },
      });

      if (!itemDiscount) {
        return { canUse: false, reason: "Discount not assigned to this item" };
      }
    }

    return { canUse: true };
  }

  private async canUseDiscountWithLock(
    discountId: string,
    userId: string,
    itemId?: string,
  ): Promise<{ canUse: boolean; reason?: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the discount row for update
      const discount = await queryRunner.manager
        .createQueryBuilder(Discount, "discount")
        .where("discount.id = :id", { id: discountId })
        .andWhere("discount.deletedAt IS NULL")
        .setLock("pessimistic_write")
        .getOne();

      if (!discount) {
        await queryRunner.rollbackTransaction();
        return { canUse: false, reason: "Discount not found" };
      }

      if (!this.isDiscountActive(discount)) {
        await queryRunner.rollbackTransaction();
        return {
          canUse: false,
          reason: "Discount is not active or has expired",
        };
      }

      if (
        discount.maxUsageTotal &&
        discount.currentUsageCount >= discount.maxUsageTotal
      ) {
        await queryRunner.rollbackTransaction();
        return { canUse: false, reason: "Discount usage limit reached" };
      }

      if (discount.targetType === DiscountTargetType.USER) {
        // Lock user discount for update
        const userDiscount = await queryRunner.manager
          .createQueryBuilder(UserDiscount, "userDiscount")
          .where("userDiscount.userId = :userId", { userId })
          .andWhere("userDiscount.discountId = :discountId", { discountId })
          .setLock("pessimistic_write")
          .getOne();

        if (!userDiscount) {
          await queryRunner.rollbackTransaction();
          return {
            canUse: false,
            reason: "Discount not assigned to this user",
          };
        }

        if (
          discount.maxUsagePerUser &&
          userDiscount.usageCount >= discount.maxUsagePerUser
        ) {
          await queryRunner.rollbackTransaction();
          return {
            canUse: false,
            reason: "User has reached their usage limit for this discount",
          };
        }
      }

      if (discount.targetType === DiscountTargetType.ITEM && itemId) {
        const itemDiscount = await queryRunner.manager.findOne(ItemDiscount, {
          where: { itemId, discountId },
        });

        if (!itemDiscount) {
          await queryRunner.rollbackTransaction();
          return {
            canUse: false,
            reason: "Discount not assigned to this item",
          };
        }
      }

      await queryRunner.commitTransaction();
      return { canUse: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async recordUsage(
    discountId: string,
    userId: string,
    discountAmount: number,
    itemId?: string,
    orderId?: string,
    externalQueryRunner?: QueryRunner,
  ): Promise<void> {
    // Use external query runner if provided, otherwise create our own
    const queryRunner =
      externalQueryRunner || this.dataSource.createQueryRunner();
    const isExternalTransaction = !!externalQueryRunner;

    // Only manage connection and transaction if we created it
    if (!isExternalTransaction) {
      await queryRunner.connect();
      await queryRunner.startTransaction();
    }

    try {
      // Lock the discount row for update and increment atomically
      const discount = await queryRunner.manager
        .createQueryBuilder(Discount, "discount")
        .where("discount.id = :id", { id: discountId })
        .setLock("pessimistic_write")
        .getOne();

      if (!discount) {
        throw new NotFoundException("Discount not found");
      }

      // Double-check usage limits with locked row
      if (
        discount.maxUsageTotal &&
        discount.currentUsageCount >= discount.maxUsageTotal
      ) {
        throw new BadRequestException("Discount usage limit reached");
      }

      // Create usage log
      await queryRunner.manager.save(DiscountUsageLog, {
        discountId,
        userId,
        itemId,
        orderId,
        discountAmount,
      });

      // Atomically increment usage count
      await queryRunner.manager.increment(
        Discount,
        { id: discountId },
        "currentUsageCount",
        1,
      );

      if (discount.targetType === DiscountTargetType.USER) {
        // Lock user discount for update
        const userDiscount = await queryRunner.manager
          .createQueryBuilder(UserDiscount, "userDiscount")
          .where("userDiscount.userId = :userId", { userId })
          .andWhere("userDiscount.discountId = :discountId", { discountId })
          .setLock("pessimistic_write")
          .getOne();

        if (userDiscount) {
          // Double-check per-user limit
          if (
            discount.maxUsagePerUser &&
            userDiscount.usageCount >= discount.maxUsagePerUser
          ) {
            throw new BadRequestException(
              "User has reached their usage limit for this discount",
            );
          }

          // Atomically increment user usage count
          await queryRunner.manager.increment(
            UserDiscount,
            { userId, discountId },
            "usageCount",
            1,
          );

          // Update last used timestamp
          await queryRunner.manager.update(
            UserDiscount,
            { userId, discountId },
            { lastUsedAt: new Date() },
          );
        }
      }

      // Only commit if we created the transaction
      if (!isExternalTransaction) {
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      // Only rollback if we created the transaction
      if (!isExternalTransaction) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      // Only release if we created the query runner
      if (!isExternalTransaction) {
        await queryRunner.release();
      }
    }
  }

  async getUsageStats(discountId: string): Promise<any> {
    const logs = await this.usageLogRepository.find({
      where: { discountId },
    });

    const uniqueUsers = new Set(logs.map((log) => log.userId)).size;
    const totalUsages = logs.length;
    const totalAmountSaved = logs.reduce(
      (sum, log) => sum + Number(log.discountAmount),
      0,
    );
    const averageDiscountAmount =
      totalUsages > 0 ? totalAmountSaved / totalUsages : 0;

    return {
      discountId,
      totalUsages,
      uniqueUsers,
      totalAmountSaved,
      averageDiscountAmount,
    };
  }

  calculateDiscountAmount(
    discount: Discount,
    originalPrice: number,
    quantity: number = 1,
  ): number {
    switch (discount.type) {
      case DiscountType.PERCENTAGE:
        return (originalPrice * Number(discount.value)) / 100;

      case DiscountType.FIXED_AMOUNT:
        return Number(discount.value);

      case DiscountType.BUY_X_GET_Y:
        if (
          discount.buyQuantity &&
          discount.getQuantity &&
          quantity >= discount.buyQuantity
        ) {
          const freeItems =
            Math.floor(quantity / discount.buyQuantity) * discount.getQuantity;
          return freeItems * originalPrice;
        }
        return 0;

      case DiscountType.FREE_ITEM:
        return 0;

      default:
        return 0;
    }
  }

  async activateDiscount(id: string, userId: string): Promise<Discount> {
    const discount = await this.findOne(id);
    discount.isActive = true;
    discount.status = DiscountStatus.ACTIVE;
    discount.updatedBy = userId;
    return await this.discountRepository.save(discount);
  }

  async deactivateDiscount(id: string, userId: string): Promise<Discount> {
    const discount = await this.findOne(id);
    discount.isActive = false;
    discount.status = DiscountStatus.INACTIVE;
    discount.updatedBy = userId;
    return await this.discountRepository.save(discount);
  }

  async expireDiscount(id: string, userId: string): Promise<Discount> {
    const discount = await this.findOne(id);
    discount.isActive = false;
    discount.status = DiscountStatus.EXPIRED;
    discount.endDate = new Date();
    discount.updatedBy = userId;
    return await this.discountRepository.save(discount);
  }

  private isDiscountActive(discount: Discount): boolean {
    const now = new Date();
    const startDate = new Date(discount.startDate);
    const endDate = discount.endDate ? new Date(discount.endDate) : null;

    const startDateWithBuffer = new Date(startDate.getTime() - 1000);
    const endDateWithBuffer = endDate
      ? new Date(endDate.getTime() + 1000)
      : null;

    return (
      discount.isActive &&
      discount.status === DiscountStatus.ACTIVE &&
      startDateWithBuffer <= now &&
      (!endDateWithBuffer || endDateWithBuffer >= now)
    );
  }

  private validateDiscountDto(dto: Partial<CreateDiscountDto>): void {
    if (dto.type === DiscountType.PERCENTAGE) {
      if (dto.value !== undefined && (dto.value < 0 || dto.value > 100)) {
        throw new BadRequestException(
          "Percentage discount value must be between 0 and 100",
        );
      }
    }

    if (dto.type === DiscountType.FIXED_AMOUNT) {
      if (dto.value !== undefined && dto.value < 0) {
        throw new BadRequestException(
          "Fixed amount discount value must be positive",
        );
      }
    }

    if (dto.type === DiscountType.BUY_X_GET_Y) {
      if (!dto.buyQuantity || !dto.getQuantity) {
        throw new BadRequestException(
          "Buy X Get Y discount requires buyQuantity and getQuantity",
        );
      }
    }

    if (dto.type === DiscountType.FREE_ITEM) {
      if (!dto.freeItemId) {
        throw new BadRequestException("Free item discount requires freeItemId");
      }
    }

    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (end <= start) {
        throw new BadRequestException("End date must be after start date");
      }
    }
  }
}
