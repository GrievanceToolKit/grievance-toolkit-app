import mammoth from 'mammoth';

export const extractDocxText = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (err) {
    console.error("❌ DOCX text extraction failed:", err);
    return '';
  }
};
