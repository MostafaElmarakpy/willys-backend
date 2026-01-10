import { User } from 'src/database/entities/user.entity';
import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('access_tokens')
export class AccessToken {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
  @Column()
  identifier: string;

  @Column({ name: 'accessToken' })
  @Index()
  accessToken: string;

  @Column({ name: 'refreshToken' })
  @Index()
  refreshToken: string;

  @Column({ name: 'userId' })
  @Index()
  userId: string;

  @Column({ name: 'deviceIP', nullable: true })
  deviceIP?: string;

  @Column({ name: 'deviceName', nullable: true })
  deviceName?: string;

  @Column({ name: 'deviceLocation', nullable: true })
  deviceLocation?: string;

  @Column({ type: 'timestamp' })
  @Index()
  expiration: Date;

  @Column({ type: 'timestamp' })
  refreshExpiration: Date;

  @ManyToOne(() => User, (user) => user.accessTokens)
  @JoinColumn({ name: 'userId' })
  user: User;
}
