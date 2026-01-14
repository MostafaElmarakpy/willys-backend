import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { BundleStatus } from "src/common/enums/BundleStatus";
import { ItemStatus } from "src/common/enums/ItemStatus";
import { Branch } from "src/database/entities/branch.entity";
import { BranchBundleOverride } from "src/database/entities/branch-bundle-override.entity";
import { BranchCategoryOverride } from "src/database/entities/branch-category-override.entity";
import { BranchItemOverride } from "src/database/entities/branch-item-override.entity";
import { Bundle } from "src/database/entities/bundle.entity";
import { Category } from "src/database/entities/category.entity";
import { Item } from "src/database/entities/item.entity";
import { IsNull, type Repository } from "typeorm";

@Injectable()
export class BranchMenuService {
  constructor(
    @InjectRepository(Branch) readonly branchRepo: Repository<Branch>,
    @InjectRepository(Category) readonly categoryRepo: Repository<Category>,
    @InjectRepository(Item) readonly itemRepo: Repository<Item>,
    @InjectRepository(Bundle) readonly bundleRepo: Repository<Bundle>,
    @InjectRepository(BranchCategoryOverride)
    readonly categoryOverrideRepo: Repository<BranchCategoryOverride>,
    @InjectRepository(BranchItemOverride)
    readonly itemOverrideRepo: Repository<BranchItemOverride>,
    @InjectRepository(BranchBundleOverride)
    readonly bundleOverrideRepo: Repository<BranchBundleOverride>,
  ) {}

