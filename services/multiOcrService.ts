
/**
 * Multi-Provider OCR Service
 * Combines various OCR APIs with Gemini AI for robust text extraction.
 */

export interface OcrResult {
  text: string;
  provider: string;
  duration?: number;
}

const FETCH_TIMEOUT = 10000; // 10 seconds timeout for each API call

const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

/**
 * OCR.space Implementation
 * Documentation: https://ocr.space/ocrapi
 */
const performOcrSpace = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_OCR_SPACE_API_KEY;
  if (!apiKey) throw new Error('OCR.space API key not configured.');

  const formData = new FormData();
  formData.append('apikey', apiKey);
  // OCR.space expects the data URI format for base64Image
  formData.append('base64Image', `data:${mimeType};base64,${base64Data}`);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2'); // Engine 2 is generally better for structured documents

  const response = await fetchWithTimeout('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR.space error: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.IsErroredOnProcessing) {
    throw new Error(`OCR.space processing error: ${data.ErrorMessage}`);
  }

  return data.ParsedResults?.[0]?.ParsedText || '';
};

/**
 * OCRAPI.cloud Implementation
 * Documentation: https://ocrapi.cloud/
 */
const performOcrApiCloud = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_OCRAPI_CLOUD_KEY;
  if (!apiKey) throw new Error('OCRAPI.cloud API key not configured.');

  // Refined based on common Cloud OCR patterns
  const response = await fetchWithTimeout('https://api.ocrapi.cloud/v1/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      image: base64Data,
      mimeType: mimeType,
    }),
  });

  if (!response.ok) {
    throw new Error(`OCRAPI.cloud error: ${response.statusText}`);
  }

  const data = await response.json();
  // Handle different potential response structures
  return data.text || data.parsedText || data.data?.text || '';
};

/**
 * APIOCR.online Implementation
 */
const performApiOcrOnline = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_APIOCR_ONLINE_KEY;
  if (!apiKey) throw new Error('APIOCR.online API key not configured.');

  const response = await fetchWithTimeout('https://api.apiocr.online/v1/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      image: base64Data,
    }),
  });

  if (!response.ok) {
    throw new Error(`APIOCR.online error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.text || data.parsedText || data.data?.text || '';
};

/**
 * FreeOCR.ai Implementation
 */
const performFreeOcrAi = async (base64Data: string, mimeType: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_FREEOCR_AI_KEY;
  if (!apiKey) throw new Error('FreeOCR.ai API key not configured.');

  const response = await fetchWithTimeout('https://api.freeocr.ai/v1/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      image: base64Data,
    }),
  });

  if (!response.ok) {
    throw new Error(`FreeOCR.ai error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.text || data.parsedText || data.data?.text || '';
};

declare const Tesseract: any;

/**
 * Tesseract.js Implementation (Local)
 * Uses the library loaded in index.html
 */
const performTesseractOcr = async (base64Data: string, mimeType: string): Promise<string> => {
  if (typeof Tesseract === 'undefined') {
    throw new Error('Tesseract.js not loaded.');
  }

  try {
    const result = await Tesseract.recognize(
      `data:${mimeType};base64,${base64Data}`,
      'eng',
      { logger: (m: any) => console.log('Tesseract:', m.status, Math.round(m.progress * 100) + '%') }
    );

    return result.data.text || '';
  } catch (error: any) {
    throw new Error(`Tesseract.js error: ${error.message}`);
  }
};

/**
 * Main entry point for OCR operations.
 * Tries configured providers in order of priority.
 */
export const performMultiOcr = async (
  base64Data: string,
  mimeType: string
): Promise<OcrResult> => {
  const startTime = Date.now();
  const errors: string[] = [];
  
  // Only try OCR.space primarily if configured.
  // We remove the loop and Tesseract to prevent hangs.
  const ocrSpaceKey = import.meta.env.VITE_OCR_SPACE_API_KEY;
  
  if (ocrSpaceKey) {
    try {
      console.log('Attempting OCR.space...');
      const text = await performOcrSpace(base64Data, mimeType);
      if (text && text.trim()) {
        return { text, provider: 'OCR.space', duration: Date.now() - startTime };
      }
    } catch (e: any) {
      console.warn('OCR.space failed:', e.message);
      errors.push(`OCR.space: ${e.message}`);
    }
  }

  // Fallback to other providers only if explicitly configured
  const otherProviders = [
    { name: 'OCRAPI.cloud', key: import.meta.env.VITE_OCRAPI_CLOUD_KEY, fn: performOcrApiCloud },
    { name: 'APIOCR.online', key: import.meta.env.VITE_APIOCR_ONLINE_KEY, fn: performApiOcrOnline },
  ].filter(p => !!p.key);

  for (const provider of otherProviders) {
    try {
      console.log(`Attempting ${provider.name}...`);
      const text = await provider.fn(base64Data, mimeType);
      if (text && text.trim()) return { text, provider: provider.name, duration: Date.now() - startTime };
    } catch (e: any) {
      console.warn(`${provider.name} failed:`, e.message);
      errors.push(`${provider.name}: ${e.message}`);
    }
  }

  throw new Error(`All OCR providers failed or are not configured. Errors: ${errors.join('; ')}`);
};
