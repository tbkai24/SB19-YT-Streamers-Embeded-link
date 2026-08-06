/**
 * Helper utility for Cloudinary asset handling and image optimization.
 */

export function getCloudinaryImageUrl(publicIdOrUrl: string, options?: { width?: number; height?: number; crop?: string }) {
  if (!publicIdOrUrl) return '';

  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    return publicIdOrUrl;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'sb19-streaming';
  const width = options?.width ? `w_${options.width}` : '';
  const height = options?.height ? `h_${options.height}` : '';
  const crop = options?.crop ? `c_${options.crop}` : 'c_fill';
  const transforms = [width, height, crop, 'f_auto', 'q_auto'].filter(Boolean).join(',');

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicIdOrUrl}`;
}
