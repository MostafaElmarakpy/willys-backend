import { BundleStatus } from "../../src/common/enums/BundleStatus";
import { ItemStatus } from "../../src/common/enums/ItemStatus";
import { Bundle } from "../../src/database/entities/bundle.entity";
import { Category } from "../../src/database/entities/category.entity";
import { Ingredient } from "../../src/database/entities/ingredient.entity";
import { IngredientCategory } from "../../src/database/entities/ingredient-category.entity";
import { Item } from "../../src/database/entities/item.entity";
import { User } from "../../src/database/entities/user.entity";
import {
  createBundleWithComponents,
  createCategory,
  createIngredient,
  createIngredientCategory,
  createItem,
  generateVariantPricing,
} from "../factories/menu.factory";

export interface TestMenuStructure {
  categories: {
    mainDishes: Category;
    sides: Category;
    drinks: Category;
  };
  items: {
    burger: Item;
    pizza: Item;
    pasta: Item;
    fries: Item;
    salad: Item;
    cola: Item;
    water: Item;
  };
  bundles: {
    mealDeal: Bundle;
    familyCombo: Bundle;
  };
  ingredients: {
    category: IngredientCategory;
    items: {
      cheese: Ingredient;
      lettuce: Ingredient;
      tomato: Ingredient;
      onion: Ingredient;
      pickles: Ingredient;
    };
  };
}

/**
 * Create a complete predefined menu structure for testing
 */
export async function createTestMenu(
  createdBy: User,
): Promise<TestMenuStructure> {
  // Create ingredient category and ingredients
  const ingredientCategory = await createIngredientCategory(createdBy, {
    en: "Toppings & Extras",
    ar: "الإضافات",
  });

  const cheese = await createIngredient(ingredientCategory, createdBy, {
    name: { en: "Cheese", ar: "جبنة" },
  });

  const lettuce = await createIngredient(ingredientCategory, createdBy, {
    name: { en: "Lettuce", ar: "خس" },
  });

  const tomato = await createIngredient(ingredientCategory, createdBy, {
    name: { en: "Tomato", ar: "طماطم" },
  });

  const onion = await createIngredient(ingredientCategory, createdBy, {
    name: { en: "Onion", ar: "بصل" },
  });

  const pickles = await createIngredient(ingredientCategory, createdBy, {
    name: { en: "Pickles", ar: "مخلل" },
  });

  const allIngredients = [cheese, lettuce, tomato, onion, pickles];

  // Create categories
  const mainDishes = await createCategory(createdBy, {
    name: { en: "Main Dishes", ar: "الأطباق الرئيسية" },
    description: { en: "Our main dishes", ar: "أطباقنا الرئيسية" },
    sortOrder: 0,
  });

  const sides = await createCategory(createdBy, {
    name: { en: "Sides", ar: "الأطباق الجانبية" },
    description: { en: "Side dishes", ar: "الأطباق الجانبية" },
    sortOrder: 1,
  });

  const drinks = await createCategory(createdBy, {
    name: { en: "Drinks", ar: "المشروبات" },
    description: { en: "Beverages", ar: "المشروبات" },
    sortOrder: 2,
  });

  // Create items for main dishes
  const burger = await createItem(mainDishes, createdBy, {
    name: { en: "Classic Burger", ar: "برجر كلاسيكي" },
    description: {
      en: "Juicy beef burger with fresh vegetables",
      ar: "برجر لحم بقري مع خضروات طازجة",
    },
    pricing: 85,
    status: ItemStatus.ACTIVE,
    ingredients: allIngredients,
    extras: [
      { id: cheese.id, quantity: "1" },
      { id: lettuce.id, quantity: "1" },
    ],
  });

  const pizza = await createItem(mainDishes, createdBy, {
    name: { en: "Margherita Pizza", ar: "بيتزا مارجريتا" },
    description: { en: "Classic Italian pizza", ar: "بيتزا إيطالية كلاسيكية" },
    pricing: generateVariantPricing(), // Has size variants
    status: ItemStatus.ACTIVE,
    ingredients: [cheese, tomato],
  });

  const pasta = await createItem(mainDishes, createdBy, {
    name: { en: "Pasta Carbonara", ar: "باستا كاربونارا" },
    description: {
      en: "Creamy pasta with bacon",
      ar: "باستا كريمية مع لحم مقدد",
    },
    pricing: 75,
    status: ItemStatus.ACTIVE,
  });

  // Create sides
  const fries = await createItem(sides, createdBy, {
    name: { en: "French Fries", ar: "بطاطس مقلية" },
    description: { en: "Crispy golden fries", ar: "بطاطس مقرمشة ذهبية" },
    pricing: 25,
    status: ItemStatus.ACTIVE,
  });

  const salad = await createItem(sides, createdBy, {
    name: { en: "Caesar Salad", ar: "سلطة سيزر" },
    description: { en: "Fresh Caesar salad", ar: "سلطة سيزر طازجة" },
    pricing: 35,
    status: ItemStatus.ACTIVE,
    ingredients: [lettuce, cheese],
  });

  // Create drinks
  const cola = await createItem(drinks, createdBy, {
    name: { en: "Coca Cola", ar: "كوكا كولا" },
    description: { en: "Refreshing cola", ar: "كولا منعشة" },
    pricing: 15,
    status: ItemStatus.ACTIVE,
  });

  const water = await createItem(drinks, createdBy, {
    name: { en: "Mineral Water", ar: "مياه معدنية" },
    description: { en: "Fresh mineral water", ar: "مياه معدنية طازجة" },
    pricing: 10,
    status: ItemStatus.ACTIVE,
  });

  // Create bundles
  const mealDeal = await createBundleWithComponents(
    mainDishes,
    [burger, pizza],
    createdBy,
    {
      name: { en: "Meal Deal", ar: "عرض الوجبة" },
      description: {
        en: "Burger/Pizza + Fries + Drink",
        ar: "برجر/بيتزا + بطاطس + مشروب",
      },
      price: 120,
      status: BundleStatus.ACTIVE,
    },
  );

  const familyCombo = await createBundleWithComponents(
    mainDishes,
    [burger, pizza, pasta],
    createdBy,
    {
      name: { en: "Family Combo", ar: "عرض العائلة" },
      description: {
        en: "3 Main dishes + 2 Sides + 4 Drinks",
        ar: "3 أطباق رئيسية + 2 جوانب + 4 مشروبات",
      },
      price: 300,
      status: BundleStatus.ACTIVE,
    },
  );

  return {
    categories: {
      mainDishes,
      sides,
      drinks,
    },
    items: {
      burger,
      pizza,
      pasta,
      fries,
      salad,
      cola,
      water,
    },
    bundles: {
      mealDeal,
      familyCombo,
    },
    ingredients: {
      category: ingredientCategory,
      items: {
        cheese,
        lettuce,
        tomato,
        onion,
        pickles,
      },
    },
  };
}

/**
 * Create a minimal menu for simple tests
 */
export async function createMinimalMenu(createdBy: User): Promise<{
  category: Category;
  item: Item;
}> {
  const category = await createCategory(createdBy, {
    name: { en: "Test Category", ar: "فئة اختبار" },
  });

  const item = await createItem(category, createdBy, {
    name: { en: "Test Item", ar: "عنصر اختبار" },
    pricing: 50,
    status: ItemStatus.ACTIVE,
  });

  return { category, item };
}
