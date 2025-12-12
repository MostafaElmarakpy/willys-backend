import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';
import { VariantValue } from './variant-value.entity';
import { VariantType } from 'src/common/enums/VariantType';
import { BilingualStringObject } from 'src/common/dto/bilingual-string.dto';

@Entity('variants')
export class Variant {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuidv4();

  @Column({ type: 'json' })
  name: BilingualStringObject;

  @Column({
    type: 'enum',
    enum: VariantType,
    default: VariantType.DEFAULT,
  })
  @Index()
  type: VariantType;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @Column()
  createdBy: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedBy' })
  updatedByUser?: User;

  @Column({ nullable: true })
  updatedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => VariantValue, (variantValue) => variantValue.variant)
  values: VariantValue[];
}