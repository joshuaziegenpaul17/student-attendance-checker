import Tesseract from 'tesseract.js';

export interface OCRProgress {
  stage: 'reading' | 'detecting' | 'extracting' | 'validating' | 'calculating' | 'done' | 'error';
  message: string;
  progress: number;
}

/** A word with its bounding box from Tesseract */
export interface OCRWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/** A line with its bounding box from Tesseract */
export interface OCRLine {
  text: string;
  words: OCRWord[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OCRResult {
  text: string;
  confidence: number;
  lines: OCRLine[];
  words: OCRWord[];
  imageWidth: number;
  imageHeight: number;
}

/**
 * Preprocess image: resize to optimal OCR resolution (1500-2500px wide)
 * with enhanced contrast for better text recognition.
 */
async function preprocessImage(file: File | Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);

      // Target width: 2000px for good OCR accuracy
      const targetWidth = Math.min(Math.max(img.width, 1500), 2500);
      const scale = targetWidth / img.width;
      const targetHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;

      // Draw with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Enhance contrast for better OCR
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        // Increase contrast: push darks darker, lights lighter
        const adjusted = gray > 128 ? Math.min(255, gray * 1.15) : gray * 0.85;
        data[i] = data[i + 1] = data[i + 2] = adjusted;
      }
      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob || file);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

/**
 * Perform OCR on an image file using Tesseract.js (client-side).
 * Returns spatial word data (with bounding boxes) for table reconstruction.
 */
export async function performOCR(
  imageFile: File | Blob,
  onProgress?: (progress: OCRProgress) => void,
): Promise<OCRResult> {
  onProgress?.({ stage: 'reading', message: 'Preparing image…', progress: 5 });

  const processedImage = await preprocessImage(imageFile);

  onProgress?.({ stage: 'detecting', message: 'Finding Attendance Details…', progress: 15 });

  try {
    const result = await Tesseract.recognize(processedImage, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          if (pct < 25) {
            onProgress?.({ stage: 'detecting', message: 'Finding Attendance Details…', progress: 15 + pct * 0.4 });
          } else if (pct < 50) {
            onProgress?.({ stage: 'extracting', message: 'Reading subject rows…', progress: 25 + pct * 0.5 });
          } else if (pct < 75) {
            onProgress?.({ stage: 'extracting', message: 'Finding Cumulative Attendance…', progress: 50 + pct * 0.3 });
          } else {
            onProgress?.({ stage: 'validating', message: 'Checking values…', progress: 75 + pct * 0.2 });
          }
        }
      },
    });

    onProgress?.({ stage: 'calculating', message: 'Calculating attendance…', progress: 92 });

    // Extract spatial data
    const text = result.data.text;
    const confidence = result.data.confidence;
    const imgW = (result.data as any).width || (result.data as any).image_width || 0;
    const imgH = (result.data as any).height || (result.data as any).image_height || 0;

    // Build structured lines with bounding boxes
    const lines: OCRLine[] = [];
    const allWords: OCRWord[] = [];

    // Use words from lines
    const dataLines = (result.data as any).lines || [];
    for (const line of dataLines) {
      const lineWords: OCRWord[] = [];
      const words = line.words || [];
      for (const word of words) {
        const w: OCRWord = {
          text: word.text || '',
          confidence: word.confidence || 0,
          bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        };
        lineWords.push(w);
        allWords.push(w);
      }
      lines.push({
        text: line.text || '',
        words: lineWords,
        bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
      });
    }

    // Fallback: if no spatial data, build from text
    if (lines.length === 0) {
      const textLines = text.split('\n').filter(l => l.trim().length > 0);
      let yAccum = 0;
      for (const tl of textLines) {
        const w: OCRWord = { text: tl, confidence: confidence, bbox: { x0: 0, y0: yAccum, x1: 500, y1: yAccum + 20 } };
        allWords.push(w);
        lines.push({ text: tl, words: [w], bbox: w.bbox });
        yAccum += 20;
      }
    }

    await new Promise(r => setTimeout(r, 400));
    onProgress?.({ stage: 'done', message: 'Analysis complete', progress: 100 });

    return { text, confidence, lines, words: allWords, imageWidth: imgW, imageHeight: imgH };
  } catch (error) {
    onProgress?.({ stage: 'error', message: 'Failed to read image', progress: 0 });
    throw error;
  }
}
