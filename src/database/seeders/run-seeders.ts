import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { MainSeeder } from './main.seeder';

// Import all entities
import { User } from '../entities/user.entity';
import { AccessToken } from '../entities/access-token.entity';
import { ResetPasswordToken } from '../entities/reset-password-token.entity';
import { Branch } from '../entities/branch.entity';
import { Zone } from '../entities/zone.entity';
import { Category } from '../entities/category.entity';
import { Item } from '../entities/item.entity';
import { Variant } from '../entities/variant.entity';
import { VariantValue } from '../entities/variant-value.entity';
import { Ingredient } from '../entities/ingredient.entity';
import { IngredientCategory } from '../entities/ingredient-category.entity';

async function runSeeders() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'db',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'willysDB',
    synchronize: false,
    logging: false,
    entities: [
      User,
      AccessToken,
      ResetPasswordToken,
      Branch,
      Zone,
      Category,
      Item,
      Variant,
      VariantValue,
      Ingredient,
      IngredientCategory,
    ],
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected successfully');
    console.log('');

    const mainSeeder = new MainSeeder(dataSource);
    await mainSeeder.run();

  } catch (error) {
    console.error('❌ Error running seeders:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the seeders
runSeeders();