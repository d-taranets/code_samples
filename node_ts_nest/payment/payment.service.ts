import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { CustomerDto } from './dto/customer.dto';
import { SubscriptionDto } from './dto/subscription.dto';

const stripe = new Stripe(
  process.env.STRIPE_API_KEY,
  {
    apiVersion: '2020-08-27',
  },
);

@Injectable()
export class PaymentService {
  async createCustomer(customerPayload: CustomerDto): Promise<any> {
    const customer = await stripe.customers.create({
      email: customerPayload.email,
    });
    return customer;
  }

  async createSubscription(subscriptionDto: SubscriptionDto): Promise<any> {
    // Attach the payment method to the customer
    try {
      await stripe.paymentMethods.attach(subscriptionDto.paymentMethodId, {
        customer: subscriptionDto.customerId,
      });
    } catch (error) {
      console.log(error);
      return;
      // return res.status('402').send({ error: { message: error.message } });
    }

    // Change the default invoice settings on the customer to the new payment method
    await stripe.customers.update(subscriptionDto.customerId, {
      invoice_settings: {
        default_payment_method: subscriptionDto.paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: subscriptionDto.customerId,
      items: [{ price: subscriptionDto.priceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    return subscription;
  }
}
