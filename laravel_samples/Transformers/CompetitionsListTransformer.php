<?php

namespace App\Http\Transformers\V1;

use App\Competition;
use League\Fractal\TransformerAbstract;
use Tymon\JWTAuth\Facades\JWTAuth;

class CompetitionsListTransformer extends TransformerAbstract
{
    public function transform(Competition $competition)
    {
        $userId = JWTAuth::parseToken()->authenticate()->id;
        $disciplines = $competition->disciplines->pluck('name')->implode(' | ');
        return [
            'id' => $competition->id,
            'external_id' => $competition->external_id,
            'name' => $competition->name,
            'start_date' => $competition->start_date->toDateString(),
            'end_date' => $competition->end_date->toDateString(),
            'disciplines' => $disciplines,
            'country' => $competition->country,
            'state' => [
                'is_booked' => !!$competition->photographers->filter(function ($photographer) use ($userId) {
                    return $photographer->id === $userId;
                })->first(),
                'photographers' => $competition->photographers->filter(function ($photographer) use ($userId) {
                    return $photographer->id !== $userId;
                })->pluck('name')
            ]
        ];
    }
}