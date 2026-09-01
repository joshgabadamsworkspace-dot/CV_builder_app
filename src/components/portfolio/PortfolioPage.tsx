import { useMemo, useState, type CSSProperties, type ComponentType } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Code2, Download, ExternalLink, Facebook, Github,
  Instagram, Layout, Linkedin, Mail, Menu, Smartphone, Twitter, UserRound, X,
} from 'lucide-react';
import { levelToProficiency } from '../../data/portfolioDefaults';
import { deriveSectors, filterProjectsBySector, projectSector } from '../../lib/portfolio';
import type { CVData, PortfolioService } from '../../types/cv';

type PortfolioStyle = CSSProperties & Record<`--portfolio-${string}`, string>;

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
    [cv.personal.twitter, Twitter, 'Twitter'], [cv.personal.facebook, Facebook, 'Facebook'],
  ] as const;
  const summary = portfolio.heroSummary || cv.summary.text || '';
  const about = portfolio.aboutSummary || cv.summary.text || '';

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileMenu(false);
  };

  return <main className={`portfolio-site ${embedded ? 'portfolio-embedded' : ''}`} style={style}>
    <nav className="portfolio-nav" aria-label="Portfolio navigation">
      <button className="portfolio-wordmark" onClick={() => goTo('home')} aria-label="Go to home"><span>{cv.personal.fullName.trim().charAt(0) || 'J'}</span><strong>{cv.personal.fullName || 'My Portfolio'}</strong></button>
      <button className="portfolio-menu-button" onClick={() => setMobileMenu((open) => !open)} aria-expanded={mobileMenu} aria-label="Toggle navigation">{mobileMenu ? <X/> : <Menu/>}</button>
      <div className={`portfolio-nav-links ${mobileMenu ? 'open' : ''}`}>{navItems.filter(([, , shown]) => shown).map(([label, id]) => <button key={id} onClick={() => goTo(id)}>{label}</button>)}</div>
      <button className="portfolio-accent-button portfolio-download" onClick={onDownloadCV}><Download/> Download CV</button>
    </nav>

    {portfolio.sections.hero && <section className="portfolio-hero portfolio-section" id="home">
      <div className="portfolio-hero-copy portfolio-reveal">
        <span className="portfolio-kicker">Hi, I am</span>
        <strong className="portfolio-name">{cv.personal.fullName || 'Your name'}</strong>
        <h1>{cv.summary.headline || 'Your professional headline'}</h1>
        <p>{summary}</p>
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
      <div className="portfolio-services">{[...portfolio.services].sort((a, b) => a.order - b.order).map((service) => {
        const Icon = serviceIcons[service.icon];
        return <article key={service.id} className="portfolio-service-card portfolio-reveal"><span><Icon/></span><h3>{service.title}</h3><p>{service.description}</p></article>;
      })}</div>
    </section>}

    {portfolio.sections.projects && <section className="portfolio-centered-section portfolio-section" id="projects">
      <SectionHeading title="My Projects" body={portfolio.projectsIntro} centered />
      <div className="portfolio-filters" role="group" aria-label="Filter projects">{sectors.map((sector) => <button key={sector} className={filter === sector ? 'active' : ''} onClick={() => setFilter(sector)}>{sector}</button>)}</div>
      <div className="portfolio-projects">{visibleProjects.map((project) => <article className="portfolio-project-card portfolio-reveal" key={project.id}>
        <a href={project.url || undefined} target={project.url ? '_blank' : undefined} rel="noreferrer" aria-label={project.url ? `Open ${project.title}` : undefined}>
          <ProjectPreview cv={cv} project={project}/>
          <span>{projectSector(project)}</span>
          <h3>{project.title}</h3>
          {project.body && <p>{project.body}</p>}
          {project.url && <small>{new URL(project.url, window.location.href).hostname}<ExternalLink/></small>}
        </a>
      </article>)}</div>
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
        <label className="sr-only" htmlFor="portfolio-email">Your email</label><input id="portfolio-email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} type="email" placeholder="Enter your email" required/>
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
