const uniqid = require("uniqid");
const config = require('../config');
const Op = require('sequelize').Op;
const moment = require('moment');
const stripe = require("stripe")(config.app.STRIPE_SECRET);
const {
  currencies,
  invoiceStatuses,
  ticketStatuses,
  transactionsTypes,
  refundStatuses,
  eventRegistrationStatuses: erStatuses,
  discountStatuses,
} = require('../utils/constants');
const {logger} = require('../utils/helpers');
const {Invoice, Transaction, User, UserTicket, Event, Discount, EventRegistration} = require('../sequelize');
const {createOrUpdateEventRegistration, cancelRegistration} = require("./UsersController");

const createStripePayment = async (req, res) => {
    const amount = Number(req.body.amount);
    const {userId, eventId, ticketId, timeZone} = req.body;

    if (!req.user || req.user.user !== userId) {
        return res
            .status(403)
            .json({
                error: 'Access denied',
                message: 'You have not enough rights',
            });
    }

    if (isNaN(amount) || amount < 0 || !userId || !eventId) {
        return res.send({status: 400, message: 'Incorrect data'});
    }

    const [user, event, discount] = await Promise.all([
        User.findOne({where: {user: userId}}),
        Event.findOne({where: {event: eventId}}),
        Discount.findOne({
            where: {
                event_id: eventId,
                user_id: userId,
                status: discountStatuses.active
            }
        })
    ]);

    const discountAmount = discount && discount.amount < amount  ? discount.amount * 100 : 0;

    if (!user) {
        return res.send({status: 400, message: 'User not found'});
    }

    const currency = currencies.usd;
    const invoiceNumber = 'INV-'+uniqid();
    const eventStartTime = moment(event.start_date_and_time).tz(timeZone || 'America/New_York');
    const description = `On ${moment(eventStartTime).format('dddd MMM Do, YYYY h:mma z')}`;

    const invoice = await Invoice.create({
        description, currency, amount,
        user_id: userId,
        event_id: eventId,
        ticket_id: ticketId,
        invoice_number: invoiceNumber,
        status: invoiceStatuses.pending
    });

    try {
        const image = event.background_image && event.background_image.indexOf('http') === -1 ? `https:${event.background_image}` : event.background_image;
        const requestData = {
            billing_address_collection: 'auto',
            submit_type: 'pay',
            payment_method_types: ["card"],
            line_items: [
                {
                    name: `Ticket for ${event.name}`,
                    description: description,
                    currency: currency,
                    amount: (amount * 100) - discountAmount,
                    quantity: 1,
                    images: [image],
                },
            ],
            mode: "payment",
            success_url: `${config.app.STRIPE_COMPLETE_URL}/${eventId}?success=1`,
            cancel_url: `${config.app.STRIPE_COMPLETE_URL}/${eventId}?cancel=1&invoiceNumber=${invoiceNumber}`,
        };

        if (user.stripe_customer) {
            requestData.customer = user.stripe_customer;
        } else {
            const customer = await stripe.customers.create({
                email: user.email,
                name: `${user.first_name} ${user.last_name}`
            });
            user.stripe_customer = customer.id;
            await user.save();
            requestData.customer = customer.id;
        }

        const session = await stripe.checkout.sessions.create(requestData);

        invoice.external_payment_id = session.id;
        await invoice.save();

        return res.send({status: 200, payment_id: session.id});

    } catch (error) {
        logger.error(`⚠️  Stripe checkout session failed.`, error);
        const issue = error.toString();
        logger.error('issue', issue);

        invoice.status = invoiceStatuses.failed;
        invoice.reason_rejection = issue;
        await invoice.save();

        return res.send({status: 500, error: issue});
    }
};

const cancelStripePayment = async (req, res) => {
    const {invoiceNumber, userId} = req.body;

    if (!req.user || req.user.user !== userId) {
        return res
            .status(403)
            .json({
                error: 'Access denied',
                message: 'You have not enough rights',
            });
    }

    const invoice = await Invoice.findOne({where: {
        invoice_number: invoiceNumber,
        user_id: userId,
        status: invoiceStatuses.pending
    }});

    if (!invoice) {
        return res.send({status: 400, message: 'Invoice not found'});
    }

    invoice.status = invoiceStatuses.canceled;
    await invoice.save();

    return res.send({status: 200, message: 'Canceled'});
};

