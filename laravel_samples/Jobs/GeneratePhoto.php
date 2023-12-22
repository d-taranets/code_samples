<?php

namespace App\Jobs\Photos;

use App\Events\PhotoSuccessfullyGenerated;
use App\Image;
use App\Notifications\Marketplace\SuccessOrderShippedNotification;
use App\Order;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class GeneratePhoto implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $order;

    /**
     * Create a new job instance.
     *
     * @param Order $order
     */
    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $pictures = [];
        $total = $this->order->orderPhotos()->count();
        $this->order->orderPhotos()->with('order.customer', 'photo')->notGenerated()->get()->each(function ($order_photo) use (& $pictures, $total) {
            $imageName = Image::resizePhoto($order_photo);
            if (!$imageName) return;
            $pictures[] = $imageName;
            $order_photo->update([
                'downloadable_name' => $imageName,
                'expired_at' => Carbon::now()->addMonth()
            ]);
            event(new PhotoSuccessfullyGenerated($order_photo, $total));
        });
        //TODO:: Email attachment size shouldn't be more than 15M. Check photos size and split emails if need.
        if ($this->order->delivery_status == Order::DELIVERY_STATUS_PENDING) {
            $this->order->delivery_status = Order::DELIVERY_STATUS_DELIVERED;
            $this->order->save();
            try {
                $this->order->customer->notify((new SuccessOrderShippedNotification($this->order, $pictures))->onQueue('emails'));
            }
            catch (\Exception $ex) {
                logger('SuccessOrderShippedNotification');
                logger($ex->getMessage());
            }
        }
    }
}
