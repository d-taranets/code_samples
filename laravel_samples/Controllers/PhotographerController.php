<?php

namespace App\Http\Controllers\V1\Users;

use App\Http\Controllers\BaseController;
use App\Http\Requests\V1\Users\UpdatePhotographerRequest;
use App\Http\Transformers\V1\PhotographersListTransformer;
use App\Http\Transformers\V1\PhotographerTransformer;
use App\Jobs\StoreAvatar;
use App\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Stripe\OAuth as StripeOAuth;
use Stripe\Account as StripeAccount;

class PhotographerController extends BaseController
{
    public function getList() {
        $photographers = User::role(User::PHOTOGRAPHER_ROLE)->with('photographerInfo')->get();
        return $this->response()->collection($photographers, new PhotographersListTransformer());
    }

    public function getContactList() {
        $photographers = User::role(User::PHOTOGRAPHER_ROLE)->with('photographerInfo')->get();
        return $this->response()->collection($photographers, new PhotographersListTransformer());
    }

    public function update(UpdatePhotographerRequest $request)
    {
        $avatar = $request->get('avatar');
        $username = $request->get('username');
        $advancedInfo = $request->only(['country', 'city', 'street', 'zip_code', 'phone', 'company_name',
            'company_reg_no', 'company_vat_id', 'price_small', 'price_medium', 'price_large', 'price_original',
            'price_commercial', 'free_field']);

        $user = Auth::guard('api')->user();
        if (empty($user)) {
            throw new NotFoundHttpException('User not found.');
        }

        if (! $user->update(['name' => $username])) {
            throw new HttpException(500, 'When updating user info, a server error occurred.');
        }

        try {
            $user->photographerInfo()->update($advancedInfo);
        } catch (\Exception $e) {
            throw new HttpException(500, 'When updating advanced info, a server error occurred.');
        }

        if ($avatar) {
            $this->dispatch((new StoreAvatar($user, $avatar, $user->getOriginal('avatar')))->onQueue('default'));
        }

        return $this->response()->item($user->fresh(), new PhotographerTransformer());
    }

    public function stripeConnect(Request $request) {
        $user = Auth::guard('api')->user();
        if (empty($user)) {
            throw new NotFoundHttpException('User not found.');
        }

        $response = StripeOAuth::token([
            'grant_type' => 'authorization_code',
            'code' => $request->get('code'),
        ]);

        if ($response->stripe_user_id) {
            $user->photographerInfo()->update(['stripe_account_id' => $response->stripe_user_id]);
        }

        return $this->response()->item($user->fresh(), new PhotographerTransformer());
    }

    public function stripeDashboard() {
        $user = Auth::guard('api')->user();
        if (empty($user)) {
            throw new NotFoundHttpException('User not found.');
        }

        $response = StripeAccount::createLoginLink($user->photographerInfo->stripe_account_id);

        return $this->response()->array(['url' => $response->url]);
    }
}
