import { useEffect, useRef, useState } from 'react';
import { Check, Download, FileJson, LayoutDashboard, Menu, Minus, Palette, Plus, Upload, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { CVDocument } from '../components/preview/CVDocument';
import { Editor } from '../components/editor/Editor';
import { PortfolioEditor } from '../components/portfolio/PortfolioEditor';
import { PortfolioPage } from '../components/portfolio/PortfolioPage';
import { profileRepository } from '../lib/activeRepository';
import { useCVStore } from '../store/useCVStore';
import type { PortfolioEditorSection, SectionKey } from '../types/cv';
import { Logo, count, download } from './shared';

const sectionLinks: { key: SectionKey | 'personal'; label: string }[] = [
  { key: 'personal', label: 'Personal details' }, { key: 'summary', label: 'Professional summary' }, { key: 'location', label: 'Location' },
  { key: 'experiences', label: 'Work experience' }, { key: 'education', label: 'Education' }, { key: 'certifications', label: 'Certifications' },
  { key: 'skills', label: 'Skills' }, { key: 'projects', label: 'Projects' }, { key: 'hobbies', label: 'Hobbies' }, { key: 'references', label: 'References' },
];
const portfolioSectionLinks: { key: PortfolioEditorSection; label: string }[] = [
  { key: 'overview', label: 'Overview & publishing' }, { key: 'images', label: 'Hero & about images' },
  { key: 'services', label: 'Services' }, { key: 'testimonials', label: 'Testimonials' }, { key: 'contact', label: 'Contact & footer' },
];

export function Builder() {
  const navigate = useNavigate();
  const { profileId = '', tab } = useParams<{ profileId: string; tab: string }>();
  const builderTab: 'cv' | 'portfolio' = tab === 'portfolio' ? 'portfolio' : 'cv';
  const { cv, activeSection, portfolioSection, saveState, setCV, setActiveSection, setPortfolioSection, setSaveState, syncVersion, update } = useCVStore();
  const [status, setStatus] = useState<'loading' | 'ready' | 'not-found'>(cv.id === profileId ? 'ready' : 'loading');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview' | 'theme'>('edit');
  const [portfolioViewport, setPortfolioViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [zoom, setZoom] = useState(.75); const [pages, setPages] = useState(1); const [menu, setMenu] = useState(false);
  const jsonRef = useRef<HTMLInputElement>(null);

  // Direct link / refresh support: hydrate from IndexedDB when the URL's
  // profile isn't the one already in the store.
  useEffect(() => {
    if (cv.id === profileId) { setStatus('ready'); return; }
    let cancelled = false;
    setStatus('loading');
    profileRepository.get(profileId).then((profile) => {
      if (cancelled) return;
      if (profile) { setCV(profile); setStatus('ready'); } else { setStatus('not-found'); }
    }).catch(() => { if (!cancelled) setStatus('not-found'); });
    return () => { cancelled = true; };
  }, [profileId, cv.id, setCV]);

  useEffect(() => {
    if (saveState !== 'saving') return;
    const timer = setTimeout(() => {
      profileRepository.save(cv, cv.version)
        .then((saved) => { syncVersion(saved.version, saved.updatedAt); setSaveState('saved'); })
        // TODO(Phase 2): branch on ConcurrencyError to surface a real conflict UI instead of a generic error state.
        .catch(() => setSaveState('error'));
    }, 450);
    return () => clearTimeout(timer);
  }, [cv, saveState, setSaveState, syncVersion]);

  const switchBuilderTab = (next: 'cv' | 'portfolio') => { setMobileTab('edit'); navigate(`/builder/${profileId}/${next}`); };
  const exportJson = () => download(new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' }), 'cv-profile.json');
  const importJson = async (file?: File) => {
    if (!file) return;
    try { const parsed: unknown = JSON.parse(await file.text()); setCV(parsed); setSaveState('saving'); }
    catch (e) { alert(e instanceof Error ? e.message : 'Invalid profile'); }
  };
  const print = () => { document.title = `${cv.settings.fileName || cv.personal.fullName.replaceAll(' ', '_') + '_CV'}`; window.print(); };
  const downloadPDF = () => { if (builderTab !== 'cv') { switchBuilderTab('cv'); setTimeout(print, 120); } else print(); };

  if (status === 'loading') return <main className="route-loading"><p>Loading your CV…</p></main>;
  if (status === 'not-found') return <main className="route-loading"><p>We couldn't find that CV in this browser.</p><button className="primary" onClick={() => navigate('/dashboard')}>Back to dashboard</button></main>;

  return <div className="app">
    <header className="topbar app-ui"><button className="icon-button mobile-only" onClick={() => setMenu(!menu)} aria-label="Open navigation"><Menu /></button><button className="brand-button" onClick={() => navigate('/dashboard')}><Logo /><span>Classic Blue</span></button><div className="document-name"><input aria-label="CV name" value={cv.profileName} onChange={(e) => update((c) => { c.profileName = e.target.value; })} /><span className={`save ${saveState}`}>{saveState === 'saved' ? <Check /> : null}{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Unable to save'}</span></div><div className="top-actions"><button onClick={exportJson}><FileJson />Export profile</button><button onClick={() => jsonRef.current?.click()}><Upload />Import profile</button><button className="primary" onClick={downloadPDF}><Download />Download PDF</button></div><input ref={jsonRef} hidden type="file" accept="application/json" onChange={(e) => importJson(e.target.files?.[0])} /></header>
    <div className="builder-tabs app-ui"><button className={builderTab === 'cv' ? 'active' : ''} onClick={() => switchBuilderTab('cv')}>CV Builder</button><button className={builderTab === 'portfolio' ? 'active' : ''} onClick={() => switchBuilderTab('portfolio')}>My Portfolio</button></div>
    <div className="mobile-tabs app-ui"><button className={mobileTab === 'edit' ? 'active' : ''} onClick={() => setMobileTab('edit')}>Edit</button><button className={mobileTab === 'preview' ? 'active' : ''} onClick={() => setMobileTab('preview')}>Preview</button>{builderTab === 'cv' && <button className={mobileTab === 'theme' ? 'active' : ''} onClick={() => { setMobileTab('theme'); setActiveSection('theme'); }}>Theme</button>}</div>
    <div className="workspace">
      <aside className={`sidebar app-ui ${menu ? 'open' : ''}`}>
        <div className="sidebar-head"><span>{builderTab === 'cv' ? 'CONTENT' : 'PORTFOLIO'}</span><button className="icon-button mobile-only" onClick={() => setMenu(false)}><X /></button></div>
        {builderTab === 'cv'
          ? <nav>{sectionLinks.map((item) => <button key={item.key} className={activeSection === item.key ? 'active' : ''} onClick={() => { setActiveSection(item.key); setMenu(false); }}>{item.label}<span>{count(cv, item.key)}</span></button>)}</nav>
          : <nav>{portfolioSectionLinks.map((item) => <button key={item.key} className={portfolioSection === item.key ? 'active' : ''} onClick={() => { setPortfolioSection(item.key); setMenu(false); }}>{item.label}</button>)}</nav>}
        {builderTab === 'cv'
          ? <div className="sidebar-bottom"><button className={activeSection === 'sections' ? 'active' : ''} onClick={() => setActiveSection('sections')}><LayoutDashboard />Sections</button><button className={activeSection === 'theme' ? 'active' : ''} onClick={() => setActiveSection('theme')}><Palette />Theme & layout</button></div>
          : <div className="sidebar-bottom sidebar-note"><p>Skills and projects are shared from CV Builder. Edit them there — this preview updates automatically.</p></div>}
      </aside>
      <section className={`editor-pane app-ui mobile-${mobileTab}`}>{builderTab === 'cv' ? <Editor /> : <PortfolioEditor />}</section>
      <section className={`preview-pane mobile-${mobileTab}`}>
        <div className="preview-toolbar app-ui">
          {builderTab === 'cv'
            ? <><div className="zoom"><button onClick={() => setZoom(Math.max(.5, zoom - .15))}><Minus /></button><button className="zoom-value" onClick={() => setZoom(.75)}>{Math.round(zoom * 100)}%</button><button onClick={() => setZoom(Math.min(1.25, zoom + .15))}><Plus /></button></div><strong>{pages} {pages === 1 ? 'Page' : 'Pages'}</strong>{pages > 4 && <span className="page-warning">Consider Compact spacing</span>}<button className="primary" onClick={downloadPDF}><Download />Download PDF</button></>
            : <><div className="viewport-switch">{(['desktop', 'tablet', 'mobile'] as const).map((v) => <button key={v} className={portfolioViewport === v ? 'active' : ''} onClick={() => setPortfolioViewport(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div><button className="primary" onClick={downloadPDF}><Download />Download PDF</button></>}
        </div>
        <div className="preview-scroll">
          {builderTab === 'cv'
            ? <CVDocument cv={cv} zoom={zoom} onPageCount={setPages} />
            : <div className={`portfolio-frame viewport-${portfolioViewport}`}><PortfolioPage cv={cv} embedded onDownloadCV={downloadPDF} /></div>}
        </div>
      </section>
    </div>
  </div>;
}