  /**
   * Set category availability for a specific branch
   */
  async setBranchCategoryAvailability(
    branchId: string,
    categoryId: string,
    isAvailable: boolean,
    userId: string,
    reason?: string,
  ): Promise<BranchCategoryOverride> {
    // Validate branch exists and is active
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, deletedAt: IsNull() },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    // Validate category exists
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, deletedAt: IsNull() },
    });
    if (!category) {
      throw new NotFoundException("Category not found");
    }

    // Validate: Cannot enable if core is inactive
    if (isAvailable === true && !category.isActive) {
      throw new BadRequestException(
        "Cannot enable category at branch level: category is not active in core menu",
      );
    }

    // Upsert override
    let override = await this.categoryOverrideRepo.findOne({
      where: { branchId, categoryId, deletedAt: IsNull() },
    });

    if (override) {
      override.isAvailable = isAvailable;
      override.reason = reason;
      override.updatedById = userId;
    } else {
      override = this.categoryOverrideRepo.create({
        branchId,
        categoryId,
        isAvailable,
        reason,
        createdById: userId,
      });
    }

    return await this.categoryOverrideRepo.save(override);
  }

  /**
   * Set item availability for a specific branch
   */
  async setBranchItemAvailability(
    branchId: string,
    itemId: string,
    isAvailable: boolean,
    userId: string,
    reason?: string,
  ): Promise<BranchItemOverride> {
    // Validate branch exists
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, deletedAt: IsNull() },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    // Validate item exists and load category
    const item = await this.itemRepo.findOne({
      where: { id: itemId, deletedAt: IsNull() },
      relations: ["category"],
    });
    if (!item) {
      throw new NotFoundException("Item not found");
    }

    // CRITICAL VALIDATION: Cannot enable if core is inactive
    if (isAvailable === true) {
      if (item.status !== ItemStatus.ACTIVE) {
        throw new BadRequestException(
          "Cannot enable item at branch level: item is not active in core menu",
        );
      }
      if (!item.category.isActive) {
        throw new BadRequestException(
          "Cannot enable item at branch level: parent category is not active",
        );
      }
    }

    // Upsert override
    let override = await this.itemOverrideRepo.findOne({
      where: { branchId, itemId, deletedAt: IsNull() },
    });

    if (override) {
      override.isAvailable = isAvailable;
      override.reason = reason;
      override.updatedById = userId;
    } else {
      override = this.itemOverrideRepo.create({
        branchId,
        itemId,
        isAvailable,
        reason,
        createdById: userId,
      });
    }

    return await this.itemOverrideRepo.save(override);
  }

  /**
   * Set bundle availability for a specific branch
   */
  async setBranchBundleAvailability(
    branchId: string,
    bundleId: string,
    isAvailable: boolean,
    userId: string,
    reason?: string,
  ): Promise<BranchBundleOverride> {
    // Validate branch exists
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, deletedAt: IsNull() },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    // Validate bundle exists and load category
    const bundle = await this.bundleRepo.findOne({
      where: { id: bundleId, deletedAt: IsNull() },
      relations: ["category"],
    });
    if (!bundle) {
      throw new NotFoundException("Bundle not found");
    }

    // CRITICAL VALIDATION: Cannot enable if core is inactive
    if (isAvailable === true) {
      if (bundle.status !== BundleStatus.ACTIVE) {
        throw new BadRequestException(
          "Cannot enable bundle at branch level: bundle is not active in core menu",
        );
      }
      if (!bundle.category.isActive) {
        throw new BadRequestException(
          "Cannot enable bundle at branch level: parent category is not active",
        );
      }
    }

    // Upsert override
    let override = await this.bundleOverrideRepo.findOne({
      where: { branchId, bundleId, deletedAt: IsNull() },
    });

    if (override) {
      override.isAvailable = isAvailable;
      override.reason = reason;
      override.updatedById = userId;
    } else {
      override = this.bundleOverrideRepo.create({
        branchId,
        bundleId,
        isAvailable,
        reason,
        createdById: userId,
      });
    }

    return await this.bundleOverrideRepo.save(override);
  }

  /**
   * Get all available categories for a branch (customer-facing)
   */
  async getAvailableCategoriesForBranch(branchId: string): Promise<Category[]> {
    const query = this.categoryRepo
      .createQueryBuilder("c")
      .leftJoin(
        "branch_category_overrides",
        "bco",
        "bco.categoryId = c.id AND bco.branchId = :branchId AND bco.deletedAt IS NULL",
        { branchId },
      )
      .where("c.deletedAt IS NULL")
      .andWhere("c.isActive = :isActive", { isActive: true })
      .andWhere("(bco.id IS NULL OR bco.isAvailable = :available)", {
        available: true,
      })
      .orderBy("c.sortOrder", "ASC");

    return await query.getMany();
  }

  /**
   * Get all available items for a branch (customer-facing)
   */
  async getAvailableItemsForBranch(branchId: string): Promise<Item[]> {
    const query = this.itemRepo
      .createQueryBuilder("i")
      .innerJoin("i.category", "c")
      .leftJoin(
        "branch_category_overrides",
        "bco",
        "bco.categoryId = c.id AND bco.branchId = :branchId AND bco.deletedAt IS NULL",
        { branchId },
      )
      .leftJoin(
        "branch_item_overrides",
        "bio",
        "bio.itemId = i.id AND bio.branchId = :branchId AND bio.deletedAt IS NULL",
        { branchId },
      )
      .where("i.deletedAt IS NULL")
      .andWhere("i.status = :status", { status: ItemStatus.ACTIVE })
      .andWhere("c.isActive = :isActive", { isActive: true })
      .andWhere("(bco.id IS NULL OR bco.isAvailable = :available)", {
        available: true,
      })
      .andWhere("(bio.id IS NULL OR bio.isAvailable = :available)", {
        available: true,
      })
      .orderBy("i.sortOrder", "ASC");

    return await query.getMany();
  }

  /**
   * Get all available bundles for a branch (customer-facing)
   */
  async getAvailableBundlesForBranch(branchId: string): Promise<Bundle[]> {
    const query = this.bundleRepo
      .createQueryBuilder("b")
      .innerJoin("b.category", "c")
      .leftJoin(
        "branch_category_overrides",
        "bco",
        "bco.categoryId = c.id AND bco.branchId = :branchId AND bco.deletedAt IS NULL",
        { branchId },
      )
      .leftJoin(
        "branch_bundle_overrides",
        "bbo",
        "bbo.bundleId = b.id AND bbo.branchId = :branchId AND bbo.deletedAt IS NULL",
        { branchId },
      )
      .where("b.deletedAt IS NULL")
      .andWhere("b.status = :status", { status: BundleStatus.ACTIVE })
      .andWhere("c.isActive = :isActive", { isActive: true })
      .andWhere("(bco.id IS NULL OR bco.isAvailable = :available)", {
        available: true,
      })
      .andWhere("(bbo.id IS NULL OR bbo.isAvailable = :available)", {
        available: true,
      });

    return await query.getMany();
  }

  /**
   * Get complete available menu for a branch (categories, items, bundles)
   */
  async getAvailableMenuForBranch(branchId: string): Promise<{
    categories: Category[];
    items: Item[];
    bundles: Bundle[];
  }> {
    // Validate branch exists
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, deletedAt: IsNull() },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    const [categories, items, bundles] = await Promise.all([
      this.getAvailableCategoriesForBranch(branchId),
      this.getAvailableItemsForBranch(branchId),
      this.getAvailableBundlesForBranch(branchId),
    ]);

    return { categories, items, bundles };
  }

  /**
   * Get category overrides for a branch
   */
  async getBranchCategoryOverrides(
    branchId: string,
  ): Promise<BranchCategoryOverride[]> {
    return await this.categoryOverrideRepo.find({
      where: { branchId, deletedAt: IsNull() },
      relations: ["category", "createdBy", "updatedBy"],
    });
  }

  /**
   * Get item overrides for a branch
   */
  async getBranchItemOverrides(
    branchId: string,
  ): Promise<BranchItemOverride[]> {
    return await this.itemOverrideRepo.find({
      where: { branchId, deletedAt: IsNull() },
      relations: ["item", "item.category", "createdBy", "updatedBy"],
    });
  }

  /**
   * Get bundle overrides for a branch
   */
  async getBranchBundleOverrides(
    branchId: string,
  ): Promise<BranchBundleOverride[]> {
    return await this.bundleOverrideRepo.find({
      where: { branchId, deletedAt: IsNull() },
      relations: ["bundle", "bundle.category", "createdBy", "updatedBy"],
    });
  }

  /**
   * Remove category override (revert to core menu)
   */
  async removeCategoryOverride(
    branchId: string,
    categoryId: string,
  ): Promise<void> {
    const override = await this.categoryOverrideRepo.findOne({
      where: { branchId, categoryId, deletedAt: IsNull() },
    });

    if (override) {
      await this.categoryOverrideRepo.softRemove(override);
    }
  }

  /**
   * Remove item override (revert to core menu)
   */
  async removeItemOverride(branchId: string, itemId: string): Promise<void> {
    const override = await this.itemOverrideRepo.findOne({
      where: { branchId, itemId, deletedAt: IsNull() },
    });

    if (override) {
      await this.itemOverrideRepo.softRemove(override);
    }
  }

  /**
   * Remove bundle override (revert to core menu)
   */
  async removeBundleOverride(
    branchId: string,
    bundleId: string,
  ): Promise<void> {
    const override = await this.bundleOverrideRepo.findOne({
      where: { branchId, bundleId, deletedAt: IsNull() },
    });

    if (override) {
      await this.bundleOverrideRepo.softRemove(override);
    }
  }

  /**
   * Check if a specific item is available at a branch
   */
  async isItemAvailable(branchId: string, itemId: string): Promise<boolean> {
    const item = await this.itemRepo.findOne({
      where: { id: itemId, deletedAt: IsNull() },
      relations: ["category"],
    });

    if (!item) {
      return false;
    }

    // Check if item is active in core menu
    if (item.status !== ItemStatus.ACTIVE) {
      return false;
    }

    // Check if parent category is active
    if (!item.category?.isActive) {
      return false;
    }

    // Check category override
    const categoryOverride = await this.categoryOverrideRepo.findOne({
      where: { branchId, categoryId: item.categoryId, deletedAt: IsNull() },
    });
    if (categoryOverride && !categoryOverride.isAvailable) {
      return false;
    }

    // Check item override
    const itemOverride = await this.itemOverrideRepo.findOne({
      where: { branchId, itemId, deletedAt: IsNull() },
    });
    if (itemOverride && !itemOverride.isAvailable) {
      return false;
    }

    return true;
  }

  /**
   * Check if a specific bundle is available at a branch
   */
  async isBundleAvailable(
    branchId: string,
    bundleId: string,
  ): Promise<boolean> {
    const bundle = await this.bundleRepo.findOne({
      where: { id: bundleId, deletedAt: IsNull() },
      relations: ["category"],
    });

    if (!bundle) {
      return false;
    }

    // Check if bundle is active in core menu
    if (bundle.status !== BundleStatus.ACTIVE) {
      return false;
    }

    // Check if parent category is active
    if (!bundle.category?.isActive) {
      return false;
    }

    // Check category override
    const categoryOverride = await this.categoryOverrideRepo.findOne({
      where: { branchId, categoryId: bundle.categoryId, deletedAt: IsNull() },
    });
    if (categoryOverride && !categoryOverride.isAvailable) {
      return false;
    }

    // Check bundle override
    const bundleOverride = await this.bundleOverrideRepo.findOne({
      where: { branchId, bundleId, deletedAt: IsNull() },
    });
    if (bundleOverride && !bundleOverride.isAvailable) {
      return false;
    }

    return true;
  }

  /**
   * Bulk update availability (uses transaction)
   */
  async bulkUpdateAvailability(
    branchId: string,
    updates: {
      categories?: Array<{
        categoryId: string;
        isAvailable: boolean;
        reason?: string;
      }>;
      items?: Array<{ itemId: string; isAvailable: boolean; reason?: string }>;
      bundles?: Array<{
        bundleId: string;
        isAvailable: boolean;
        reason?: string;
      }>;
    },
    userId: string,
  ): Promise<{
    categories: BranchCategoryOverride[];
    items: BranchItemOverride[];
    bundles: BranchBundleOverride[];
  }> {
    const categoryOverrides: BranchCategoryOverride[] = [];
    const itemOverrides: BranchItemOverride[] = [];
    const bundleOverrides: BranchBundleOverride[] = [];

    // Use transaction to ensure all or nothing
    await this.categoryOverrideRepo.manager.transaction(
      async (_transactionalEntityManager) => {
        // Process category updates
        if (updates.categories) {
          for (const update of updates.categories) {
            const override = await this.setBranchCategoryAvailability(
              branchId,
              update.categoryId,
              update.isAvailable,
              userId,
              update.reason,
            );
            categoryOverrides.push(override);
          }
        }

        // Process item updates
        if (updates.items) {
          for (const update of updates.items) {
            const override = await this.setBranchItemAvailability(
              branchId,
              update.itemId,
              update.isAvailable,
              userId,
              update.reason,
            );
            itemOverrides.push(override);
          }
        }

        // Process bundle updates
        if (updates.bundles) {
          for (const update of updates.bundles) {
            const override = await this.setBranchBundleAvailability(
              branchId,
              update.bundleId,
              update.isAvailable,
              userId,
              update.reason,
            );
            bundleOverrides.push(override);
          }
        }
      },
    );

    return {
      categories: categoryOverrides,
      items: itemOverrides,
      bundles: bundleOverrides,
    };
  }
}
