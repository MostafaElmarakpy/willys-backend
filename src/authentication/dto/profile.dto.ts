import { UserGender } from 'src/common/enums/UserGender';
import { UserProvider } from 'src/common/enums/UserProvider';
import { UserRole } from 'src/common/enums/UserRole';
import { UserStatus } from 'src/common/enums/UserStatus';
import { Role } from 'src/database/entities/role.entity';

export class ProfileDto {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber: string;
  phoneNumberCountryCode: string;
  avatar: string;
  birthday: Date;
  joined: Date;
  gender: UserGender;
  provider: UserProvider;
  userLocale: string;
  confirmAccount: boolean = false;
  lastLogin: Date;
  lastLogout: Date;
  createdAt: Date;
  updatedAt: Date;
  password: string;
  changePasswordTime: Date;
  countryCode: string;
  verificationCode: string;
  adminRole?: Role;
  adminRoleId?: string;
  
  constructor(user: any) {
    this.id = user.id;
    this.fullName = user.fullName;
    this.email = user.email;
    this.role = user.role as UserRole;
    this.status = user.status as UserStatus;
    this.phoneNumber = user?.phoneNumber;
    this.phoneNumberCountryCode = user?.phoneNumberCountryCode;
    this.avatar = user.avatar as string;
    this.birthday = user.birthday;
    this.joined = user.joined;
    this.gender = user.gender as UserGender;
    this.provider = user.provider as UserProvider;
    this.userLocale = user.userLocale;
    this.confirmAccount = user.confirmAccount;
    this.lastLogin = user.lastLogin;
    this.lastLogout = user.lastLogout;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    this.adminRole = user.adminRole;
    this.adminRoleId = user.adminRoleId;
  }
}
