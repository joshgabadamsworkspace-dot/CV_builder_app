import type { CVData, Certification, Education, Experience, Project } from '../types/cv';
import { createPortfolioDefaults } from '../data/portfolioDefaults';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface ImportResult { text: string; draft: CVData; warnings: string[] }

type SectionName = 'summary' | 'experience' | 'education' | 'certifications' | 'skills' | 'projects' | 'hobbies' | 'references';

const SECTION_ALIASES: Record<string, SectionName> = {
  'professional summary': 'summary', summary: 'summary', profile: 'summary', 'career profile': 'summary',
  objective: 'summary', 'career objective': 'summary', 'about me': 'summary',
  experience: 'experience', 'work experience': 'experience', 'professional experience': 'experience',
  'employment history': 'experience', 'work history': 'experience',
  education: 'education', 'academic background': 'education', 'academic qualifications': 'education',
  certifications: 'certifications', certification: 'certifications', certificates: 'certifications',
  'professional certifications': 'certifications', 'training and certifications': 'certifications',
  skills: 'skills', 'technical skills': 'skills', 'core skills': 'skills', 'core competencies': 'skills',
  competencies: 'skills', expertise: 'skills',
  projects: 'projects', 'selected projects': 'projects', 'personal projects': 'projects',
  hobbies: 'hobbies', interests: 'hobbies', 'hobbies and interests': 'hobbies',
  references: 'references', referees: 'references',
};

const MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_TOKEN = `(?:${MONTH}\\s+)?(?:19|20)\\d{2}`;
const DATE_RANGE = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to)\\s*(${DATE_TOKEN}|present|current|date)`, 'i');
const BULLET = /^\s*(?:[•●▪◦‣*-]|\d+[.)])\s*/;

async function extractPdf(file: File) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    const parts: string[] = [];
    let previousY: number | undefined;
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = item.transform[5];
      if (previousY !== undefined && Math.abs(y - previousY) > 2) parts.push('\n');
      else if (parts.length && parts.at(-1) !== '\n') parts.push(' ');
      parts.push(item.str.trim());
      if (item.hasEOL) { parts.push('\n'); previousY = undefined; }
      else previousY = y;
    }
    pages.push(parts.join('').replace(/[ \t]+\n/g, '\n'));
  }
  return pages.join('\n');
}

async function extractDocx(file: File) {
  const mammoth = await import('mammoth');
  return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
}

function cleanLine(value: string) { return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim(); }
function withoutBullet(value: string) { return cleanLine(value.replace(BULLET, '')); }
function normalizedHeading(value: string) { return cleanLine(value).replace(/[:|]+$/, '').toLowerCase(); }
function isContactLine(value: string) { return /@|https?:\/\/|www\.|linkedin\.com|github\.com|\+?\d[\d\s().-]{7,}\d/i.test(value); }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-portfolio'; }
function unique(values: string[]) { return [...new Set(values.map(cleanLine).filter(Boolean))]; }

function splitSections(text: string) {
  const lines = text.replace(/\r/g, '').split('\n').map(cleanLine).filter(Boolean);
  const preamble: string[] = [];
  const sections = new Map<SectionName, string[]>();
  let current: SectionName | undefined;
  for (const line of lines) {
    const heading = SECTION_ALIASES[normalizedHeading(line)];
    if (heading) { current = heading; if (!sections.has(heading)) sections.set(heading, []); continue; }
    if (current) sections.get(current)?.push(line); else preamble.push(line);
  }
  return { lines, preamble, sections };
}

function extractPhone(text: string) {
  const candidates = text.match(/(?:\+\s*)?(?:\(?\d{2,4}\)?[\s.-]*){3,6}\d/g) ?? [];
  return candidates.map(cleanLine).find((candidate) => candidate.replace(/\D/g, '').length >= 10) ?? '';
}

function extractUrl(text: string, host: string) {
  const escaped = host.replace('.', '\\.');
  return text.match(new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${escaped}\\/[^\\s,;|]+`, 'i'))?.[0] ?? '';
}

function dateParts(line: string) {
  const match = line.match(DATE_RANGE);
  if (!match) return null;
  return { startDate: match[1], endDate: match[2], current: /present|current|date/i.test(match[2]), match: match[0] };
}

function entryHeaders(lines: string[], dateIndex: number, dateText: string) {
  const inline = cleanLine(lines[dateIndex].replace(dateText, '').replace(/^[|,;\s-]+|[|,;\s-]+$/g, ''));
  if (inline) return inline.split(/\s+[|–—]\s+|\s+-\s+/).map(cleanLine).filter(Boolean).slice(0, 2);
  const candidates: string[] = [];
  for (let i = dateIndex - 1; i >= 0 && candidates.length < 2; i--) {
    if (BULLET.test(lines[i]) || dateParts(lines[i])) break;
    candidates.unshift(withoutBullet(lines[i]));
  }
  return candidates;
}

