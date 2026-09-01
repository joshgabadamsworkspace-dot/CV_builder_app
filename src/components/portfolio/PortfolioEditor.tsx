import { BarChart3, Code2, Layout, Smartphone } from 'lucide-react';
import { AddButton, CardActions, Checkbox, Field, ImageUpload, Panel, SortableList, TextArea } from '../editor/Editor';
import { useCVStore } from '../../store/useCVStore';
import type { PortfolioSectionKey, PortfolioService } from '../../types/cv';

const uid = () => crypto.randomUUID();
const updateAt = <T,>(items: T[], index: number, patch: Partial<T>) => items.map((item, i) => i === index ? { ...item, ...patch } : item);
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const sectionLabels: Record<PortfolioSectionKey, string> = { hero: 'Hero', about: 'About me', services: 'Services', projects: 'Projects', testimonials: 'Testimonials', contact: 'Contact' };
const serviceIcons: Record<PortfolioService['icon'], typeof Layout> = { layout: Layout, code: Code2, smartphone: Smartphone, chart: BarChart3 };

export function PortfolioEditor() {
  const { portfolioSection } = useCVStore();
  if (portfolioSection === 'images') return <ImagesPanel />;
  if (portfolioSection === 'services') return <ServicesPanel />;
  if (portfolioSection === 'testimonials') return <TestimonialsPanel />;
  if (portfolioSection === 'contact') return <ContactPanel />;
  return <OverviewPanel />;
}

function OverviewPanel() {
  const { cv, update } = useCVStore();
  const p = cv.portfolio;
  return <Panel title="Overview & publishing" subtitle="Slug, section visibility, and intro copy for the public portfolio.">
    <div className="form-grid">
      <label className="field wide"><span>Public slug</span><div className="slug-field"><span>/p/</span><input value={p.slug} onChange={(e) => update((c) => { c.portfolio.slug = slugify(e.target.value); })} /></div></label>
      <Checkbox label="Mark as published (preview only — live cloud publishing is a later phase)" checked={p.published} onChange={(v) => update((c) => { c.portfolio.published = v; c.portfolio.publishedAt = v ? new Date().toISOString() : undefined; })} />
    </div>
    <h3 className="subheading">Sections shown on the public page</h3>
    <div className="form-grid">{(Object.keys(p.sections) as PortfolioSectionKey[]).map((key) => <Checkbox key={key} label={sectionLabels[key]} checked={p.sections[key]} onChange={(v) => update((c) => { c.portfolio.sections[key] = v; })} />)}</div>
    <h3 className="subheading">Section introductions</h3>
    <div className="form-grid">
      <TextArea label="Services intro" value={p.servicesIntro} onChange={(v) => update((c) => { c.portfolio.servicesIntro = v; })} />
      <TextArea label="Projects intro" value={p.projectsIntro} onChange={(v) => update((c) => { c.portfolio.projectsIntro = v; })} />
      <TextArea label="Testimonials intro" value={p.testimonialsIntro} onChange={(v) => update((c) => { c.portfolio.testimonialsIntro = v; })} />
    </div>
  </Panel>;
}

function ImagesPanel() {
  const { cv, update } = useCVStore();
  const p = cv.portfolio;
  return <Panel title="Hero & about images" subtitle="Shown on the public hero and about sections.">
    <h3 className="subheading">Upload your main picture</h3>
    <ImageUpload label="Upload your main picture" value={p.heroImage} alt={p.heroImageAlt} onChange={(v) => update((c) => { c.portfolio.heroImage = v; })} onAltChange={(v) => update((c) => { c.portfolio.heroImageAlt = v; })} recommended="Recommended: square, at least 800×800px" />
    <TextArea label="Hero summary override (optional)" value={p.heroSummary} onChange={(v) => update((c) => { c.portfolio.heroSummary = v; })} placeholder="Leave blank to reuse your CV professional summary" />
    <h3 className="subheading">Upload your About Me picture</h3>
    <ImageUpload label="Upload your About Me picture" value={p.aboutImage} alt={p.aboutImageAlt} onChange={(v) => update((c) => { c.portfolio.aboutImage = v; })} onAltChange={(v) => update((c) => { c.portfolio.aboutImageAlt = v; })} recommended="Recommended: portrait, at least 800×1000px" />
    <TextArea label="About summary override (optional)" value={p.aboutSummary} onChange={(v) => update((c) => { c.portfolio.aboutSummary = v; })} placeholder="Leave blank to reuse your CV professional summary" />
    <p className="field-hint">Skills shown here come from CV Builder → Skills. Set each skill's portfolio proficiency there to control its progress bar.</p>
  </Panel>;
}

