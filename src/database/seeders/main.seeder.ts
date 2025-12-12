import { DataSource } from 'typeorm';
import { UserSeeder } from './user.seeder';
import { BranchSeeder } from './branch.seeder';
import { MenuSeeder } from './menu.seeder';

export class MainSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    console.log('🌱 Starting database seeding...');
    console.log('='.repeat(50));

    try {
      // Run seeders in sequence (order matters due to dependencies)
      
      console.log('👥 Seeding users...');
      const userSeeder = new UserSeeder(this.dataSource);
      await userSeeder.run();
      console.log('');

      console.log('🏢 Seeding branches...');
      const branchSeeder = new BranchSeeder(this.dataSource);
      await branchSeeder.run();
      console.log('');

      console.log('🍽️  Seeding menu...');
      const menuSeeder = new MenuSeeder(this.dataSource);
      await menuSeeder.run();
      console.log('');

      console.log('='.repeat(50));
      console.log('🎉 All seeders completed successfully!');
      console.log('');
      console.log('📝 Login credentials:');
      console.log('   Admin: admin@admin.com / password');
      console.log('   User:  user@user.com / password');
      console.log('');
      
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }
}