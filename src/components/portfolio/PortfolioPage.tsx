import { useEffect, useMemo, useState, type CSSProperties, type ComponentType } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Code2, Download, ExternalLink, Facebook, Github,
  Instagram, Layout, Linkedin, Mail, Menu, MessageCircle, Monitor, Moon, Smartphone, Sun, Twitter, UserRound, X,
} from 'lucide-react';
import { levelToProficiency } from '../../data/portfolioDefaults';
import { deriveSectors, filterProjectsBySector, projectExternalUrl, projectSector } from '../../lib/portfolio';
import type { CVData, PortfolioService } from '../../types/cv';

type PortfolioStyle = CSSProperties & Record<`--portfolio-${string}`, string>;
type ServiceStyle = CSSProperties & { '--service-accent': string };
type ColorMode = 'system' | 'light' | 'dark';

const SERVICE_ACCENTS = ['#1D4ED8', '#6D28D9', '#BE185D', '#047857'] as const;

function shuffledServiceAccents() {
  const colors = [...SERVICE_ACCENTS];
  for (let index = colors.length - 1; index > 0; index--) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    [colors[index], colors[swapWith]] = [colors[swapWith], colors[index]];
  }
  return colors;
}

function useTypingText(text: string, delay: number, speed: number) {
  const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const [visible, setVisible] = useState(() => reduceMotion() ? text : '');

  useEffect(() => {
    if (reduceMotion()) { setVisible(text); return; }
    setVisible('');
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      let length = 0;
      interval = window.setInterval(() => {
        length += 1;
        setVisible(text.slice(0, length));
        if (length >= text.length && interval !== undefined) window.clearInterval(interval);
      }, speed);
    }, delay);
    return () => { window.clearTimeout(timeout); if (interval !== undefined) window.clearInterval(interval); };
  }, [delay, speed, text]);

  return visible;
}

const serviceIcons: Record<PortfolioService['icon'], ComponentType> = {
  layout: Layout,
  code: Code2,
  smartphone: Smartphone,
  chart: BarChart3,
};

