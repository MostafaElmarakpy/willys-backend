import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from 'src/database/entities/cart.entity';
import { CartItem } from 'src/database/entities/cart-item.entity';
import { Item } from 'src/database/entities/item.entity';
import { Bundle } from 'src/database/entities/bundle.entity';
import { UserAddress } from 'src/database/entities/user-address.entity';
import { Branch } from 'src/database/entities/branch.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { DiscountsModule } from '../discounts/discounts.module';
import { BranchesModule } from '../branches/branches.module';
import { BranchMenuModule } from '../branch-menu/branch-menu.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Item,
      Bundle,
      UserAddress,
      Branch,
    ]),
    DiscountsModule,
    BranchesModule,
    BranchMenuModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
