import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function POST(request: Request) {
  const { name, date, description, result } = await request.json();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = 12;
  const content = `\nGrievance Toolkit Analysis\n\nName: ${name}\nDate: ${date}\n\nIncident:\n${description}\n\nAI Analysis Result:\n${result}\n`;

  page.drawText(content, {
    x: 50,
    y: page.getHeight() - 50,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
    lineHeight: 16,
    maxWidth: 500,
  });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=grievance-analysis.pdf',
    },
  });
}