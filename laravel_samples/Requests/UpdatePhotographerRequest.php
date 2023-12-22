<?php

namespace App\Http\Requests\V1\Users;

use App\User;
use Illuminate\Foundation\Http\FormRequest;
use Tymon\JWTAuth\Facades\JWTAuth;

class UpdatePhotographerRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {
        return [
            'username'          => 'bail|string|max:255|nullable',
            'country'           => 'bail|string|max:255|nullable',
            'city'              => 'bail|string|max:255|nullable',
            'street'            => 'bail|string|max:255|nullable',
            'zip_code'          => 'bail|string|max:255|nullable',
            'phone'             => 'bail|string|max:255|nullable',
            'company_name'      => 'bail|string|max:255|nullable',
            'company_reg_no'    => 'bail|string|max:255|nullable',
            'company_vat_id'    => 'bail|string|max:255|nullable',
            'price_small'       => 'bail|min:0|integer',
            'price_medium'      => 'bail|min:0|integer',
            'price_large'       => 'bail|min:0|integer',
            'price_original'    => 'bail|min:0|integer',
            'price_commercial'  => 'bail|min:0|integer',
        ];
    }

    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        $user = JWTAuth::parseToken()->authenticate();
        return $user->role === User::PHOTOGRAPHER_ROLE;
    }
}
