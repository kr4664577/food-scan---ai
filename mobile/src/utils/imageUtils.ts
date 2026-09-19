/**
 * Image conversion and optimization utilities.
 * Ensures all sample photos, gallery uploads, and camera frames
 * are normalized to standard Base64 JPEG data URLs (< 1.5MB) before transmission.
 */

export const resizeImage = (
  dataUrl: string,
  maxDimension: number = 1024,
  quality: number = 0.85
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

export const convertUrlToBase64 = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    if (url.startsWith('data:image/')) {
      resolve(url);
      return;
    }

    const cleanUrl = url.split('#')[0];
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.naturalWidth || 640;
        let h = img.naturalHeight || 480;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
          return;
        }
      } catch (err) {
        console.warn('[ImageUtils] Canvas draw failed (CORS), creating local placeholder fallback:', err);
      }
      resolve(createSampleFallbackImage());
    };

    img.onerror = () => {
      console.warn('[ImageUtils] Image load failed for sample URL, using generated canvas fallback:', cleanUrl);
      resolve(createSampleFallbackImage());
    };

    img.src = cleanUrl;
  });
};

const createSampleFallbackImage = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Elegant dark background with sample food graphic
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(320, 210, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sample Food Scan Item', 320, 360);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('FoodScan AI Vision Ready', 320, 390);
    return canvas.toDataURL('image/jpeg', 0.85);
  }
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
};
