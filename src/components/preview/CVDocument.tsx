import { Award, BriefcaseBusiness, ExternalLink, GraduationCap, Linkedin, Mail, MapPin, MessageCircle, Phone, UserRound } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CVData, Experience, SectionKey } from '../../types/cv';

type Block = { section: SectionKey; label: string; content: ReactNode; units: number; startNewPage?: boolean };

const icons = { summary: UserRound, location: MapPin, experiences: BriefcaseBusiness, education: GraduationCap, certifications: Award, skills: Award, hobbies: UserRound, references: UserRound, projects: BriefcaseBusiness };
const url = (value?: string) => value && (value.startsWith('http') || value.startsWith('mailto:') || value.startsWith('tel:')) ? value : value ? `https://${value}` : '';
const lines = (text?: string) => text?.split('\n').filter(Boolean) ?? [];

function SectionTitle({ type, children }: { type: SectionKey; children: ReactNode }) {
  const Icon = icons[type];
  return <h2 className="cv-section-title"><Icon aria-hidden="true" />{children}</h2>;
}
function Timeline({ title, subtitle, date, body, bullets = [], urlValue }: { title: string; subtitle?: string; date?: string; body?: string; bullets?: string[]; urlValue?: string }) {
  return <article className="timeline-entry">
    <div className="entry-top"><div><h3>{title}</h3>{subtitle && <p className="entry-org">{urlValue ? <a href={url(urlValue)}>{subtitle}</a> : subtitle}</p>}</div>{date && <span className="date-badge">▣ {date}</span>}</div>
    {body && <p className="entry-body">{body}</p>}
    {!!bullets.length && <ul>{bullets.map((item, i) => <li key={i}>{item}</li>)}</ul>}
  </article>;
}
const experienceDate = (entry: Experience) => `${entry.startDate || ''}${entry.startDate ? ' – ' : ''}${entry.current ? 'Present' : entry.endDate || ''}`;

function makeBlocks(cv: CVData): Block[] {
  const blocks: Block[] = [];
  const enabled = cv.settings.sections.filter((s) => s.enabled);
  enabled.forEach((setting) => {
    const title = setting.label;
    const first = (content: ReactNode, units: number) => blocks.push({ section: setting.key, label: title, content, units, startNewPage: setting.startNewPage });
    const more = (content: ReactNode, units: number) => blocks.push({ section: setting.key, label: title, content, units });
    if (setting.key === 'summary' && (cv.summary.headline || cv.summary.text)) first(<div className="summary-content">{cv.summary.headline && <strong>{cv.summary.headline}</strong>}{lines(cv.summary.text).map((p, i) => <p key={i}>{p}</p>)}</div>, 15 + (cv.summary.text?.length ?? 0) / 80);
    if (setting.key === 'location') first(<div className="location-grid">{Object.entries({ 'State of Residence': cv.location.state, Region: cv.location.region, LGA: cv.location.lga, Address: cv.location.address, Country: cv.location.country }).filter(([,v]) => v).map(([k,v]) => <div key={k}><span>{k}:</span><p>{v}</p></div>)}</div>, 17);
    if (setting.key === 'experiences') cv.experiences.sort((a,b) => a.order-b.order).forEach((entry, index) => (index ? more : first)(<Timeline title={`${entry.jobTitle}${entry.employmentType ? ` (${entry.employmentType})` : ''}`} subtitle={entry.organization} date={experienceDate(entry)} body={entry.description} bullets={entry.achievements} urlValue={entry.website} />, 13 + entry.description.length / 55 + entry.achievements.length * 3));
    if (setting.key === 'education') cv.education.sort((a,b) => a.order-b.order).forEach((entry,index) => (index ? more : first)(<Timeline title={`${entry.qualification}${entry.fieldOfStudy ? ` — ${entry.fieldOfStudy}` : ''}`} subtitle={entry.institution} date={`${entry.startYear || ''}${entry.startYear ? ' – ' : ''}${entry.current ? 'Present' : entry.endYear || ''}`} body={entry.description} />, 13 + (entry.description?.length ?? 0) / 65));
    if (setting.key === 'certifications') cv.certifications.sort((a,b) => a.order-b.order).forEach((entry,index) => (index ? more : first)(<Timeline title={entry.name} subtitle={entry.issuer} date={entry.date} body={entry.description} bullets={entry.items} urlValue={entry.credentialUrl} />, 12 + (entry.description?.length ?? 0) / 65 + (entry.items?.length ?? 0) * 3));
    if (setting.key === 'skills' && cv.skills.length) {
      const skills = [...cv.skills].sort(cv.settings.alphabeticalSkills ? (a,b) => a.name.localeCompare(b.name) : (a,b) => a.order-b.order);
      first(<div className="skill-grid">{skills.map((skill) => <span className="skill-pill" key={skill.id}>{skill.name}{cv.settings.showSkillLevels && skill.level && <><i />{skill.level}</>}</span>)}</div>, 8 + skills.length * 2.2);
    }
    if (setting.key === 'hobbies' && cv.hobbies.length) first(<div className="tag-list">{cv.hobbies.sort((a,b)=>a.order-b.order).map((hobby) => <span key={hobby.id}>{hobby.name}</span>)}</div>, 10);
    if (setting.key === 'references') {
      if (cv.settings.referencesOnRequest) first(<p className="available">References available on request.</p>, 8);
      else cv.references.sort((a,b)=>a.order-b.order).forEach((ref,index) => (index ? more : first)(<Timeline title={ref.name} subtitle={[ref.jobTitle,ref.organization].filter(Boolean).join(' · ')} body={[ref.phone,ref.email,ref.address].filter(Boolean).join(' · ')} />, 12));
    }
    if (setting.key === 'projects') cv.projects.sort((a,b)=>a.order-b.order).forEach((project,index) => (index ? more : first)(<Timeline title={project.title} subtitle={project.subtitle} date={project.date} body={project.body} bullets={project.bullets} urlValue={project.url} />, 13 + (project.body?.length ?? 0) / 60));
  });
  return blocks;
}

