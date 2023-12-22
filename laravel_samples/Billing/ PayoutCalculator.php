<?php
namespace App\Billing;

use App\Order;
use App\User;

class PayoutCalculator extends Calculator
{
    public $user;
    public $order;
    public $commission;

    protected $companyCommission;
    protected $stripeTransactionCommission;
    protected $stripePayoutCommission;

    public function __construct(User $user, Order $order, $amount, $commission)
    {
        $this->user = $user;
        $this->order = $order;
        $this->amount = $amount;
        $this->commission = $commission;

        $this->companyCommission = $this->amount * $this->commission / 100;

        $total = $this->order->orderPhotos->sum('price');
        $stripePercentageFee = round($total * self::STRIPE_TRANSACTION_PERCENTAGE_FEE, 2);
        $stripeFixedFee = round(self::STRIPE_TRANSACTION_FIXED_FEE, 2);
        $this->stripeTransactionCommission = ($stripePercentageFee + $stripeFixedFee) / $total * $this->amount;

        $this->stripePayoutCommission = $this->amount * self::STRIPE_PAYOUT_PERCENTAGE_COMMISSION;
    }

    public function calculate()
    {
        $this->applyCompanyCommission();
        $this->applyStripeTransactionCommission();
        $this->applyStripePayoutCommission();
        return $this;
    }

    private function applyCompanyCommission()
    {
        $this->amount -= $this->companyCommission;
    }

    private function applyStripeTransactionCommission()
    {
        $this->amount -= $this->stripeTransactionCommission;
    }

    private function applyStripePayoutCommission()
    {
        $this->amount -= $this->stripePayoutCommission;
    }

    public function getCompanyCommission()
    {
        return round($this->companyCommission);
    }

    public function getStripeFee()
    {
        return round($this->stripeTransactionCommission + $this->stripePayoutCommission, 2);
    }
}