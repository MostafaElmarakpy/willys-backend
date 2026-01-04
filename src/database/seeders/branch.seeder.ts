import { DataSource } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { Zone } from '../entities/zone.entity';
import { User } from '../entities/user.entity';
import { UserRole } from 'src/common/enums/UserRole';

export class BranchSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async createZonesForExistingBranches(
    branchRepository: any,
    zoneRepository: any,
    adminUser: any,
  ): Promise<void> {
    const branches = await branchRepository.find();

    const zonesData = [
      {
        branchName: 'Downtown Cairo Branch',
        zones: [
          {
            name: { en: 'Downtown Zone', ar: 'منطقة وسط البلد' },
            polygon:
              'POLYGON((31.2300 30.0400, 31.2400 30.0400, 31.2400 30.0500, 31.2300 30.0500, 31.2300 30.0400))',
            isActive: true,
            priority: 1,
            deliveryFee: 15.0,
          },
        ],
      },
      {
        branchName: 'Nasr City Branch',
        zones: [
          {
            name: { en: 'Nasr City Zone', ar: 'منطقة مدينة نصر' },
            polygon:
              'POLYGON((31.3150 30.0550, 31.3300 30.0550, 31.3300 30.0700, 31.3150 30.0700, 31.3150 30.0550))',
            isActive: true,
            priority: 1,
            deliveryFee: 20.0,
          },
        ],
      },
      {
        branchName: 'Zamalek Branch',
        zones: [
          {
            name: { en: 'Zamalek Zone', ar: 'منطقة الزمالك' },
            polygon:
              'POLYGON((31.2100 30.0550, 31.2250 30.0550, 31.2250 30.0680, 31.2100 30.0680, 31.2100 30.0550))',
            isActive: true,
            priority: 1,
            deliveryFee: 18.0,
          },
        ],
      },
    ];

    for (const zoneData of zonesData) {
      const branch = branches.find((b) => b.name.en === zoneData.branchName);
      if (branch) {
        // Check if this branch already has zones
        const existingZones = await this.dataSource.query(
          `
          SELECT COUNT(*) as count FROM zones WHERE "branchId" = $1
        `,
          [branch.id],
        );

        if (parseInt(existingZones[0].count) === 0) {
          for (const zone of zoneData.zones) {
            // Use raw query to insert geometry properly
            await this.dataSource.query(
              `
              INSERT INTO zones (id, name, "branchId", polygon, "isActive", priority, "deliveryFee", "createdById", "createdAt", "updatedAt")
              VALUES (
                uuid_generate_v4(),
                $1,
                $2,
                ST_GeomFromText($3, 4326),
                $4,
                $5,
                $6,
                $7,
                NOW(),
                NOW()
              )
            `,
              [
                JSON.stringify(zone.name),
                branch.id,
                zone.polygon,
                zone.isActive,
                zone.priority,
                zone.deliveryFee,
                adminUser.id,
              ],
            );
            console.log(
              `  ✅ Zone created for ${branch.name.en}: ${zone.name.en}`,
            );
          }
        } else {
          console.log(`  ⚠️  ${branch.name.en} already has zones`);
        }
      }
    }
  }

  async run(): Promise<void> {
    const branchRepository = this.dataSource.getRepository(Branch);
    const zoneRepository = this.dataSource.getRepository(Zone);
    const userRepository = this.dataSource.getRepository(User);

    // Get admin user for created by
    const adminUser = await userRepository.findOne({
      where: { role: UserRole.admin },
    });

    if (!adminUser) {
      throw new Error('Admin user not found. Please run user seeder first.');
    }

    // Check if branches already exist
    const existingBranches = await branchRepository.count();
    if (existingBranches > 0) {
      console.log('⚠️  Branches already exist');

      // Check if zones exist, create them if missing
      const existingZones = await zoneRepository.count();
      if (existingZones === 0) {
        console.log('🗺️  Creating missing zones for existing branches...');
        await this.createZonesForExistingBranches(
          branchRepository,
          zoneRepository,
          adminUser,
        );
      } else {
        console.log('⚠️  Zones already exist');
      }
      return;
    }

    // Sample branch data for Cairo, Egypt
    const branchesData = [
      {
        name: { en: 'Downtown Cairo Branch', ar: 'فرع وسط القاهرة' },
        address: '15 Tahrir Square, Downtown, Cairo, Egypt',
        latitude: 30.0444,
        longitude: 31.2357,
        phone: '+201234567890',
        email: 'downtown@willys.com',
        isActive: true,
        isOpen: true,
        openingHours: '08:00',
        closingHours: '23:00',
        estimatedDeliveryTime: 30,
        zones: [
          {
            name: { en: 'Downtown Zone', ar: 'منطقة وسط البلد' },
            // Simple polygon around downtown Cairo
            polygon:
              'POLYGON((31.2300 30.0400, 31.2400 30.0400, 31.2400 30.0500, 31.2300 30.0500, 31.2300 30.0400))',
            isActive: true,
            priority: 1,
            deliveryFee: 15.0,
          },
        ],
      },
      {
        name: { en: 'Nasr City Branch', ar: 'فرع مدينة نصر' },
        address: 'Abbas El Akkad Street, Nasr City, Cairo, Egypt',
        latitude: 30.0626,
        longitude: 31.3219,
        phone: '+201234567891',
        email: 'nasrcity@willys.com',
        isActive: true,
        isOpen: true,
        openingHours: '09:00',
        closingHours: '22:00',
        estimatedDeliveryTime: 25,
        zones: [
          {
            name: { en: 'Nasr City Zone', ar: 'منطقة مدينة نصر' },
            polygon:
              'POLYGON((31.3150 30.0550, 31.3300 30.0550, 31.3300 30.0700, 31.3150 30.0700, 31.3150 30.0550))',
            isActive: true,
            priority: 1,
            deliveryFee: 20.0,
          },
        ],
      },
      {
        name: { en: 'Zamalek Branch', ar: 'فرع الزمالك' },
        address: '26th July Street, Zamalek, Cairo, Egypt',
        latitude: 30.0616,
        longitude: 31.2194,
        phone: '+201234567892',
        email: 'zamalek@willys.com',
        isActive: true,
        isOpen: true,
        openingHours: '10:00',
        closingHours: '24:00',
        estimatedDeliveryTime: 20,
        zones: [
          {
            name: { en: 'Zamalek Zone', ar: 'منطقة الزمالك' },
            polygon:
              'POLYGON((31.2100 30.0550, 31.2250 30.0550, 31.2250 30.0680, 31.2100 30.0680, 31.2100 30.0550))',
            isActive: true,
            priority: 1,
            deliveryFee: 18.0,
          },
        ],
      },
    ];

    for (const branchData of branchesData) {
      const { zones, ...branchInfo } = branchData;

      // Create branch
      const branch = branchRepository.create({
        ...branchInfo,
        createdById: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedBranch = await branchRepository.save(branch);
      console.log(`✅ Branch created: ${branchData.name.en}`);

      // Create zones for this branch using raw query (same as createZonesForExistingBranches)
      for (const zoneData of zones) {
        await this.dataSource.query(
          `
          INSERT INTO zones (id, name, "branchId", polygon, "isActive", priority, "deliveryFee", "createdById", "createdAt", "updatedAt")
          VALUES (
            uuid_generate_v4(),
            $1,
            $2,
            ST_GeomFromText($3, 4326),
            $4,
            $5,
            $6,
            $7,
            NOW(),
            NOW()
          )
        `,
          [
            JSON.stringify(zoneData.name),
            savedBranch.id,
            zoneData.polygon,
            zoneData.isActive,
            zoneData.priority,
            zoneData.deliveryFee,
            adminUser.id,
          ],
        );
        console.log(`  ✅ Zone created: ${zoneData.name.en}`);
      }
    }
  }
}
