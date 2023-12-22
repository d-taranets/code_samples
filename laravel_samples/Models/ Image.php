<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Facades\Image as InterventionImage;

class Image extends Model
{
    const PORTRAIT_MODE = 'portrait';
    const LANDSCAPE_MODE = 'landscape';

    /**
     * Storing image to storage
     *
     * @param $image (mixed)
     * @param array $options
     * @return string
     */
    public static function generate($image, $options = [])
    {
        $original = InterventionImage::make($image)->encode('jpg');
        $name = Str::random(40) . '.jpg';
        $path = 'avatars/' . $name;
        Storage::put($path, $original->stream()->detach(), 'public');

        return $name;
    }

    public static function cleanUp($image)
    {
        Storage::delete('avatars/' . $image);
    }

    public static function generatePhoto(UploadedFile $image, $options)
    {
        $originalFileName = self::getOriginalFileName($options);
        $original = InterventionImage::make($image);
        $info = self::collectInfo($original, $options);

        $preview = self::isLandscape($original) ?
            self::makeLandscapePreview($original, $options) :
            self::makePortraitPreview($original, $options);

        Storage::putFileAs('photos/originals', $image, $originalFileName);
        Storage::put('photos/previews/' . self::getName($options), $preview->stream()->detach(), 'public');

        return array_merge($info, ['original_name' => $originalFileName]);
    }


    private static function collectInfo($photo, $options)
    {
        $creationDateTime = explode(' ', $photo->exif('DateTimeOriginal'));

        return [
            'file_name' => self::getName($options),
            'original_size' => "{$photo->width()}x{$photo->height()}",
            'file_size' => $photo->filesize(),
            'date' => $creationDateTime[0],
            'time' => $creationDateTime[1],
        ];
    }

    public static function makeLandscapePreview($original, $options)
    {
        $company = $options['company'] ? strtoupper($options['company']) : null;
        $photographer = 'By ' . strtoupper($options['photographer_name']);

        $preview = $original->resize(720, null, function ($constraint) {
            $constraint->aspectRatio();
        });

        $companyWatermark = InterventionImage::canvas(720, $preview->height());

        if ($company) {
            $companyWatermark->text($company, 360, 200, function($font) {
                $font->file(base_path('public/fonts/MicrosoftSansSerif.ttf'));
                $font->size(48);
                $font->color('#f8f8f8');
                $font->align('center');
                $font->valign('middle');
            });
        }

        $companyWatermark->text($photographer, 360, $company ? 240 : 220, function($font) {
            $font->file(base_path('public/fonts/MicrosoftSansSerif.ttf'));
            $font->size(24);
            $font->color('#9f9d9d');
            $font->align('center');
            $font->valign('middle');
        });

        $preview->insert($companyWatermark, 'center');
        $preview->insert(base_path('public/images/watermark.png'), 'bottom-right', 10, 10);

        return $preview;
    }

    public static function makePortraitPreview($original, $options)
    {
        $company = $options['company'] ? strtoupper($options['company']) : null;
        $photographer = 'By ' . strtoupper($options['photographer_name']);

        $preview = $original->resize(null, 720, function ($constraint) {
            $constraint->aspectRatio();
        });

        $companyWatermark = InterventionImage::canvas(720, $preview->height());

        if ($company) {
            $companyWatermark->text($company, 360, 300, function($font) {
                $font->file(base_path('public/fonts/MicrosoftSansSerif.ttf'));
                $font->size(48);
                $font->color('#f8f8f8');
                $font->align('center');
                $font->valign('middle');
            });
        }

        $companyWatermark->text($photographer, 360, $company ? 340 : 320, function($font) {
            $font->file(base_path('public/fonts/MicrosoftSansSerif.ttf'));
            $font->size(24);
            $font->color('#9f9d9d');
            $font->align('center');
            $font->valign('middle');
        });

        $preview->insert($companyWatermark, 'center');
        $preview->insert(base_path('public/images/watermark.png'), 'bottom-right', 10, 10);

        return $preview;
    }

    public static function resizePhoto(OrderPhoto $orderPhoto)
    {
        $name = $orderPhoto->photo->original_name;
        $size = $orderPhoto->size;
        $extension = array_reverse(explode('.', $name))[0];
        $generatedName = Str::random(40) . '.' . $extension;

        if (in_array($size, [Photo::ORIGINAL_SIZE, Photo::COMMERCIAL_SIZE])) {
            Storage::copy('photos/originals/'.$name, 'photos/generated/'.$generatedName);
            return $generatedName;
        }

        $supportedSizes = self::getAllowedSizes($orderPhoto->photo);

        if (!isset($supportedSizes[$size])) {
            logger("Size {$size} not supported");
            return null;
        }

        $imageSize = array_combine(['width', 'height'], explode('x', $supportedSizes[$size]));
        $original = Storage::get('photos/originals/'.$name);
        $cropped = InterventionImage::make($original)
            ->resize($imageSize['width'], $imageSize['height']);

        Storage::put('photos/generated/' . $generatedName, $cropped->stream()->detach());
        return $generatedName;
    }

    public static function getAllowedSizes(Photo $photo)
    {
        $configSizes = config('image.sizes.'. self::getOrientation($photo));
        return array_merge($configSizes, [
            Photo::ORIGINAL_SIZE => $photo->original_size,
            Photo::COMMERCIAL_SIZE => $photo->original_size,
        ]);
    }

    public static function isLandscape($photo)
    {
        return self::getOrientation($photo) === self::LANDSCAPE_MODE;
    }

    public static function isPortrait($photo)
    {
        return self::getOrientation($photo) === self::PORTRAIT_MODE;
    }

    public static function getOrientation($photo)
    {
        if ($photo instanceof Photo) {
            $size = array_combine(['width', 'height'], explode('x', $photo->original_size));
            return $size['width'] > $size['height'] ? self::LANDSCAPE_MODE : self::PORTRAIT_MODE;
        } else {
            return $photo->width() > $photo->height() ? self::LANDSCAPE_MODE : self::PORTRAIT_MODE;
        }
    }

    private static function getOriginalFileName($options)
    {
        return Str::random(40) . $options['filename'];
    }

    public static function getName($options)
    {
        return $options['user_id'] . '_' . $options['meeting_class_id'] . '_' . $options['filename'];
    }
}
