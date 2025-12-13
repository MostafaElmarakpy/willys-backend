import { MainSeeder } from './main.seeder';
import { connectionSource } from '../typeorm.config';

async function initializeProductionSeeder() {
  console.log('Starting production seeder initialization...');

  // Initialize database connection
  const dataSource = await connectionSource;
  await dataSource
    .initialize()
    .then(() => {
      console.log('Data Source has been initialized for production!');
    })
    .catch((err) => {
      console.error('Error during Data Source initialization', err);
      process.exit(1);
    });

  console.log('Production seeder initialized successfully');
  return { dataSource };
}

async function runSeeders() {
  const { dataSource } = await initializeProductionSeeder();
  const seeder = new MainSeeder(dataSource);
  await seeder.run();
  console.log('Seeding completed successfully');
  await dataSource.destroy();
}

// Run the seeders
(async () => {
  try {
    await runSeeders();
    console.log('seeding process finished successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error running seeders:', error);
    process.exit(1);
  }
})();
