import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Payment } from 'src/database/entities/payment.entity';
import { PaymentMethod } from 'src/database/entities/payment-method.entity';
import { PaymentTransactionLog } from 'src/database/entities/payment-transaction-log.entity';
import { Refund } from 'src/database/entities/refund.entity';
import { ConfigService } from 'src/config/config.service';
import { PaymentsService } from './payments.service';
import { PaymobService } from './paymob.service';
import { PaymentMethodsService } from './payment-methods.service';
import { RefundsService } from './refunds.service';
import { PaymentsController } from './payments.controller';
import { PaymentsAdminController } from './payments-admin.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentMethod,
      PaymentTransactionLog,
      Refund,
    ]),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [
    PaymentsController,
    PaymentsAdminController,
    PaymentMethodsController,
    WebhooksController,
  ],
  providers: [
    PaymentsService,
    PaymobService,
    PaymentMethodsService,
    RefundsService,
    ConfigService,
  ],
  exports: [PaymentsService, PaymobService, RefundsService],
})
export class PaymentsModule {}
