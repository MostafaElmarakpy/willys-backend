import { Exclude } from "class-transformer";
import { UserGender } from "src/common/enums/UserGender";
import { UserProvider } from "src/common/enums/UserProvider";
import { UserRole } from "src/common/enums/UserRole";
import { UserStatus } from "src/common/enums/UserStatus";
import { AccessToken } from "src/database/entities/access-token.entity";
import { AdminFcmToken } from "src/database/entities/admin-fcm-token.entity";
import { AdminNotificationPreferences } from "src/database/entities/admin-notification-preferences.entity";
import { ResetPasswordToken } from "src/database/entities/reset-password-token.entity";
import { Role } from "src/database/entities/role.entity";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { v4 as uuidv4 } from "uuid";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string = uuidv4();

  @Column()
  fullName!: string;

  @Column({ unique: true, nullable: true })
  @Index()
  email?: string;

  @Exclude({ toClassOnly: true })
  @Column()
  password!: string;

  @Column({ nullable: true })
  changePasswordTime?: Date;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  phoneNumberCountryCode?: string;

  @Column()
  userLocale: string;

  @Column({ nullable: true })
  countryCode?: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.user,
  })
  @Index()
  role!: UserRole;

  @Column({ default: false })
  confirmAccount!: boolean;

  @Column({
    type: "enum",
    enum: UserStatus,
    default: UserStatus.Offline,
  })
  @Index()
  status!: UserStatus;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  birthday?: Date;

  @Column({ nullable: true })
  joined?: Date;

  @Column({
    type: "enum",
    enum: UserGender,
    nullable: true,
  })
  gender?: UserGender;

  @Column({
    type: "enum",
    enum: UserProvider,
    default: UserProvider.System,
  })
  provider!: UserProvider;

  @Column({ nullable: true })
  verificationCode?: string;

  @Column({ nullable: true })
  verificationCodeExpiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @Column({ nullable: true })
  lastLogin?: Date;

  @Column({ nullable: true })
  lastLogout?: Date;

  @OneToMany(
    () => ResetPasswordToken,
    (token) => token.user,
  )
  resetPasswordTokens: ResetPasswordToken[];

  @OneToMany(
    () => AccessToken,
    (accessToken) => accessToken.user,
  )
  accessTokens: AccessToken[];

  @ManyToOne(
    () => Role,
    (role) => role.users,
    { eager: true, nullable: true },
  )
  @JoinColumn({ name: "adminRoleId" })
  adminRole?: Role;

  @Column({ type: "uuid", nullable: true })
  @Index()
  adminRoleId?: string;

  @OneToMany(
    () => AdminFcmToken,
    (token) => token.user,
  )
  adminFcmTokens?: AdminFcmToken[];

  @OneToOne(
    () => AdminNotificationPreferences,
    (preferences) => preferences.user,
  )
  adminNotificationPreferences?: AdminNotificationPreferences;
}