const handlerStripeEvent = async (req, res) => {
    let event;
    const sig = req.headers['stripe-signature'];

    try {
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            config.app.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        logger.error(`⚠️  Webhook signature verification failed.`, err);
        return res.sendStatus(400);
    }

    // Extract the object from the event.
    const data = event.data;
    const eventType = event.type;
    const payment = data.object;

    switch (eventType) {
        case "checkout.session.completed": {
            logger.log(`🔔  Payment received:`, payment.id);
            const invoice = await Invoice.findOne({where: {'external_payment_id': payment.id}});
            invoice.status = invoiceStatuses.success;
            await invoice.save();

            // Get Stripe Fee:
            const stripeCheckoutSession =  await stripe.checkout.sessions.retrieve(payment.id);
            const stripePaymentIntent =  await stripe.paymentIntents.retrieve(stripeCheckoutSession.payment_intent);
            const charge = stripePaymentIntent.charges.data[0];
            const balanceTransactionId = charge.balance_transaction;
            const balanceTransaction =  await stripe.balanceTransactions.retrieve(balanceTransactionId);
            const stripeFee = balanceTransaction.fee / 100;

            const [transaction, userTicket] = await Promise.all([
                Transaction.create({
                    user_id: invoice.user_id,
                    invoice_id: invoice.id,
                    payment_intent: payment.payment_intent,
                    currency: invoice.currency,
                    transaction_amount: invoice.amount,
                    fee: stripeFee,
                    type: transactionsTypes.payment
                }),
                UserTicket.findOne({
                    where: {
                        event_id: invoice.event_id,
                        user_id: invoice.user_id,
                        status: ticketStatuses.pending,
                        price: {[Op.gt]: 0}
                    }
                })
            ]);

            await Promise.all([
                userTicket.update({
                    status: ticketStatuses.active,
                    transaction_id: transaction.id
                }),
                Discount.update({
                    status: discountStatuses.used,
                    target_ticket_id: invoice.ticket_id,
                }, {
                    where: {
                        user_id: invoice.user_id,
                        event_id: invoice.event_id,
                        status: discountStatuses.active,
                    }
                }),
                EventRegistration.update({
                    status: erStatuses.attending,
                }, {
                    where: {
                        event_id: invoice.event_id,
                        user_id: invoice.user_id
                    }
                }),
                createOrUpdateEventRegistration({
                    eventId: invoice.event_id,
                    userId: invoice.user_id,
                    ticketId: userTicket.ticket_id,
                    status: erStatuses.attending,
                    refundStatus: refundStatuses.attending
                })
            ]);
            break;
        }
        case "charge.refunded": {
            logger.log(`🔔  Refund received:`, payment.id);
            setTimeout(async () => {
                if (payment.refunds.data.length) {
                    const refundId = payment.refunds.data[0].id;
                    const invoice = await Invoice.findOne({where: {'refund_id': refundId}});

                    if (invoice && invoice.status === invoiceStatuses.pendingRefund) {
                        invoice.status = invoiceStatuses.refunded;
                        await invoice.save();

                        const [transaction, userTicket, eventRegistration] = await Promise.all([
                            Transaction.create({
                                user_id: invoice.user_id,
                                invoice_id: invoice.id,
                                payment_intent: payment.payment_intent,
                                currency: invoice.currency,
                                transaction_amount: invoice.amount,
                                fee: 0,
                                type: transactionsTypes.refund
                            }),
                            UserTicket.findOne({
                                    where: {
                                        event_id: invoice.event_id,
                                        user_id: invoice.user_id,
                                        status: ticketStatuses.canceled,
                                        refund_transaction_id: null,
                                        price: {[Op.gt]: 0}
                                    }
                                }
                            ),
                            EventRegistration.findOne({
                                    where: {
                                        event_id: invoice.event_id,
                                        user_id: invoice.user_id
                                    }
                                }
                            )
                        ]);

                        await Promise.all([
                            userTicket.update({ refund_transaction_id: transaction.id }),
                            eventRegistration.update({ refund_status: refundStatuses.refunded, status: erStatuses.not_attending }),
                            cancelRegistration({registrationId: eventRegistration.event_registration, eventId: invoice.event_id})
                        ])
                    }
                }
            }, 3000);
            break;
        }
        case "charge.dispute.created": {
            logger.log(`🔔  Dispute received:`, payment.id);
            const paymentTransaction = await Transaction.findOne({where: {'payment_intent': payment.payment_intent}});

            if (paymentTransaction) {
                const invoice = await Invoice.findOne({where: {'id': paymentTransaction.invoice_id}});
                const transaction = await Transaction.create({
                    user_id: invoice.user_id,
                    invoice_id: invoice.id,
                    payment_intent: payment.payment_intent,
                    currency: invoice.currency,
                    transaction_amount: payment.amount / 100,
                    fee: 0,
                    type: transactionsTypes.dispute,
                    external_dispute_id: payment.id,
                });

                await UserTicket.update({
                        status: ticketStatuses.canceled,
                        dispute_transaction_id: transaction.id
                    }, {
                        where: {
                            event_id: invoice.event_id,
                            user_id: invoice.user_id,
                            status: ticketStatuses.active,
                            price: {[Op.gt]: 0}
                        }
                    }
                );
            } else {
                return res.sendStatus(400);
            }

            break;
        }
        case "charge.dispute.closed": {
            logger.log(`🔔  Dispute closed:`, payment.id);
            const paymentTransaction = await Transaction.findOne({where: {'payment_intent': payment.payment_intent}});

            if (paymentTransaction) {
                //https://stripe.com/docs/disputes/responding#responding-to-disputes-in-the-dashboard
                if (payment.status !== 'lost') return res.sendStatus(200);

                const invoice = await Invoice.findOne({where: {'id': paymentTransaction.invoice_id}});
                const event = await Event.findOne({where: {event: invoice.event_id}});
                const eventNotStarted = moment(event.start_date_and_time).diff(moment(), 'minutes') > 1;

                const transaction = await  Transaction.create({
                    user_id: invoice.user_id,
                    invoice_id: invoice.id,
                    payment_intent: payment.payment_intent,
                    currency: invoice.currency,
                    transaction_amount: payment.amount / 100,
                    fee: 0,
                    type: transactionsTypes.refund,
                    external_dispute_id: payment.id,
                });

                if (eventNotStarted) {
                    const [userTicket, eventRegistration] = await Promise.all([
                        UserTicket.findOne({
                            where: {
                                event_id: invoice.event_id,
                                user_id: invoice.user_id,
                                status: ticketStatuses.canceled,
                                price: {[Op.gt]: 0}
                            }
                        }),
                        EventRegistration.findOne({
                            where: {
                                event_id: invoice.event_id,
                                user_id: invoice.user_id
                            }
                        })
                    ]);

                    await Promise.all([
                        userTicket.update({
                            dispute_transaction_id: transaction.id
                        }),
                        cancelRegistration({registrationId: eventRegistration.event_registration, eventId: invoice.event_id})
                    ]);
                }
            } else {
                return res.sendStatus(400);
            }

            break;
        }
        default: {
            logger.log('⚠️ Non-processed Stripe Event: ', eventType);
        }
    }

    res.sendStatus(200);
};

