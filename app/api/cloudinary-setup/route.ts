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

  // 1x1 transparent PNG placeholder
  const sampleImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const profilesToInit = ['lawless', 'dam', 'gento', 'moonlight', 'freedom'];

  const createdFolders: string[] = [];
  const errors: string[] = [];

  for (const slug of profilesToInit) {
    const folderPath = `SB19/profiles/${slug}`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = 'placeholder';

    // Cloudinary signature parameters must be sorted alphabetically
    const stringToSign = `folder=${folderPath}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    try {
      const formData = new FormData();
      formData.append('file', sampleImage);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('folder', folderPath);
      formData.append('public_id', publicId);
      formData.append('signature', signature);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        createdFolders.push(`${folderPath} (URL: ${data.secure_url})`);
      } else {
        errors.push(`${folderPath}: ${data.error?.message || 'Upload failed'}`);
      }
    } catch (err: any) {
      errors.push(`${folderPath}: ${err.message}`);
    }
  }

  return NextResponse.json({
    status: errors.length === 0 ? 'success' : 'partial',
    createdFolders,
    errors,
  });
}