function ServicesPanel() {
  const { cv, update } = useCVStore();
  const add = () => update((c) => c.portfolio.services.push({ id: uid(), title: 'New service', description: '', icon: 'layout', order: c.portfolio.services.length }));
  return <Panel title="Services" subtitle="Shown as cards on the public page. One consistent icon family." action={<AddButton onClick={add}>Add service</AddButton>}>
    <SortableList items={cv.portfolio.services} onReorder={(items) => update((c) => { c.portfolio.services = items; })} render={(item, index) => <div className="form-grid">
      <Field label="Title" value={item.title} onChange={(v) => update((c) => { c.portfolio.services = updateAt(c.portfolio.services, index, { title: v }); })} wide />
      <label className="field wide"><span>Icon</span><div className="icon-select">{(Object.keys(serviceIcons) as PortfolioService['icon'][]).map((key) => { const Icon = serviceIcons[key]; return <button key={key} type="button" className={item.icon === key ? 'selected' : ''} onClick={() => update((c) => { c.portfolio.services = updateAt(c.portfolio.services, index, { icon: key }); })} aria-label={key} aria-pressed={item.icon === key}><Icon /></button>; })}</div></label>
      <TextArea label="Description" value={item.description} onChange={(v) => update((c) => { c.portfolio.services = updateAt(c.portfolio.services, index, { description: v }); })} />
      <CardActions onDuplicate={() => update((c) => c.portfolio.services.push({ ...item, id: uid(), order: c.portfolio.services.length }))} onDelete={() => update((c) => { c.portfolio.services = c.portfolio.services.filter((x) => x.id !== item.id); })} />
    </div>} />
  </Panel>;
}

function TestimonialsPanel() {
  const { cv, update } = useCVStore();
  const add = () => update((c) => c.portfolio.testimonials.push({ id: uid(), name: 'New testimonial', quote: '', visible: true, order: c.portfolio.testimonials.length }));
  return <Panel title="Testimonials" subtitle="Full control — add, edit, reorder, hide, or delete." action={<AddButton onClick={add}>Add testimonial</AddButton>}>
    <SortableList items={cv.portfolio.testimonials} onReorder={(items) => update((c) => { c.portfolio.testimonials = items; })} render={(item, index) => <div className="form-grid">
      <Field label="Name" value={item.name} onChange={(v) => update((c) => { c.portfolio.testimonials = updateAt(c.portfolio.testimonials, index, { name: v }); })} />
      <Field label="Role" value={item.role} onChange={(v) => update((c) => { c.portfolio.testimonials = updateAt(c.portfolio.testimonials, index, { role: v }); })} />
      <Field label="Company" value={item.company} onChange={(v) => update((c) => { c.portfolio.testimonials = updateAt(c.portfolio.testimonials, index, { company: v }); })} wide />
      <TextArea label="Quote" value={item.quote} onChange={(v) => update((c) => { c.portfolio.testimonials = updateAt(c.portfolio.testimonials, index, { quote: v }); })} />
      <ImageUpload label="Avatar" value={item.avatar} onChange={(v) => update((c) => { c.portfolio.testimonials = updateAt(c.portfolio.testimonials, index, { avatar: v }); })} recommended="Square, at least 200×200px" />
      <Checkbox label="Visible on public page" checked={item.visible} onChange={(v) => update((c) => { c.portfolio.testimonials = updateAt(c.portfolio.testimonials, index, { visible: v }); })} />
      <CardActions onDuplicate={() => update((c) => c.portfolio.testimonials.push({ ...item, id: uid(), order: c.portfolio.testimonials.length }))} onDelete={() => update((c) => { c.portfolio.testimonials = c.portfolio.testimonials.filter((x) => x.id !== item.id); })} />
    </div>} />
  </Panel>;
}

function ContactPanel() {
  const { cv, update } = useCVStore();
  const p = cv.portfolio;
  return <Panel title="Contact & footer" subtitle="Copy shown in the contact call-to-action and footer.">
    <div className="form-grid">
      <Field label="Contact heading" value={p.contactHeading} onChange={(v) => update((c) => { c.portfolio.contactHeading = v; })} wide />
      <TextArea label="Contact body" value={p.contactBody} onChange={(v) => update((c) => { c.portfolio.contactBody = v; })} />
      <Field label="Footer note" value={p.footerNote} onChange={(v) => update((c) => { c.portfolio.footerNote = v; })} wide />
    </div>
    <p className="field-hint">The contact form opens the visitor's email client addressed to {cv.personal.email || 'your CV email'}. A protected server-side contact form is a later phase.</p>
  </Panel>;
}
