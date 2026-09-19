import { BrowserMultiFormatReader } from '@zxing/library';

let zxingReader: BrowserMultiFormatReader | null = null;

const getZXingReader = (): BrowserMultiFormatReader => {
  if (!zxingReader) {
    zxingReader = new BrowserMultiFormatReader();
  }
  return zxingReader;
};

/**
 * Detects a barcode or QR code from an image source:
 * 1. Tries the high-performance native BarcodeDetector API if available in the browser/WebView.
 * 2. Falls back to @zxing/library (pure JavaScript / WebAssembly decoder).
 * Returns the raw barcode string, or null if no code is found.
 */
export const detectBarcodeFromSource = async (
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap | string
): Promise<string | null> => {
  try {
    // If source is a data URL or image URL string, load it into an HTMLImageElement first
    if (typeof source === 'string') {
      const img = await loadImageElement(source);
      return await detectBarcodeFromSource(img);
    }

    // 1. Try native BarcodeDetector API
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const supportedFormats = [
          'ean_13',
          'ean_8',
          'upc_a',
          'upc_e',
          'code_128',
          'code_39',
          'qr_code',
          'data_matrix'
        ];
        const detector = new (window as any).BarcodeDetector({ formats: supportedFormats });
        const detected = await detector.detect(source);
        if (detected && detected.length > 0 && detected[0].rawValue) {
          const raw = String(detected[0].rawValue).trim();
          if (raw.length > 0) {
            console.log('[BarcodeDetector] Native detection succeeded:', raw);
            return raw;
          }
        }
      } catch (nativeErr) {
        console.warn('[BarcodeDetector] Native detector error, trying ZXing fallback:', nativeErr);
      }
    }

    // 2. Fallback to @zxing/library
    try {
      const reader = getZXingReader();
      let result;
      if (source instanceof HTMLImageElement) {
        result = await reader.decodeFromImageElement(source);
      } else if (source instanceof HTMLVideoElement) {
        result = await reader.decodeOnceFromVideoDevice(undefined, undefined);
      } else if (source instanceof HTMLCanvasElement) {
        const dataUrl = source.toDataURL('image/jpeg');
        const img = await loadImageElement(dataUrl);
        result = await reader.decodeFromImageElement(img);
      }

      if (result && result.getText()) {
        const text = result.getText().trim();
        console.log('[@zxing/library] Detection succeeded:', text);
        return text;
      }
    } catch (zxingErr) {
      // ZXing throws NotFoundException if no barcode is in frame, which is normal
    }

    return null;
  } catch (err) {
    console.warn('[Barcode Detection Error]', err);
    return null;
  }
};

const loadImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for barcode detection'));
    img.src = src;
  });
};