function Header({ cv }: { cv: CVData }) {
  const p = cv.personal;
  const contacts = [
    [Mail, p.email, `mailto:${p.email}`], [Phone, [p.phone,p.secondaryPhone].filter(Boolean).join(' / '), `tel:${p.phone}`],
    [UserRound,p.nationality,''], [UserRound,p.maritalStatus,''], [Linkedin,'Profile',p.linkedIn], [MessageCircle,'WhatsApp Chat',p.whatsapp],
    [ExternalLink,'Portfolio',p.portfolio],
  ] as const;
  return <header className="cv-header"><h1>{p.fullName || 'Your Name'}</h1><div className="contact-grid">{contacts.filter(([,value])=>value).map(([Icon,value,href],i) => <div className="contact" key={i}><Icon aria-hidden="true" />{href ? <a href={url(href)}>{value}</a> : <span>{value}</span>}</div>)}</div></header>;
}

export function CVDocument({ cv, zoom = 0.75, onPageCount }: { cv: CVData; zoom?: number; onPageCount?: (count: number) => void }) {
  const blocks = makeBlocks(structuredClone(cv));
  const [pages, setPages] = useState<Block[][]>(() => [blocks]);
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const page = measureRef.current;
      if (!page) return;

      const pageStyle = getComputedStyle(page);
      const contentHeight = page.clientHeight
        - Number.parseFloat(pageStyle.paddingTop)
        - Number.parseFloat(pageStyle.paddingBottom);
      const header = page.querySelector<HTMLElement>('[data-measure-header]');
      const measuredBlocks = [...page.querySelectorAll<HTMLElement>('[data-measure-block]')];
      const outerHeight = (element?: HTMLElement | null) => {
        if (!element) return 0;
        const style = getComputedStyle(element);
        return element.getBoundingClientRect().height
          + Number.parseFloat(style.marginTop)
          + Number.parseFloat(style.marginBottom);
      };

      const nextPages: Block[][] = [[]];
      let usedHeight = outerHeight(header);

      blocks.forEach((block, index) => {
        const blockHeight = outerHeight(measuredBlocks[index]);
        const currentPage = nextPages.at(-1)!;
        const explicitBreak = block.startNewPage && currentPage.length > 0;
        const needsRoom = usedHeight + blockHeight > contentHeight && currentPage.length > 0;

        if (explicitBreak || needsRoom) {
          nextPages.push([]);
          usedHeight = 0;
        }

        nextPages.at(-1)!.push(block);
        usedHeight += blockHeight;
      });

      setPages(nextPages);
    };

    const frame = requestAnimationFrame(measure);
    document.fonts?.ready.then(measure);
    return () => cancelAnimationFrame(frame);
  }, [cv]);

  useEffect(() => onPageCount?.(pages.length), [onPageCount, pages.length]);
  const vars = { '--cv-primary': cv.settings.primary, '--cv-heading': cv.settings.heading, '--cv-text': cv.settings.text, '--cv-muted': cv.settings.muted, '--cv-skill-bg': cv.settings.skillBackground, '--cv-heading-font': cv.settings.headingFont, '--cv-body-font': cv.settings.oneFont ? cv.settings.headingFont : cv.settings.bodyFont, '--cv-body-size': `${cv.settings.bodySize}px`, '--cv-section-spacing': `${cv.settings.sectionSpacing ?? 10}pt`, '--preview-scale': zoom } as CSSProperties;
  return <div className={`cv-document density-${cv.settings.density} ${cv.settings.atsMode ? 'ats-mode' : ''}`} style={vars}>
    <div ref={measureRef} className="cv-page cv-measure-page" aria-hidden="true">
      <div data-measure-header><Header cv={cv} /></div>
      {blocks.map((block, index) => {
        const firstInSection = !blocks.slice(0, index).some((earlier) => earlier.section === block.section);
        return <section className="cv-section" data-measure-block key={`measure-${block.section}-${index}`}>
          {firstInSection && <SectionTitle type={block.section}>{block.label}</SectionTitle>}
          {block.content}
        </section>;
      })}
    </div>
    {pages.map((page, pageIndex) => <div className="page-shell" key={pageIndex}><main className="cv-page">
      {pageIndex === 0 && <Header cv={cv} />}
      {page.map((block,index) => {
        const previous = page[index - 1];
        const appearedOnEarlierPage = pages.slice(0, pageIndex).some((earlierPage) =>
          earlierPage.some((earlierBlock) => earlierBlock.section === block.section),
        );
        const showTitle = (!previous || previous.section !== block.section) && !appearedOnEarlierPage;
        return <section className="cv-section" key={`${block.section}-${index}`}>{showTitle && <SectionTitle type={block.section}>{block.label}</SectionTitle>}{block.content}</section>;
      })}
      <footer>{pageIndex + 1}</footer>
    </main></div>)}
  </div>;
}
