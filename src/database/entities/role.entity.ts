import { Column, Entity, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { PermissionsMap } from 'src/common/types/permission.types';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ unique: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', default: '{}' })
  permissions: PermissionsMap;

  @Column({ default: false })
  isSystemRole: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @OneToMany(() => User, (user) => user.adminRole)
  users: User[];
}
