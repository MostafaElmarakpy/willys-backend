import { faker } from "@faker-js/faker";
import { BilingualStringObject } from "../../src/common/dto/bilingual-string.dto";
import { BundleStatus } from "../../src/common/enums/BundleStatus";
import { ItemStatus } from "../../src/common/enums/ItemStatus";
import { QuantityType } from "../../src/common/enums/QuantityType";
import { Bundle } from "../../src/database/entities/bundle.entity";
import { BundleComponent } from "../../src/database/entities/bundle-component.entity";
import { BundleComponentItem } from "../../src/database/entities/bundle-component-item.entity";
import { Category } from "../../src/database/entities/category.entity";
import { Ingredient } from "../../src/database/entities/ingredient.entity";
import { IngredientCategory } from "../../src/database/entities/ingredient-category.entity";
import { Item } from "../../src/database/entities/item.entity";
import { User } from "../../src/database/entities/user.entity";
import { getRepository } from "../setup/test-app";

export interface CreateCategoryOptions {
  name?: BilingualStringObject;
  description?: BilingualStringObject;
  image?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CreateItemOptions {
  name?: BilingualStringObject;
  description?: BilingualStringObject;
  image?: string;
  pricing?: any;
  status?: ItemStatus;
  categoryId?: string;
  category?: Category;
  ingredients?: Ingredient[];
  extras?: Array<{ id: string; quantity: string }>;
  sortOrder?: number;
}

export interface CreateBundleOptions {
  name?: BilingualStringObject;
  description?: BilingualStringObject;
  image?: string;
  price?: number;
  status?: BundleStatus;
  categoryId?: string;
  category?: Category;
}

export interface CreateIngredientOptions {
  name?: BilingualStringObject;
  quantity?: number;
  quantityType?: string;
  isOptional?: boolean;
  stockPercentage?: number;
  isActive?: boolean;
  isDefaultExtra?: boolean;
  categoryId?: string;
  category?: IngredientCategory;
}

/**
 * Generate category data
 */
export function generateCategoryData(
  options: CreateCategoryOptions = {},
): Partial<Category> {
  const categoryName = faker.commerce.department();

  return {
    name: options.name || {
      en: categoryName,
      ar: categoryName,
    },
    description: options.description,
    image: options.image,
    isActive: options.isActive !== undefined ? options.isActive : true,
    sortOrder: options.sortOrder || 0,
  };
}

/**
 * Create a category in the database
 */
export async function createCategory(
  createdBy: User,
  options: CreateCategoryOptions = {},
): Promise<Category> {
  const categoryData = generateCategoryData(options);

  const categoryRepo = getRepository<Category>(Category);
  const category = categoryRepo.create({
    ...categoryData,
    createdBy: createdBy.id,
    createdByUser: createdBy,
  });

  return categoryRepo.save(category);
}

/**
 * Generate simple item pricing (single price)
 */
export function generateSimplePricing(): number {
  return faker.number.float({ min: 20, max: 200, fractionDigits: 2 });
}

/**
 * Generate variant item pricing (e.g., Small/Medium/Large)
 */
export function generateVariantPricing(): any {
  return {
    type: "object",
    variants: [
      {
        name: "Size",
        sortOrder: 0,
        values: [
          { value: "Small", price: "50.00", sortOrder: 0 },
          { value: "Medium", price: "75.00", sortOrder: 1 },
          { value: "Large", price: "100.00", sortOrder: 2 },
        ],
      },
    ],
  };
}

/**
 * Generate item data
 */
export function generateItemData(
  category: Category,
  options: CreateItemOptions = {},
): Partial<Item> {
  const itemName = faker.commerce.productName();

  return {
    name: options.name || {
      en: itemName,
      ar: itemName,
    },
    description: options.description || {
      en: faker.commerce.productDescription(),
      ar: faker.commerce.productDescription(),
    },
    image: options.image,
    pricing: options.pricing || generateSimplePricing(),
    status: options.status || ItemStatus.ACTIVE,
    category: options.category || category,
    categoryId: options.categoryId || category.id,
    extras: options.extras,
    sortOrder: options.sortOrder || 0,
  };
}

/**
 * Create an item in the database
 */
export async function createItem(
  category: Category,
  createdBy: User,
  options: CreateItemOptions = {},
): Promise<Item> {
  const itemData = generateItemData(category, options);

  const itemRepo = getRepository<Item>(Item);
  const item = itemRepo.create({
    ...itemData,
    createdBy: createdBy.id,
    createdByUser: createdBy,
  });

  const savedItem = await itemRepo.save(item);

  // Add ingredients if provided
  if (options.ingredients && options.ingredients.length > 0) {
    savedItem.ingredients = options.ingredients;
    await itemRepo.save(savedItem);
  }

  return savedItem;
}

/**
 * Create an ingredient category
 */
export async function createIngredientCategory(
  createdBy: User,
  name?: BilingualStringObject,
): Promise<IngredientCategory> {
  const categoryName = faker.commerce.department();

  const ingredientCategoryRepo =
    getRepository<IngredientCategory>(IngredientCategory);
  const category = ingredientCategoryRepo.create({
    name: name || {
      en: categoryName,
      ar: categoryName,
    },
    createdBy: createdBy.id,
    createdByUser: createdBy,
  });

  return ingredientCategoryRepo.save(category);
}

/**
 * Generate ingredient data
 */
export function generateIngredientData(
  ingredientCategory: IngredientCategory,
  options: CreateIngredientOptions = {},
): Partial<Ingredient> {
  const ingredientName = faker.commerce.productMaterial();

  return {
    name: options.name || {
      en: ingredientName,
      ar: ingredientName,
    },
    quantity:
      options.quantity ||
      faker.number.float({ min: 1, max: 5, fractionDigits: 2 }),
    quantityType: QuantityType.PIECE,
    isOptional: options.isOptional !== undefined ? options.isOptional : false,
    stockPercentage: options.stockPercentage || 100,
    isActive: options.isActive !== undefined ? options.isActive : true,
    isDefaultExtra:
      options.isDefaultExtra !== undefined ? options.isDefaultExtra : false,
    category: options.category || ingredientCategory,
    categoryId: options.categoryId || ingredientCategory.id,
  };
}

/**
 * Create an ingredient in the database
 */
export async function createIngredient(
  ingredientCategory: IngredientCategory,
  createdBy: User,
  options: CreateIngredientOptions = {},
): Promise<Ingredient> {
  const ingredientData = generateIngredientData(ingredientCategory, options);

  const ingredientRepo = getRepository<Ingredient>(Ingredient);
  const ingredient = ingredientRepo.create({
    ...ingredientData,
    createdBy: createdBy.id,
    createdByUser: createdBy,
  });

  return ingredientRepo.save(ingredient);
}

/**
 * Create multiple ingredients
 */
export async function createIngredients(
  ingredientCategory: IngredientCategory,
  createdBy: User,
  count: number,
  options: CreateIngredientOptions = {},
): Promise<Ingredient[]> {
  const ingredients: Ingredient[] = [];

  for (let i = 0; i < count; i++) {
    const ingredient = await createIngredient(
      ingredientCategory,
      createdBy,
      options,
    );
    ingredients.push(ingredient);
  }

  return ingredients;
}

/**
 * Generate bundle data
 */
export function generateBundleData(
  category: Category,
  options: CreateBundleOptions = {},
): Partial<Bundle> {
  const bundleName = `${faker.commerce.productName()} Combo`;

  return {
    name: options.name || {
      en: bundleName,
      ar: bundleName,
    },
    description: options.description || {
      en: faker.commerce.productDescription(),
      ar: faker.commerce.productDescription(),
    },
    image: options.image,
    price:
      options.price ||
      faker.number.float({ min: 100, max: 300, fractionDigits: 2 }),
    status: options.status || BundleStatus.ACTIVE,
    category: options.category || category,
    categoryId: options.categoryId || category.id,
  };
}

/**
 * Create a bundle in the database
 */
export async function createBundle(
  category: Category,
  createdBy: User,
  options: CreateBundleOptions = {},
): Promise<Bundle> {
  const bundleData = generateBundleData(category, options);

  const bundleRepo = getRepository<Bundle>(Bundle);
  const bundle = bundleRepo.create({
    ...bundleData,
    createdBy: createdBy.id,
    createdByUser: createdBy,
  });

  return bundleRepo.save(bundle);
}

/**
 * Create a bundle with components
 */
export async function createBundleWithComponents(
  category: Category,
  items: Item[],
  createdBy: User,
  options: CreateBundleOptions = {},
): Promise<Bundle> {
  const bundle = await createBundle(category, createdBy, options);

  if (items.length === 0) {
    return bundle;
  }

  const bundleComponentRepo = getRepository<BundleComponent>(BundleComponent);
  const bundleComponentItemRepo =
    getRepository<BundleComponentItem>(BundleComponentItem);

  const defaultItem = items[0];

  // Create a component with the items
  const component = bundleComponentRepo.create({
    bundle,
    bundleId: bundle.id,
    category,
    categoryId: category.id,
    defaultItem,
    defaultItemId: defaultItem.id,
    quantity: 1,
    sortOrder: 0,
  });

  const savedComponent = await bundleComponentRepo.save(component);

  // Add items to the component
  for (const item of items) {
    const componentItem = bundleComponentItemRepo.create({
      component: savedComponent,
      componentId: savedComponent.id,
      item,
      itemId: item.id,
      extraCost: 0,
      sortOrder: 0,
    });
    await bundleComponentItemRepo.save(componentItem);
  }

  return bundle;
}

/**
 * Create a complete menu structure
 */
export async function createMenuStructure(createdBy: User): Promise<{
  categories: Category[];
  items: Item[];
  bundles: Bundle[];
  ingredients: Ingredient[];
}> {
  // Create ingredient category
  const ingredientCategory = await createIngredientCategory(createdBy, {
    en: "Toppings",
    ar: "الإضافات",
  });

  // Create ingredients
  const ingredients = await createIngredients(ingredientCategory, createdBy, 5);

  // Create menu categories
  const categories = [
    await createCategory(createdBy, {
      name: { en: "Main Dishes", ar: "الأطباق الرئيسية" },
      sortOrder: 0,
    }),
    await createCategory(createdBy, {
      name: { en: "Sides", ar: "الأطباق الجانبية" },
      sortOrder: 1,
    }),
    await createCategory(createdBy, {
      name: { en: "Drinks", ar: "المشروبات" },
      sortOrder: 2,
    }),
  ];

  // Create items for each category
  const items: Item[] = [];
  for (const category of categories) {
    for (let i = 0; i < 3; i++) {
      const item = await createItem(category, createdBy, {
        ingredients: ingredients.slice(0, 3),
      });
      items.push(item);
    }
  }

  // Create bundles
  const bundles = [
    await createBundleWithComponents(
      categories[0],
      items.slice(0, 2),
      createdBy,
      {
        name: { en: "Meal Deal", ar: "عرض الوجبة" },
        price: 150,
      },
    ),
  ];

  return { categories, items, bundles, ingredients };
}
