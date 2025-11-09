import { User } from 'src/database/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  DeleteDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('upload_media')
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
  mimetype: string;

  @Column()
  size: number;

  @Column()
  entityType: string; // Name of the related entity

  @Column()
  entityId: string; // ID of the related entity

  @ManyToOne(() => User, { nullable: true })
  createdBy?: User;

  @ManyToOne(() => User, { nullable: true })
  updatedBy?: User;

  @Column({ nullable: true })
  createdAt: Date;

  @Column({ nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