function detailsAfter(lines: string[], dateIndex: number) {
  const out: string[] = [];
  for (let i = dateIndex + 1; i < lines.length; i++) {
    if (dateParts(lines[i])) break;
    if (i + 1 < lines.length && dateParts(lines[i + 1])) break;
    if (i + 2 < lines.length && dateParts(lines[i + 2]) && !BULLET.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out;
}

function parseExperiences(lines: string[]): Experience[] {
  const entries: Experience[] = [];
  lines.forEach((line, index) => {
    const dates = dateParts(line);
    if (!dates) return;
    const headers = entryHeaders(lines, index, dates.match);
    const details = detailsAfter(lines, index);
    const achievements = unique(details.filter((detail) => BULLET.test(detail)).map(withoutBullet));
    const description = unique(details.filter((detail) => !BULLET.test(detail)).map(withoutBullet)).join(' ');
    entries.push({
      id: crypto.randomUUID(), jobTitle: headers[0] ?? 'Role', organization: headers[1] ?? '',
      startDate: dates.startDate, endDate: dates.current ? undefined : dates.endDate, current: dates.current,
      description, achievements, technologies: [], order: entries.length, keepTogether: true,
    });
  });
  return entries;
}

function parseEducation(lines: string[]): Education[] {
  const entries: Education[] = [];
  lines.forEach((line, index) => {
    const dates = dateParts(line);
    if (!dates) return;
    const headers = entryHeaders(lines, index, dates.match);
    const description = unique(detailsAfter(lines, index).map(withoutBullet)).join(' ');
    entries.push({
      id: crypto.randomUUID(), qualification: headers[0] ?? 'Qualification', institution: headers[1] ?? '',
      startYear: dates.startDate, endYear: dates.current ? undefined : dates.endDate, current: dates.current,
      description: description || undefined, order: entries.length,
    });
  });
  return entries;
}

function parseCertifications(lines: string[]): Certification[] {
  return lines.map(withoutBullet).filter(Boolean).map((line, order) => {
    const date = line.match(/\b(?:19|20)\d{2}\b/)?.[0];
    const clean = cleanLine(date ? line.replace(date, '') : line).replace(/[|,;\s-]+$/, '');
    const parts = clean.split(/\s+[|–—]\s+|\s+-\s+|,\s+(?=[A-Z])/).map(cleanLine).filter(Boolean);
    return { id: crypto.randomUUID(), name: parts[0] || line, issuer: parts[1], date, order };
  });
}

function parseProjects(lines: string[]): Project[] {
  return lines.map(withoutBullet).filter(Boolean).map((line, order) => {
    const parts = line.split(/\s+[|–—]\s+|:\s+/).map(cleanLine).filter(Boolean);
    return { id: crypto.randomUUID(), title: parts[0], body: parts.slice(1).join(' — ') || undefined, sector: 'Projects', tags: [], order };
  });
}

function listItems(lines: string[]) {
  return unique(lines.flatMap((line) => line.split(/[,;•|]/)).map(withoutBullet))
    .filter((item) => item.length > 1 && item.length < 80);
}

/** Converts extracted CV text into a clean profile. The uploaded document is
 * the only source of personal/content fields; `base` contributes appearance
 * settings only, so sample CV data can never leak into an import. */
export function parseCVText(text: string, base: CVData): ImportResult {
  if (!text.trim()) throw new Error('No readable text was found. The document may be an image-only scan.');
  const { lines, preamble, sections } = splitSections(text);
  const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? '';
  const phone = extractPhone(text);
  const firstSectionIndex = lines.findIndex((line) => Boolean(SECTION_ALIASES[normalizedHeading(line)]));
  const headerLines = (firstSectionIndex >= 0 ? lines.slice(0, firstSectionIndex) : preamble)
    .filter((line) => !isContactLine(line));
  const fullName = headerLines.find((line) => line.length >= 2 && line.length < 60) ?? 'Imported CV';
  const headline = headerLines.find((line) => line !== fullName && line.length < 100);
  const summaryLines = sections.get('summary') ?? headerLines.filter((line) => line !== fullName && line !== headline).slice(0, 4);
  const profileName = `${fullName} — Imported`;

  const draft: CVData = {
    ...structuredClone(base), id: crypto.randomUUID(), version: 1, profileName, updatedAt: new Date().toISOString(),
    settings: { ...structuredClone(base.settings), fileName: `${slugify(fullName).replace(/-/g, '_')}_CV` },
    personal: {
      fullName, email, phone,
      linkedIn: extractUrl(text, 'linkedin.com') || undefined,
      github: extractUrl(text, 'github.com') || undefined,
      website: text.match(/https?:\/\/(?![^\s]*\b(?:linkedin|github)\.com)[^\s,;|]+/i)?.[0],
    },
    summary: { headline, text: summaryLines.map(withoutBullet).join(' ') },
    location: {},
    experiences: parseExperiences(sections.get('experience') ?? []),
    education: parseEducation(sections.get('education') ?? []),
    certifications: parseCertifications(sections.get('certifications') ?? []),
    skills: listItems(sections.get('skills') ?? []).slice(0, 30).map((name, order) => ({ id: crypto.randomUUID(), name, order })),
    hobbies: listItems(sections.get('hobbies') ?? []).slice(0, 20).map((name, order) => ({ id: crypto.randomUUID(), name, order })),
    references: [],
    projects: parseProjects(sections.get('projects') ?? []),
    portfolio: createPortfolioDefaults(slugify(fullName)),
  };

  const detected = [draft.experiences.length && 'experience', draft.education.length && 'education', draft.skills.length && 'skills'].filter(Boolean);
  const warnings = [
    `Imported ${lines.length} lines${detected.length ? ` and detected ${detected.join(', ')}` : ''}.`,
    'Please review the imported details before saving; document layouts vary.',
  ];
  return { text, draft, warnings };
}

export async function importCV(file: File, base: CVData): Promise<ImportResult> {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) throw new Error('Please upload a PDF or DOCX file.');
  const text = lowerName.endsWith('.pdf') ? await extractPdf(file) : await extractDocx(file);
  return parseCVText(text, base);
}
