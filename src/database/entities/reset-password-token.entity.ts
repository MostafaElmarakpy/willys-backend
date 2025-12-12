import { User } from 'src/database/entities/user.entity';
import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('reset_password_tokens')
export class ResetPasswordToken {
  @PrimaryColumn()
  email: string;

  @Column({ name: 'reset_token' })
  @Index()
  resetToken: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  @Index()
  expiresAt: Date;

  @ManyToOne(() => User, (user) => user.resetPasswordTokens)
  @JoinColumn({ name: 'email', referencedColumnName: 'email' })
  user: User;
}
