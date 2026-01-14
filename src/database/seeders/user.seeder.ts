import * as bcrypt from "bcrypt";
import { UserProvider } from "src/common/enums/UserProvider";
import { UserRole } from "src/common/enums/UserRole";
import { UserStatus } from "src/common/enums/UserStatus";
import { DataSource } from "typeorm";
import { Role } from "../entities/role.entity";
import { User } from "../entities/user.entity";

export class UserSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);
    const roleRepository = this.dataSource.getRepository(Role);

    // Fetch the SUPER_ADMIN role
    const superAdminRole = await roleRepository.findOne({
      where: { name: "SUPER_ADMIN" },
    });

    if (!superAdminRole) {
      console.error(
        "❌ Super Admin role not found. Please run role seeder first.",
      );
      return;
    }

    // Check if users already exist
    const existingAdmin = await userRepository.findOne({
      where: { email: "admin@admin.com" },
    });
    const existingUser = await userRepository.findOne({
      where: { email: "user@user.com" },
    });

    if (!existingAdmin) {
      const adminUser = new User();
      adminUser.email = "admin@admin.com";
      adminUser.password = await bcrypt.hash("password", 10);
      adminUser.fullName = "System Administrator";
      adminUser.role = UserRole.admin;
      adminUser.status = UserStatus.Offline;
      adminUser.provider = UserProvider.System;
      adminUser.userLocale = "en";
      adminUser.confirmAccount = true;
      adminUser.adminRole = superAdminRole;
      adminUser.adminRoleId = superAdminRole.id;
      adminUser.createdAt = new Date();
      adminUser.updatedAt = new Date();

      await userRepository.save(adminUser);
      console.log("✅ Admin user created: admin@admin.com / password");
      console.log(`   └─ Assigned role: ${superAdminRole.displayName}`);
    } else {
      console.log("⚠️  Admin user already exists");
    }

    if (!existingUser) {
      const regularUser = new User();
      regularUser.email = "user@user.com";
      regularUser.password = await bcrypt.hash("password", 10);
      regularUser.fullName = "Regular User";
      regularUser.role = UserRole.user;
      regularUser.status = UserStatus.Offline;
      regularUser.provider = UserProvider.System;
      regularUser.userLocale = "en";
      regularUser.confirmAccount = true;
      regularUser.createdAt = new Date();
      regularUser.updatedAt = new Date();

      await userRepository.save(regularUser);
      console.log("✅ Regular user created: user@user.com / password");
    } else {
      console.log("⚠️  Regular user already exists");
    }
  }
}
