// Simple text chunker for LMOU and similar docs
export function chunkText(text: string, maxLength = 1000): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    if ((current + "\n" + para).length > maxLength && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
