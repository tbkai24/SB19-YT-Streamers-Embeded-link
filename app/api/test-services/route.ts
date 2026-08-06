import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { getCloudinaryImageUrl } from '@/lib/cloudinary';

export async function GET() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let supabaseStatus = 'disconnected';
  let supabaseError = null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (!error) {
      supabaseStatus = 'connected';
    } else {
      supabaseError = error.message;
    }
  } catch (err: any) {
    supabaseError = err.message;
  }

  const sampleCloudinaryUrl = getCloudinaryImageUrl('SB19/profiles/lawless/cover.jpg', { width: 1200, height: 600 });

  return NextResponse.json({
    status: 'ok',
    supabase: {
      url: supabaseUrl,
      status: supabaseStatus,
      error: supabaseError,
    },
    cloudinary: {
      cloudName: cloudName || 'not configured',
      uploadPreset: uploadPreset || 'not configured',
      sampleCdnUrl: sampleCloudinaryUrl,
    },
  });
}
