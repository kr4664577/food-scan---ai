/**
 * Decode once, resize before encoding, and upload only the prepared JPEG.
 * Gallery Blobs use object URLs instead of allocating a full-size base64 copy.
 */
import { imagePreparationTiming } from './scanPerformance';
export const imageOptions = (mode: string) =>
  mode === 'PACKAGED_PHOTO' || mode === 'PACKAGED_BARCODE'
    ? { maxDimension: 1600, quality: .9 } // Preserve small label/barcode details.
    : { maxDimension: 1280, quality: .88 };

export function fitImage(width: number, height: number, maxDimension: number) {
  if (![width, height, maxDimension].every(n => Number.isFinite(n) && n > 0)) throw new Error('Invalid image dimensions.');
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function prepareImage(source: Blob | string | HTMLVideoElement, maxDimension = 1280, quality = .88): Promise<string> {
  const started = performance.now();
  let objectUrl: string | undefined;
  let drawable: HTMLImageElement | HTMLVideoElement;
  try {
    if (typeof source !== 'string' && !(source instanceof Blob)) drawable = source;
    else {
      const src = source instanceof Blob ? (objectUrl = URL.createObjectURL(source)) : source;
      drawable = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('This image could not be opened. Please choose a JPEG, PNG, or WebP photo.'));
        img.src = src;
      });
    }
    const decoded = performance.now();
    const w = 'videoWidth' in drawable ? drawable.videoWidth : drawable.naturalWidth;
    const h = 'videoHeight' in drawable ? drawable.videoHeight : drawable.naturalHeight;
    const size = fitImage(w, h, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to prepare your photo. Please try again.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(drawable, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Photo compression failed. Please choose another image.')), 'image/jpeg', quality);
    });
    const prepared = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read the prepared photo.'));
      reader.readAsDataURL(blob);
    });
    imagePreparationTiming(decoded - started, performance.now() - decoded);
    return prepared;
  } finally { if (objectUrl) URL.revokeObjectURL(objectUrl); }
}

// Compatibility helpers used by existing callers. Never replace failures with a fake photo.
export const resizeImage = (dataUrl: string, maxDimension = 1280, quality = .88) => prepareImage(dataUrl, maxDimension, quality);
export const convertUrlToBase64 = (url: string) => prepareImage(url);
