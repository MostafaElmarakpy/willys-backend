import { User } from 'src/database/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('upload_media')
@Index(['entityType', 'entityId'])
export class UploadMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column()
  filename: string;

  @Column()
  path: string;

  @Column()
  url: string;

  @Column()
  @Index()
  mimetype: string;

  @Column()
  size: number;

  @Column()
  entityType: string; // Name of the related entity

  @Column()
  entityId: string; // ID of the related entity

  @Column({ nullable: true })
  createdById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy?: User;

  @Column({ nullable: true })
  updatedById?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedById' })
  updatedBy?: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