export function PortfolioPage({ cv, embedded = false, onDownloadCV }: { cv: CVData; embedded?: boolean; onDownloadCV?: () => void }) {
  const [filter, setFilter] = useState('All');
  const [testimonial, setTestimonial] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [colorMode, setColorMode] = useState<ColorMode>('system');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [serviceAccents] = useState(shuffledServiceAccents);
  const portfolio = cv.portfolio;
  const projects = [...cv.projects].sort((a, b) => a.order - b.order);
  const sectors = useMemo(() => deriveSectors(projects), [projects]);
  const visibleProjects = filterProjectsBySector(projects, filter);
  const testimonials = [...portfolio.testimonials].filter((item) => item.visible).sort((a, b) => a.order - b.order);
  const style: PortfolioStyle = {
    '--portfolio-accent': cv.settings.primary,
    '--portfolio-heading': cv.settings.heading,
    '--portfolio-text': cv.settings.text,
    '--portfolio-muted': cv.settings.muted,
    '--portfolio-heading-font': cv.settings.headingFont,
    '--portfolio-body-font': cv.settings.oneFont ? cv.settings.headingFont : cv.settings.bodyFont,
  };
  const navItems = [
    ['Home', 'home', portfolio.sections.hero], ['About', 'about', portfolio.sections.about], ['Services', 'services', portfolio.sections.services],
    ['Projects', 'projects', portfolio.sections.projects], ['Testimonials', 'testimonials', portfolio.sections.testimonials], ['Contact', 'contact', portfolio.sections.contact],
  ] as const;
  const socialLinks = [
    [cv.personal.linkedIn, Linkedin, 'LinkedIn'], [cv.personal.github, Github, 'GitHub'], [cv.personal.instagram, Instagram, 'Instagram'],
    [cv.personal.twitter, Twitter, 'Twitter'], [cv.personal.facebook, Facebook, 'Facebook'], [cv.personal.whatsapp, MessageCircle, 'WhatsApp'],
  ] as const;
  const summary = portfolio.heroSummary || cv.summary.text || '';
  const about = portfolio.aboutSummary || cv.summary.text || '';
  const resolvedMode = colorMode === 'system' ? (systemDark ? 'dark' : 'light') : colorMode;
  const heroName = cv.personal.fullName || 'Your name';
  const heroHeadline = cv.summary.headline || 'Your professional headline';
  const headlineDelay = 1050 + heroName.length * 55;
  const typedGreeting = useTypingText('Hi, I am', 120, 65);
  const typedName = useTypingText(heroName, 850, 55);
  const typedHeadline = useTypingText(heroHeadline, headlineDelay, 42);
  const typedSummary = useTypingText(summary, headlineDelay + heroHeadline.length * 42 + 180, 12);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const updateSystemMode = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', updateSystemMode);
    return () => media.removeEventListener('change', updateSystemMode);
  }, []);

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenu(false);
  };

  return <main className={`portfolio-site portfolio-${resolvedMode} ${embedded ? 'portfolio-embedded' : ''}`} style={style} data-color-mode={colorMode}>
    <nav className="portfolio-nav" aria-label="Portfolio navigation">
      <button className="portfolio-wordmark" onClick={() => goTo('home')} aria-label="Go to home"><span>{cv.personal.fullName.trim().charAt(0) || 'J'}</span><strong>{cv.personal.fullName || 'My Portfolio'}</strong></button>
      <button className="portfolio-menu-button" onClick={() => setMobileMenu((open) => !open)} aria-expanded={mobileMenu} aria-label="Toggle navigation">{mobileMenu ? <X/> : <Menu/>}</button>
      <div className={`portfolio-nav-links ${mobileMenu ? 'open' : ''}`}>{navItems.filter(([, , shown]) => shown).map(([label, id]) => <button key={id} onClick={() => goTo(id)}>{label}</button>)}</div>
      <div className="portfolio-theme-switch" role="group" aria-label="Colour mode">
        <button className={colorMode === 'system' ? 'active' : ''} onClick={() => setColorMode('system')} aria-label="Use system colour mode" title="System theme"><Monitor/></button>
        <button className={colorMode === 'light' ? 'active' : ''} onClick={() => setColorMode('light')} aria-label="Use light colour mode" title="Light theme"><Sun/></button>
        <button className={colorMode === 'dark' ? 'active' : ''} onClick={() => setColorMode('dark')} aria-label="Use dark colour mode" title="Dark theme"><Moon/></button>
      </div>
      <button className="portfolio-accent-button portfolio-download" onClick={onDownloadCV}><Download/> Download CV</button>
    </nav>

    {portfolio.sections.hero && <section className="portfolio-hero portfolio-section" id="home">
      <div className="portfolio-hero-copy portfolio-reveal">
        <span className={`portfolio-kicker portfolio-typewriter ${typedGreeting !== 'Hi, I am' ? 'typing' : ''}`} aria-label="Hi, I am">{typedGreeting}</span>
        <strong className={`portfolio-name portfolio-typewriter ${typedName !== heroName ? 'typing' : ''}`} aria-label={heroName}>{typedName}</strong>
        <h1 className={`portfolio-typewriter ${typedHeadline !== heroHeadline ? 'typing' : ''}`} aria-label={heroHeadline}>{typedHeadline}</h1>
        <p className={`portfolio-typewriter ${typedSummary !== summary ? 'typing' : ''}`} aria-label={summary}>{typedSummary}</p>
        <a className="portfolio-accent-button" href={`mailto:${cv.personal.email}`}>Hire me</a>
      </div>
      <div className="portfolio-portrait-column portfolio-reveal portfolio-delay">
        <Portrait src={portfolio.heroImage} alt={portfolio.heroImageAlt} label="Upload your main picture" />
        <div className="portfolio-socials">{socialLinks.filter(([url]) => url).map(([url, Icon, label]) => <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={label}><Icon/></a>)}</div>
      </div>
    </section>}

    {portfolio.sections.about && <section className="portfolio-about portfolio-section" id="about">
      <div className="portfolio-reveal"><Portrait src={portfolio.aboutImage} alt={portfolio.aboutImageAlt} label="Upload your About Me picture" /></div>
      <div className="portfolio-about-copy portfolio-reveal portfolio-delay">
        <SectionHeading title="About Me" />
        <p>{about}</p>
        <div className="portfolio-skills" aria-label="Skills proficiency">{[...cv.skills].sort((a, b) => a.order - b.order).map((skill) => {
          const proficiency = Math.max(0, Math.min(100, skill.proficiency ?? levelToProficiency[skill.level ?? 'Intermediate']));
          return <div className="portfolio-skill" key={skill.id}><div><strong>{skill.name}</strong><span>{proficiency}%</span></div><div className="portfolio-skill-track"><i style={{ width: `${proficiency}%` }}/></div></div>;
        })}</div>
      </div>
    </section>}

    {portfolio.sections.services && <section className="portfolio-centered-section portfolio-section" id="services">
      <SectionHeading title="Services" body={portfolio.servicesIntro} centered />
      <div className="portfolio-services">{[...portfolio.services].sort((a, b) => a.order - b.order).map((service, index) => {
        const Icon = serviceIcons[service.icon];
        const serviceStyle = { '--service-accent': serviceAccents[index % SERVICE_ACCENTS.length] } as ServiceStyle;
        return <article key={service.id} className="portfolio-service-card portfolio-reveal" style={serviceStyle}><span><Icon/></span><h3>{service.title}</h3><p>{service.description}</p></article>;
      })}</div>
    </section>}

    {portfolio.sections.projects && <section className="portfolio-centered-section portfolio-section" id="projects">
      <SectionHeading title="My Projects" body={portfolio.projectsIntro} centered />
      <div className="portfolio-filters" role="group" aria-label="Filter projects">{sectors.map((sector) => <button key={sector} className={filter === sector ? 'active' : ''} onClick={() => setFilter(sector)}>{sector}</button>)}</div>
      <div className="portfolio-projects">{visibleProjects.map((project) => { const projectUrl = projectExternalUrl(project.url); return <article className="portfolio-project-card portfolio-reveal" key={project.id}>
        <a href={projectUrl} target={projectUrl ? '_blank' : undefined} rel="noreferrer" aria-label={projectUrl ? `Open ${project.title}` : undefined}>
          <ProjectPreview cv={cv} project={project}/>
          <span>{projectSector(project)}</span>
          <h3>{project.title}</h3>
          {project.body && <p>{project.body}</p>}
          {projectUrl && <small>{new URL(projectUrl).hostname.replace(/^www\./, '')}<ExternalLink/></small>}
        </a>
      </article>; })}</div>
      {!visibleProjects.length && <p className="portfolio-empty">No projects in this category yet.</p>}
    </section>}

    {portfolio.sections.testimonials && testimonials.length > 0 && <section className="portfolio-testimonial-section portfolio-section" id="testimonials">
      <SectionHeading title="Testimonials" body={portfolio.testimonialsIntro} centered />
      <div className="portfolio-testimonial-shell">
        <button onClick={() => setTestimonial((testimonial - 1 + testimonials.length) % testimonials.length)} aria-label="Previous testimonial"><ArrowLeft/></button>
        <article className="portfolio-testimonial">
          <Avatar src={testimonials[testimonial]?.avatar} name={testimonials[testimonial]?.name}/>
          <div><blockquote>“{testimonials[testimonial]?.quote}”</blockquote><strong>{testimonials[testimonial]?.name}</strong><span>{[testimonials[testimonial]?.role, testimonials[testimonial]?.company].filter(Boolean).join(' · ')}</span></div>
        </article>
        <button onClick={() => setTestimonial((testimonial + 1) % testimonials.length)} aria-label="Next testimonial"><ArrowRight/></button>
      </div>
      <div className="portfolio-dots">{testimonials.map((item, index) => <button key={item.id} className={index === testimonial ? 'active' : ''} onClick={() => setTestimonial(index)} aria-label={`Show testimonial ${index + 1}`}/>)}</div>
    </section>}

    {portfolio.sections.contact && <section className="portfolio-contact portfolio-section" id="contact">
      <SectionHeading title={portfolio.contactHeading} body={portfolio.contactBody} centered />
      <form onSubmit={(event) => { event.preventDefault(); window.location.href = `mailto:${cv.personal.email}?subject=${encodeURIComponent(`Portfolio enquiry from ${contactEmail || 'a visitor'}`)}`; }}>
        <input id="portfolio-email" aria-label="Your email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} type="email" placeholder="Enter your email" required/>
        <button className="portfolio-accent-button" type="submit"><Mail/> Contact me</button>
      </form>
    </section>}

    <footer className="portfolio-footer">
      <button className="portfolio-wordmark" onClick={() => goTo('home')}><span>{cv.personal.fullName.trim().charAt(0) || 'J'}</span><strong>{cv.personal.fullName}</strong></button>
      <div className="portfolio-footer-links">{navItems.filter(([, , shown]) => shown).map(([label, id]) => <button key={id} onClick={() => goTo(id)}>{label}</button>)}</div>
      <div className="portfolio-socials">{socialLinks.filter(([url]) => url).map(([url, Icon, label]) => <a key={label} href={url} target="_blank" rel="noreferrer" aria-label={label}><Icon/></a>)}</div>
      <div className="portfolio-copyright">© {new Date().getFullYear()} <strong>{cv.personal.fullName}</strong> {portfolio.footerNote}</div>
    </footer>
  </main>;
}

