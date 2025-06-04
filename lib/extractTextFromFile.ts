import { Buffer } from 'buffer';
import * as Tesseract from 'tesseract.js';

/**
 * Extracts text from a Blob file (PDF, DOCX, or image) for grievance analysis.
 * @param fileBlob The file as a Blob
 * @param fileType The file type: 'pdf', 'docx', or other (for OCR)
 * @returns Extracted text or an error message
 */
export async function extractTextFromFile(fileBlob: Blob, fileType: string): Promise<string> {
  try {
    const buffer = Buffer.from(await fileBlob.arrayBuffer());
    if (fileType === 'pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const parsed = await pdfParse(buffer);
      return parsed.text;
    } else if (fileType === 'docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: new Uint8Array(buffer) });
      return result.value;
    } else {
      // Fallback to OCR for images or unknown types
      const { data: ocrResult } = await Tesseract.recognize(fileBlob, 'eng');
      return ocrResult.text;
    }
  } catch (err) {
    console.error('[extractTextFromFile] Extraction failed:', err);
    return '(Unreadable or corrupt file)';
  }
}
