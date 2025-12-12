import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { IngredientCategory } from '../entities/ingredient-category.entity';
import { Ingredient } from '../entities/ingredient.entity';
import { Variant } from '../entities/variant.entity';
import { VariantValue } from '../entities/variant-value.entity';
import { Item } from '../entities/item.entity';
import { UserRole } from 'src/common/enums/UserRole';
import { VariantType } from 'src/common/enums/VariantType';
import { ItemStatus } from 'src/common/enums/ItemStatus';

export class MenuSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);
    const categoryRepository = this.dataSource.getRepository(Category);
    const ingredientCategoryRepository =
      this.dataSource.getRepository(IngredientCategory);
    const ingredientRepository = this.dataSource.getRepository(Ingredient);
    const variantRepository = this.dataSource.getRepository(Variant);
    const variantValueRepository = this.dataSource.getRepository(VariantValue);
    const itemRepository = this.dataSource.getRepository(Item);

    // Get admin user
    const adminUser = await userRepository.findOne({
      where: { role: UserRole.admin },
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Please run user seeder first.');
    }

    // Check if menu data already exists
    const existingCategories = await categoryRepository.count();
    if (existingCategories > 0) {
      console.log('⚠️  Menu data already exists');
      return;
    }

    console.log('🍽️  Creating menu categories...');

    // Create Categories
    const categoriesData = [
      {
        name: { en: 'Appetizers', ar: 'المقبلات' },
        description: {
          en: 'Start your meal with our delicious appetizers',
          ar: 'ابدأ وجبتك بمقبلاتنا الشهية',
        },
      },
      {
        name: { en: 'Main Dishes', ar: 'الأطباق الرئيسية' },
        description: {
          en: 'Our signature main courses',
          ar: 'أطباقنا الرئيسية المميزة',
        },
      },
      {
        name: { en: 'Desserts', ar: 'الحلويات' },
        description: {
          en: 'Sweet treats to end your meal',
          ar: 'حلويات لذيذة لإنهاء وجبتك',
        },
      },
      {
        name: { en: 'Beverages', ar: 'المشروبات' },
        description: {
          en: 'Refreshing drinks and hot beverages',
          ar: 'مشروبات منعشة وساخنة',
        },
      },
      {
        name: { en: 'Salads', ar: 'السلطات' },
        description: {
          en: 'Fresh and healthy salad options',
          ar: 'خيارات سلطات طازجة وصحية',
        },
      },
    ];

    const savedCategories: Category[] = [];
    for (const categoryData of categoriesData) {
      const category = categoryRepository.create({
        ...categoryData,
        isActive: true,
        sortOrder: savedCategories.length,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await categoryRepository.save(category);
      savedCategories.push(saved);
      console.log(`  ✅ Category created: ${categoryData.name.en}`);
    }

    console.log('🥬 Creating ingredient categories...');

    // Create Ingredient Categories
    const ingredientCategoriesData = [
      {
        name: { en: 'Vegetables', ar: 'الخضروات' },
        description: {
          en: 'Fresh vegetables and greens',
          ar: 'خضروات ورقيات طازجة',
        },
      },
      {
        name: { en: 'Proteins', ar: 'البروتينات' },
        description: {
          en: 'Meat, chicken, and seafood',
          ar: 'لحوم ودجاج ومأكولات بحرية',
        },
      },
      {
        name: { en: 'Dairy', ar: 'منتجات الألبان' },
        description: {
          en: 'Cheese, milk, and dairy products',
          ar: 'جبن ولبن ومنتجات ألبان',
        },
      },
      {
        name: { en: 'Spices', ar: 'التوابل' },
        description: { en: 'Herbs and spices', ar: 'أعشاب وتوابل' },
      },
      {
        name: { en: 'Grains', ar: 'الحبوب' },
        description: { en: 'Rice, pasta, and bread', ar: 'أرز ومعكرونة وخبز' },
      },
    ];

    const savedIngredientCategories: IngredientCategory[] = [];
    for (const categoryData of ingredientCategoriesData) {
      const category = ingredientCategoryRepository.create({
        ...categoryData,
        isActive: true,
        sortOrder: savedIngredientCategories.length,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await ingredientCategoryRepository.save(category);
      savedIngredientCategories.push(saved);
      console.log(`  ✅ Ingredient category created: ${categoryData.name.en}`);
    }

    console.log('🧄 Creating ingredients...');

    // Create Ingredients
    const ingredientsData = [
      {
        name: { en: 'Tomatoes', ar: 'طماطم' },
        quantity: 100,
        stockPercentage: 85,
        isOptional: false,
        categoryIndex: 0,
      },
      {
        name: { en: 'Lettuce', ar: 'خس' },
        quantity: 50,
        stockPercentage: 90,
        isOptional: true,
        categoryIndex: 0,
      },
      {
        name: { en: 'Onions', ar: 'بصل' },
        quantity: 80,
        stockPercentage: 75,
        isOptional: true,
        categoryIndex: 0,
      },
      {
        name: { en: 'Chicken Breast', ar: 'صدر دجاج' },
        quantity: 200,
        stockPercentage: 95,
        isOptional: false,
        categoryIndex: 1,
      },
      {
        name: { en: 'Ground Beef', ar: 'لحم مفروم' },
        quantity: 150,
        stockPercentage: 80,
        isOptional: false,
        categoryIndex: 1,
      },
      {
        name: { en: 'Mozzarella Cheese', ar: 'جبن موزاريلا' },
        quantity: 75,
        stockPercentage: 70,
        isOptional: true,
        categoryIndex: 2,
      },
      {
        name: { en: 'Cheddar Cheese', ar: 'جبن شيدر' },
        quantity: 60,
        stockPercentage: 65,
        isOptional: true,
        categoryIndex: 2,
      },
      {
        name: { en: 'Black Pepper', ar: 'فلفل أسود' },
        quantity: 10,
        stockPercentage: 100,
        isOptional: true,
        categoryIndex: 3,
      },
      {
        name: { en: 'Salt', ar: 'ملح' },
        quantity: 20,
        stockPercentage: 100,
        isOptional: false,
        categoryIndex: 3,
      },
      {
        name: { en: 'Rice', ar: 'أرز' },
        quantity: 300,
        stockPercentage: 90,
        isOptional: false,
        categoryIndex: 4,
      },
    ];

    const savedIngredients: Ingredient[] = [];
    for (const ingredientData of ingredientsData) {
      const { categoryIndex, ...data } = ingredientData;
      const ingredient = ingredientRepository.create({
        ...data,
        categoryId: savedIngredientCategories[categoryIndex].id,
        isActive: true,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await ingredientRepository.save(ingredient);
      savedIngredients.push(saved);
      console.log(`  ✅ Ingredient created: ${ingredientData.name.en}`);
    }

    console.log('📏 Creating variants...');

    // Create Variants
    const variantsData = [
      { name: { en: 'Size', ar: 'الحجم' }, type: VariantType.DEFAULT },
      { name: { en: 'Extras', ar: 'إضافات' }, type: VariantType.EXTRA },
      {
        name: { en: 'Spice Level', ar: 'مستوى الحرارة' },
        type: VariantType.DEFAULT,
      },
    ];

    const savedVariants: Variant[] = [];
    for (const variantData of variantsData) {
      const variant = variantRepository.create({
        ...variantData,
        isActive: true,
        sortOrder: savedVariants.length,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await variantRepository.save(variant);
      savedVariants.push(saved);
      console.log(`  ✅ Variant created: ${variantData.name.en}`);
    }

    console.log('🏷️  Creating variant values...');

    // Create Variant Values
    const variantValuesData = [
      // Size variant values
      {
        name: { en: 'Small', ar: 'صغير' },
        price: 0,
        variantIndex: 0,
        sortOrder: 0,
      },
      {
        name: { en: 'Medium', ar: 'متوسط' },
        price: 10,
        variantIndex: 0,
        sortOrder: 1,
      },
      {
        name: { en: 'Large', ar: 'كبير' },
        price: 20,
        variantIndex: 0,
        sortOrder: 2,
      },
      // Extras variant values
      {
        name: { en: 'Extra Cheese', ar: 'جبن إضافي' },
        price: 15,
        variantIndex: 1,
        sortOrder: 0,
      },
      {
        name: { en: 'Extra Meat', ar: 'لحم إضافي' },
        price: 25,
        variantIndex: 1,
        sortOrder: 1,
      },
      {
        name: { en: 'Extra Vegetables', ar: 'خضروات إضافية' },
        price: 10,
        variantIndex: 1,
        sortOrder: 2,
      },
      // Spice level variant values
      {
        name: { en: 'Mild', ar: 'خفيف' },
        price: 0,
        variantIndex: 2,
        sortOrder: 0,
      },
      {
        name: { en: 'Medium', ar: 'متوسط' },
        price: 0,
        variantIndex: 2,
        sortOrder: 1,
      },
      {
        name: { en: 'Hot', ar: 'حار' },
        price: 0,
        variantIndex: 2,
        sortOrder: 2,
      },
    ];

    const savedVariantValues: VariantValue[] = [];
    for (const valueData of variantValuesData) {
      const { variantIndex, ...data } = valueData;
      const variantValue = variantValueRepository.create({
        ...data,
        variantId: savedVariants[variantIndex].id,
        isActive: true,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const saved = await variantValueRepository.save(variantValue);
      savedVariantValues.push(saved);
      console.log(`  ✅ Variant value created: ${valueData.name.en}`);
    }

    console.log('🍽️  Creating menu items...');

    // Create Items
    const itemsData = [
      {
        name: {
          en: 'Grilled Chicken Caesar Salad',
          ar: 'سلطة قيصر بالدجاج المشوي',
        },
        description: {
          en: 'Fresh romaine lettuce with grilled chicken, parmesan cheese, and caesar dressing',
          ar: 'خس روماني طازج مع دجاج مشوي وجبن بارميزان وصوص قيصر',
        },
        price: 45.0,
        status: ItemStatus.ACTIVE,
        categoryIndex: 4, // Salads
        variantIndexes: [0, 1], // Size and Extras
        ingredientIndexes: [0, 1, 3, 5, 8], // Tomatoes, Lettuce, Chicken Breast, Mozzarella Cheese, Salt
      },
      {
        name: { en: 'Beef Burger Deluxe', ar: 'برجر لحم ديلكس' },
        description: {
          en: 'Juicy beef patty with cheese, lettuce, tomato, and our special sauce',
          ar: 'قطعة لحم عصيرة مع الجبن والخس والطماطم وصوصنا الخاص',
        },
        price: 65.0,
        status: ItemStatus.ACTIVE,
        categoryIndex: 1, // Main Dishes
        variantIndexes: [0, 1, 2], // Size, Extras, and Spice Level
        ingredientIndexes: [0, 1, 2, 4, 6, 8], // Tomatoes, Lettuce, Onions, Ground Beef, Cheddar Cheese, Salt
      },
      {
        name: { en: 'Margherita Pizza', ar: 'بيتزا مارغريتا' },
        description: {
          en: 'Classic pizza with tomato sauce, mozzarella cheese, and fresh basil',
          ar: 'بيتزا كلاسيكية بصلصة الطماطم وجبن الموزاريلا والريحان الطازج',
        },
        price: 55.0,
        status: ItemStatus.ACTIVE,
        categoryIndex: 1, // Main Dishes
        variantIndexes: [0, 1], // Size and Extras
        ingredientIndexes: [0, 5, 8], // Tomatoes, Mozzarella Cheese, Salt
      },
      {
        name: { en: 'Chicken Wings', ar: 'أجنحة دجاج' },
        description: {
          en: 'Crispy chicken wings with your choice of sauce',
          ar: 'أجنحة دجاج مقرمشة مع الصوص المفضل لديك',
        },
        price: 35.0,
        status: ItemStatus.ACTIVE,
        categoryIndex: 0, // Appetizers
        variantIndexes: [0, 2], // Size and Spice Level
        ingredientIndexes: [3, 7, 8], // Chicken Breast, Black Pepper, Salt
      },
      {
        name: { en: 'Chocolate Cake', ar: 'كعكة الشوكولاتة' },
        description: {
          en: 'Rich chocolate cake with chocolate ganache',
          ar: 'كعكة شوكولاتة غنية مع غاناش الشوكولاتة',
        },
        price: 25.0,
        status: ItemStatus.ACTIVE,
        categoryIndex: 2, // Desserts
        variantIndexes: [0], // Size only
        ingredientIndexes: [], // No specific ingredients for dessert
      },
      {
        name: { en: 'Fresh Orange Juice', ar: 'عصير برتقال طازج' },
        description: {
          en: 'Freshly squeezed orange juice',
          ar: 'عصير برتقال طازج',
        },
        price: 15.0,
        status: ItemStatus.ACTIVE,
        categoryIndex: 3, // Beverages
        variantIndexes: [0], // Size only
        ingredientIndexes: [], // No specific ingredients for beverage
      },
      {
        name: { en: 'Chicken Biryani', ar: 'برياني دجاج' },
        description: {
          en: 'Aromatic basmati rice with tender chicken and spices',
          ar: 'أرز بسمتي عطري مع دجاج طري وتوابل',
        },
        price: 70.0,
        status: ItemStatus.ACTIVE,
        categoryIndex: 1, // Main Dishes
        variantIndexes: [0, 2], // Size and Spice Level
        ingredientIndexes: [3, 7, 8, 9], // Chicken Breast, Black Pepper, Salt, Rice
      },
    ];

    for (const itemData of itemsData) {
      const { categoryIndex, variantIndexes, ingredientIndexes, ...data } =
        itemData;

      // Create item
      const item = itemRepository.create({
        ...data,
        categoryId: savedCategories[categoryIndex].id,
        sortOrder: 0,
        createdBy: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedItem = await itemRepository.save(item);

      // Add variants to item
      if (variantIndexes && variantIndexes.length > 0) {
        const variants = variantIndexes.map((index) => savedVariants[index]);
        savedItem.variants = variants;
      }

      // Add ingredients to item
      if (ingredientIndexes && ingredientIndexes.length > 0) {
        const ingredients = ingredientIndexes.map(
          (index) => savedIngredients[index],
        );
        savedItem.ingredients = ingredients;
      }

      await itemRepository.save(savedItem);
      console.log(`  ✅ Item created: ${itemData.name.en}`);
    }

    console.log('🎉 Menu seeding completed successfully!');
  }
}
