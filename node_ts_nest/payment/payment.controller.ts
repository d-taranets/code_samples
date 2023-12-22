import { Body, Controller, Post } from '@nestjs/common';
import { CustomerDto } from './dto/customer.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentServise: PaymentService) {}

  @Post('create-customer')
  async createCustomer(@Body() customerDto: CustomerDto): Promise<any> {
    try {
      const customer = await this.paymentServise.createCustomer(customerDto);
      return customer;
    } catch (error) {
      return { error };
    }
  }

  @Post('create-subscription')
  async createSubscription(
    @Body() subscriptionDto: SubscriptionDto,
  ): Promise<any> {
    try {
      const subscription = await this.paymentServise.createSubscription(
        subscriptionDto,
      );
      return subscription;
    } catch (error) {
      return { error };
    }
  }
}
