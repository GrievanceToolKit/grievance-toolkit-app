import Tesseract from 'tesseract.js';

export const extractTextWithTesseract = async (file: File): Promise<string> => {
  const imageUrl = URL.createObjectURL(file);

  try {
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: m => console.log(m)
    });
    return result.data.text.trim();
  } catch (err) {
    console.error("❌ Image OCR failed:", err);
    return '';
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
};
