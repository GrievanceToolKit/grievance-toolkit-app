import * as pdf from 'pdf-parse';

export const extractPdfText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const data = await pdf(buffer);
    return data.text.trim();
  } catch (err) {
    console.error("❌ PDF text extraction failed:", err);
    return '';
  }
};