/*
     Refund payment:
     Your customer sees the refund as a credit approximately 5-10 business days later, depending upon the bank.
     Once issued, a refund cannot be canceled.
     Source: https://stripe.com/docs/refunds
  */
const refundPayment = async (invoice, paymentIntent, eventStartTime, fee = 0, isCancellationEvent = false, isOrganizerFlow = false) => {
    // Stripe should trigger email to user that refund has been processed
    const unitOfTime = isCancellationEvent ? 'minutes' : 'hours';
    const targetTime = isCancellationEvent ? 1 : 24;
    try {
        if ((moment(eventStartTime).diff(moment(), unitOfTime) > targetTime) || isOrganizerFlow) {
            // If event_start_time >24hr in future -> refund in full
            const refund = await stripe.refunds.create({
                amount: (invoice.amount - fee) * 100,
                payment_intent: paymentIntent,
                reason: 'requested_by_customer',
            });
            invoice.status = invoiceStatuses.pendingRefund;
            invoice.refund_id = refund.id;
            await invoice.save();

            const [eventRegistration, userTicket] = await Promise.all([
                EventRegistration.findOne({
                    where: {
                        event_id: invoice.event_id,
                        user_id: invoice.user_id
                    }
                }),
                UserTicket.findOne({
                    where: {
                        id: invoice.ticket_id,
                    }
                })
            ]);

            await Promise.all([
                eventRegistration.update({
                    refund_status: refundStatuses.pending,
                }),
                userTicket.update({status: ticketStatuses.canceled}),
                createOrUpdateEventRegistration({
                    eventId: invoice.event_id,
                    userId: invoice.user_id,
                    ticketId: userTicket.ticket_id,
                    status: erStatuses.attending,
                    refundStatus: refundStatuses.pending
                })
            ]);

            return true;
        } else {
            await Discount.create({
                user_id: invoice.user_id,
                event_id: invoice.event_id,
                parent_ticket_id: invoice.ticket_id,
                amount: invoice.amount,
                status: discountStatuses.active,
            });

            return true;
        }
    } catch (error) {
        logger.error('Stripe Refund Payment: ', error);
        return false;
    }
};

module.exports = {
    createStripePayment,
    cancelStripePayment,
    handlerStripeEvent,
    refundPayment
};