function SectionHeading({ title, body, centered = false }: { title: string; body?: string; centered?: boolean }) {
  return <header className={`portfolio-section-heading ${centered ? 'centered' : ''}`}><h2>{title}</h2>{body && <p>{body}</p>}</header>;
}

function Portrait({ src, alt, label }: { src?: string; alt: string; label: string }) {
  return <div className="portfolio-portrait-wrap"><i/><i/><div className="portfolio-portrait">{src ? <img src={src} alt={alt}/> : <div><UserRound/><span>{label}</span></div>}</div></div>;
}

function Avatar({ src, name }: { src?: string; name?: string }) {
  return <div className="portfolio-avatar">{src ? <img src={src} alt=""/> : <span>{name?.split(/\s+/).map((part) => part[0]).slice(0, 2).join('') || 'T'}</span>}</div>;
}

function ProjectPreview({ cv, project }: { cv: CVData; project: CVData['projects'][number] }) {
  if (project.image || project.linkPreview?.imageUrl) return <div className="portfolio-project-image"><img src={project.image || project.linkPreview?.imageUrl} alt=""/></div>;
  return <div className="portfolio-project-mock" style={{ '--mock-accent': cv.settings.primary } as CSSProperties}>
    <div/><div><i/><i/><i/></div><section><span/><span/><span/></section>
  </div>;
}
