/**
 * Client-side image resizing and compression utilities for FlipLens
 */

export interface ProcessedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

/**
 * Resizes and compresses a file or blob client-side to ensure fast uploads
 * and prevent oversized payloads to the server.
 */
export const processAndCompressImage = (
  file: File | Blob,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate scaled dimensions while preserving aspect ratio
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
        if (!ctx) {
          reject(new Error('Unable to initialize canvas context'));
          return;
        }

        // Fill background with white for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(',')[1] || '';

        resolve({
          dataUrl,
          base64,
          mimeType,
          width,
          height,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load selected image. Please try another file.'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Loads a remote URL and converts it into a compressed data URL for Gemini analysis
 */
export const processRemoteImageUrl = async (
  url: string,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<ProcessedImage> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

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
      if (!ctx) {
        reject(new Error('Unable to initialize canvas'));
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const base64 = dataUrl.split(',')[1] || '';

      resolve({
        dataUrl,
        base64,
        mimeType,
        width,
        height,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load sample image'));
    };

    img.src = url;
  });
};

/**
 * Curated preset sample photos for instant testing without needing camera/file
 */
export const SAMPLE_PHOTOS = [
  {
    id: 'desk-workspace',
    title: 'Study Desk',
    category: 'Desk & Study',
    description: 'Laptop, notebook, coffee cup, pen, glasses',
    url: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'breakfast-kitchen',
    title: 'Breakfast Table',
    category: 'Food & Kitchen',
    description: 'Bread, orange juice, plate, knife, fruit',
    url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'cozy-room',
    title: 'Living Room',
    category: 'Home & Living',
    description: 'Sofa, potted plant, floor lamp, cushion, table',
    url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80',
  },
];
