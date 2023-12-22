<?php

namespace App\Http\Controllers\V1\Marketplace;

use App\Billing\PaymentCalculator;
use App\Http\Controllers\BaseController;
use App\Http\Transformers\V1\OrdersTransformer;
use App\Image;
use App\Order;
use Dingo\Api\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class OrdersController extends BaseController
{
    public function index()
    {
        $user = Auth::guard('api')->user();

        $orders = $user->orders()->completed()->paginate(Order::PAGINATION_SIZE);
        return $this->response()->paginator($orders, new OrdersTransformer());
    }

    public function getPdf($id)
    {
        $user = Auth::guard('api')->user();
        $order = Order::completed()->with('orderPhotos.photographer.photographerInfo')->findOrFail($id);

        $extra_cond = [];
        if($user->role == 'photographer') {
            $extra_cond[0] = '=';
            $extra_cond[1] = $user->id;
        } else {
            $extra_cond[0] = '>';
            $extra_cond[1] = 0;
        }

        $totalCalculator = (new PaymentCalculator($order->orderPhotos->sum('price')))->calculate();
        $photosByPhotographer = $order->orderPhotos->load('photo.competition', 'photo.horse', 'photo.rider')->where('photographer_id', $extra_cond[0], $extra_cond[1])->groupBy('photographer_id')
            ->map(function ($item) use ($order) {
                $photographer = $item[0]['photographer'];
                $calculator = new PaymentCalculator($item->sum('price'));
                $calculator->calculate();
                $photoChunks = $item->map(function ($orderPhoto) {
                    $photo = $orderPhoto->photo;
                    $sizes = Image::getAllowedSizes($photo);
                    return [
                        'id' => $photo->id,
                        'preview' => 'data:image/jpeg;base64,' . base64_encode(Storage::get("photos/previews/{$photo->preview}")),
                        'competition' => $photo->competition->name,
                        'rider' => isset($photo->rider->name) ? $photo->rider->name : '',
                        'horse' => isset($photo->horse->name) ? $photo->horse->name : '',
                        'size' => isset($sizes[$orderPhoto->size]) ? $sizes[$orderPhoto->size] : $photo->original_size,
                        'price' => $orderPhoto->price
                    ];
                })->chunk(5)->toArray();
                return [
                    'formatted_photographer_id' => $photographer->formattedId(),
                    'formatted_sale_number' => $photographer->formattedSaleNumber($order->id),
                    'photographer_company' => $photographer->photographerInfo->company_name,
                    'photographer_street' => $photographer->photographerInfo->street,
                    'photographer_zip_code' => $photographer->photographerInfo->zip_code,
                    'photographer_city' => $photographer->photographerInfo->city,
                    'photographer_country' => $photographer->photographerInfo->country,
                    'photographer_email' => $photographer->email,
                    'photographer_vat_number' => $photographer->photographerInfo->company_vat_id,
                    'photographer_reg_number' => $photographer->photographerInfo->company_reg_no,
                    'photo_chunks' => $photoChunks,
                    'free_field' => $photographer->photographerInfo->free_field,
                    'last_chunk_index' => array_key_last($photoChunks),
                    'summary' => [
                        'netto' => $calculator->getPriceExlMoms(),
                        'moms' => $calculator->getMoms(),
                        'price' => $calculator->getTotal()
                    ]
                ];
            });

        $pdf = app('dompdf.wrapper');
        $pdf->loadView('pdf.order-receipt', [
            'order' => $order,
            'price' => $totalCalculator->getTotal(),
            'moms' => $totalCalculator->getMoms(),
            'photosByPhotographer' => $photosByPhotographer,
            'logo_image' => 'data:image/png;base64,' . base64_encode(file_get_contents(public_path() . '/images/email_logo.png'))
        ]);

        return Response::makeFromExisting($pdf->stream('receipt.pdf', ['compress' => 1, 'attachment' => 1]));

    }
}