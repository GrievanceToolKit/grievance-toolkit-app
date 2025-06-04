import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export interface GrievancePDFInput {
  title: string;
  summary: string;
  description: string;
  case_number: string;
  violations: {
    article_number: string;
    article_title: string;
    violation_reason: string;
  }[];
  content: string; // AI-generated memo body (markdown allowed)
  step: 'step1' | 'step2' | 'step3';
  step_label: string;
  date: string; // ISO string
}

function drawSectionHeader(
  page: any,
  text: string,
  x: number,
  y: number,
  font: any,
  color: any,
  fontSize = 14
) {
  page.drawText(text, { x, y, size: fontSize, font, color });
  page.drawLine({ start: { x, y: y - 2 }, end: { x: x + 400, y: y - 2 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
}

function parseMarkdownToLines(text: string, font: any, fontSize: number, maxWidth: number) {
  // Simple markdown: #, ##, **bold**, `code`, > quote
  const lines: { text: string; style?: 'header'|'bold'|'quote'|'code'|'normal' }[] = [];
  text.split(/\r?\n/).forEach(line => {
    if (/^#/.test(line)) lines.push({ text: line.replace(/^#+\s*/, ''), style: 'header' });
    else if (/^>/.test(line)) lines.push({ text: line.replace(/^>\s*/, ''), style: 'quote' });
    else if (/^`.*`$/.test(line)) lines.push({ text: line.replace(/`/g, ''), style: 'code' });
    else if (/^\*\*(.*)\*\*$/.test(line)) lines.push({ text: line.replace(/\*\*/g, ''), style: 'bold' });
    else lines.push({ text: line, style: 'normal' });
  });
  return lines;
}

export async function generateGrievancePDF(input: GrievancePDFInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 612, pageHeight = 792;
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  let y = pageHeight - margin;
  const lineHeight = 18;
  const maxWidth = pageWidth - margin * 2;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  // HEADER
  try {
    const logoUrl = '/logo_transparent.png';
    const logoRes = await fetch(logoUrl);
    const logoArrayBuffer = await logoRes.arrayBuffer();
    const logoImage = await pdfDoc.embedPng(logoArrayBuffer);
    page.drawImage(logoImage, { x: margin, y: y - 40, width: 60, height: 60 });
  } catch {}
  page.drawText('GrievanceToolkit Arbitration Memo', { x: margin + 70, y: y - 10, size: 14, font: fontBold, color: rgb(0.1,0.2,0.5) });
  page.drawText(input.step_label, { x: margin, y: y - 40, size: 18, font: fontBold, color: rgb(0,0,0) });
  y -= 70;
  page.drawText(`Case #: ${input.case_number || ''}`, { x: margin, y, size: 12, font, color: rgb(0.2,0.2,0.2) });
  page.drawText(`Filed: ${new Date(input.date).toLocaleDateString()}`, { x: margin + 200, y, size: 12, font, color: rgb(0.2,0.2,0.2) });
  y -= lineHeight;
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.7,0.7,0.7) });
  y -= 10;

  // SECTION: Grievance Summary
  drawSectionHeader(page, 'Grievance Summary', margin, y, fontBold, rgb(0,0,0));
  y -= lineHeight;
  page.drawText(input.summary, { x: margin + 10, y, size: 12, font, color: rgb(0.1,0.1,0.1) });
  y -= lineHeight + 4;

  // SECTION: Detailed Description
  drawSectionHeader(page, 'Detailed Description', margin, y, fontBold, rgb(0,0,0));
  y -= lineHeight;
  page.drawText(input.description, { x: margin + 10, y, size: 12, font, color: rgb(0.1,0.1,0.1) });
  y -= lineHeight + 4;

  // SECTION: Full Memo Content
  drawSectionHeader(page, 'Full Memo Content', margin, y, fontBold, rgb(0,0,0));
  y -= lineHeight;
  const memoLines = parseMarkdownToLines(input.content || '', font, 12, maxWidth);
  memoLines.forEach(({ text, style }) => {
    let drawFont = font, drawColor = rgb(0.1,0.1,0.1), drawSize = 12, box = false;
    if (style === 'header') { drawFont = fontBold; drawSize = 13; }
    if (style === 'bold') { drawFont = fontBold; }
    if (style === 'quote') { drawColor = rgb(0.3,0.3,0.3); box = true; }
    if (style === 'code') { drawFont = font; drawColor = rgb(0.2,0.2,0.2); box = true; }
    if (box) {
      page.drawRectangle({ x: margin + 8, y: y - 2, width: maxWidth - 16, height: lineHeight, color: rgb(0.95,0.95,0.95), borderColor: rgb(0.8,0.8,0.8), borderWidth: 0.5 });
    }
    page.drawText(text, { x: margin + 12, y, size: drawSize, font: drawFont, color: drawColor });
    y -= lineHeight;
  });
  y -= 4;

  // SECTION: Contract Violations
  if (input.violations && input.violations.length > 0) {
    drawSectionHeader(page, 'Contract Violations', margin, y, fontBold, rgb(0,0,0));
    y -= lineHeight;
    // Table header
    page.drawRectangle({ x: margin + 8, y: y + 2, width: maxWidth - 16, height: lineHeight, color: rgb(0.93,0.93,0.97) });
    page.drawText('Article', { x: margin + 12, y, size: 12, font: fontBold });
    page.drawText('Title', { x: margin + 90, y, size: 12, font: fontBold });
    page.drawText('Reason', { x: margin + 220, y, size: 12, font: fontBold });
    y -= lineHeight;
    input.violations.forEach(v => {
      page.drawText(v.article_number, { x: margin + 12, y, size: 12, font });
      page.drawText(v.article_title, { x: margin + 90, y, size: 12, font });
      page.drawText(v.violation_reason, { x: margin + 220, y, size: 12, font });
      y -= lineHeight;
    });
    y -= 4;
  }

  // SECTION: Case Metadata
  drawSectionHeader(page, 'Case Metadata', margin, y, fontBold, rgb(0,0,0));
  y -= lineHeight;
  page.drawText(`Case Number: ${input.case_number || ''}`, { x: margin + 10, y, size: 12, font });
  page.drawText(`Step: ${input.step_label || input.step}`, { x: margin + 200, y, size: 12, font });
  page.drawText(`Date: ${new Date(input.date).toLocaleDateString()}`, { x: margin + 350, y, size: 12, font });
  y -= lineHeight + 4;

  // STEP 3 SPECIAL: Final Union Recommendation
  if (input.step === 'step3') {
    drawSectionHeader(page, 'Final Union Recommendation', margin, y, fontBold, rgb(0,0,0));
    y -= lineHeight;
    page.drawText('This case is recommended for arbitration. Forwarded to MBA for review.', { x: margin + 10, y, size: 12, font });
    y -= lineHeight + 4;
  }

  // WATERMARK
  page.drawText('CONFIDENTIAL — For Union Use Only', {
    x: pageWidth / 2 - 120,
    y: 40,
    size: 14,
    font: fontBold,
    color: rgb(0.9, 0.9, 0.9),
    opacity: 0.5,
  });

  // PAGE NUMBER
  page.drawText(`Page 1 of 1`, { x: pageWidth / 2 - 30, y: 20, size: 12, font, color: rgb(0.5,0.5,0.5) });

  // Return Buffer for Resend/email or download
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
