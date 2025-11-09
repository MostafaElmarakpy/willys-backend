import { Exclude } from 'class-transformer';
import { AccessToken } from 'src/database/entities/access-token.entity';
import { ResetPasswordToken } from 'src/database/entities/reset-password-token.entity';
import { UserGender } from 'src/common/enums/UserGender';
import { UserProvider } from 'src/common/enums/UserProvider';
import { UserRole } from 'src/common/enums/UserRole';
import { UserStatus } from 'src/common/enums/UserStatus';
import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column()
  fullName!: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Exclude({ toClassOnly: true })
  @Column()
  password!: string;

  @Column({ nullable: true })
  changePasswordTime!: Date;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  phoneNumberCountryCode?: string;

  @Column()
  userLocale: string;

  @Column({ nullable: true })
  countryCode?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.user,
  })
  role!: string;

  @Column({ default: false })
  confirmAccount!: boolean;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.Offline,
  })
  status!: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  birthday!: Date;

  @Column({ nullable: true })
  joined!: Date;

  @Column({
    type: 'enum',
    enum: UserGender,
    nullable: true,
  })
  gender!: string;

  @Column({
    type: 'enum',
    enum: UserProvider,
    default: UserProvider.System,
  })
  provider!: string;

  @Column({ nullable: true })
  verificationCode!: string;

  @Column({ nullable: true })
  verificationCodeExpiresAt!: Date;

  @Column({ nullable: true })
  createdAt!: Date;

  @Column({ nullable: true })
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date;

  @Column({ nullable: true })
  lastLogin!: Date;

  @Column({ nullable: true })
  lastLogout!: Date;

  @OneToMany(() => ResetPasswordToken, (token) => token.user)
  resetPasswordTokens: ResetPasswordToken[];

  @OneToMany(() => AccessToken, (accessToken) => accessToken.user)
  accessTokens: AccessToken[];
}
