import type { CVData } from '../types/cv';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface ImportResult { text: string; draft: CVData; warnings: string[] }

async function extractPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '));
  }
  return pages.join('\n');
}
async function extractDocx(file: File) {
  const mammoth = await import('mammoth');
  return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
}
export async function importCV(file: File, base: CVData): Promise<ImportResult> {
  const text = file.name.toLowerCase().endsWith('.pdf') ? await extractPdf(file) : await extractDocx(file);
  const lines = text.split(/\n|\s{3,}/).map((x) => x.trim()).filter(Boolean);
  const draft = structuredClone(base);
  draft.id = crypto.randomUUID(); draft.profileName = `${lines[0] || 'Imported'} — Imported`;
  const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0];
  const phone = text.match(/(?:\+?\d[\d\s()-]{8,}\d)/)?.[0];
  if (lines[0] && lines[0].length < 60) draft.personal.fullName = lines[0];
  if (email) draft.personal.email = email;
  if (phone) draft.personal.phone = phone;
  const skillsHeading = text.search(/\bskills?\b/i);
  if (skillsHeading >= 0) {
    const sample = text.slice(skillsHeading + 6, skillsHeading + 400).split(/[,•|\n]/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 40).slice(0, 15);
    if (sample.length) draft.skills = sample.map((name, order) => ({ id: crypto.randomUUID(), name, order }));
  }
  draft.summary.text = lines.slice(1, 5).join(' ');
  return { text, draft, warnings: ['Please verify the detected name and contact details.', 'Experience dates and organizations may require manual review.'] };
}
