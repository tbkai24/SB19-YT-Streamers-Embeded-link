import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Cloudinary credentials missing in .env (CLOUD_NAME, API_KEY, or API_SECRET)' },
      { status: 400 }
    );
  }

  const samplePublicIds = [
    'SB19/profiles/lawless/placeholder',
    'SB19/profiles/dam/placeholder',
    'SB19/profiles/gento/placeholder',
    'SB19/profiles/moonlight/placeholder',
    'SB19/profiles/freedom/placeholder',
  ];

  const deletedAssets: string[] = [];
  const errors: string[] = [];

  for (const publicId of samplePublicIds) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    try {
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        deletedAssets.push(`${publicId}: ${data.result}`);
      } else {
        errors.push(`${publicId}: ${data.error?.message || 'Delete failed'}`);
      }
    } catch (err: any) {
      errors.push(`${publicId}: ${err.message}`);
    }
  }

  return NextResponse.json({
    status: 'success',
    deletedAssets,
    errors,
  });
}
