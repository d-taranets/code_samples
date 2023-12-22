<?php
namespace App\Http\Transformers\V1;

use App\CartItem;
use App\Image;
use League\Fractal\TransformerAbstract;
use Carbon\Carbon;

class ProductsTransformer extends TransformerAbstract
{
    public function transform(CartItem $item)
    {
        $options = $this->preparePhotoOptions($item);

        return [
            'id' => $item->photo->id,
            'preview_url' => $item->photo->preview_url,
            'rider' => $item->photo->rider ? $item->photo->rider->name : null,
            'horse' => $item->photo->horse ? $item->photo->horse->name : null,
            'selected_size' => $item->size,
            'sizes' => $options['sizes'],
            'prices' => $options['prices'],
            'photographer_id' => $item->photo->user_id,
        ];
    }

    private function preparePhotoOptions($item)
    {
        $photographerInfo = $item->photo->photographer->photographerInfo;
        $supportedSizes = Image::getAllowedSizes($item->photo);
        $sizes = [];
        $prices = [];

        $priceInfo = [
            'sm'  => $photographerInfo->price_small,
            'md'  => $photographerInfo->price_medium,
            'lg'  => $photographerInfo->price_large,
            'or'  => $photographerInfo->price_original,
            'com' => $photographerInfo->price_commercial
        ];

        foreach ($priceInfo as $size => $cost) {
            if ($cost > 0) {
                $sizes[$size] = $supportedSizes[$size];
                $prices[$size] = $cost;
            }
        }

        return [
            'sizes'  => $sizes,
            'prices' => $prices
        ];
    }
}