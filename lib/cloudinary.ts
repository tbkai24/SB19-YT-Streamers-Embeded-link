/**
 * Helper utility for Cloudinary asset handling and image optimization.
 * Automatically injects Cloudinary transformations (f_auto, q_auto, width capping)
 * to minimize image payload sizes for maximum performance and bandwidth savings.
 */

export function getCloudinaryImageUrl(publicIdOrUrl: string, options?: { width?: number; height?: number; crop?: string }) {
  if (!publicIdOrUrl) return '';

  const width = options?.width ? `w_${options.width}` : 'w_1000';
  const height = options?.height ? `h_${options.height}` : '';
  const crop = options?.crop ? `c_${options.crop}` : '';
  const transforms = [width, height, crop, 'f_auto', 'q_auto', 'c_limit'].filter(Boolean).join(',');

  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    // If already a Cloudinary upload URL, inject transformation parameters after /upload/
    if (publicIdOrUrl.includes('res.cloudinary.com') && publicIdOrUrl.includes('/image/upload/')) {
      if (!publicIdOrUrl.includes('/f_auto') && !publicIdOrUrl.includes('/q_auto')) {
        return publicIdOrUrl.replace('/image/upload/', `/image/upload/${transforms}/`);
      }
    }
    return publicIdOrUrl;
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'wkmmjpzb';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicIdOrUrl}`;
}

