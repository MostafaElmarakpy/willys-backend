import { User } from 'src/database/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('access_tokens')
export class AccessToken {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column()
  identifier: string;

  @Column({ name: 'accessToken' })
  accessToken: string;

  @Column({ name: 'refreshToken' })
  refreshToken: string;

  @Column({ name: 'userId' })
  userId: string;

  @Column({ name: 'deviceIP', nullable: true })
  deviceIP?: string;

  @Column({ name: 'deviceName', nullable: true })
  deviceName?: string;

  @Column({ name: 'deviceLocation', nullable: true })
  deviceLocation?: string;

  @Column({ type: 'timestamp' })
  expiration: Date;

  @Column({ type: 'timestamp' })
  refreshExpiration: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.accessTokens)
  user: User;
}
