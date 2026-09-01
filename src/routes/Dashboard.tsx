import { useEffect, useRef, useState } from 'react';
import { LogOut, Plus, Search, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ImportResult } from '../lib/importCV';
import { profileRepository } from '../lib/activeRepository';
import { useAuthStore } from '../store/useAuthStore';
import { useCVStore } from '../store/useCVStore';
import { USE_API } from './AuthGate';
import { ImportReview, Logo, relative, useProfileActions } from './shared';

export function Dashboard() {
  const navigate = useNavigate();
  const { cv, profiles, setProfiles, setSaveState } = useCVStore();
  const { create, duplicate, remove, openExisting, createAndOpen, importDocument } = useProfileActions();
  const { user, logout } = useAuthStore();
  const [search, setSearch] = useState('');
  const [review, setReview] = useState<ImportResult | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => { profileRepository.list().then(setProfiles).catch(() => setSaveState('error')); }, [setProfiles, setSaveState]);
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };

  const onUpload = async (file?: File) => {
    if (!file) return;
    try { setReview(await importDocument(file)); }
    catch (error) { alert(`Could not read this document: ${error instanceof Error ? error.message : 'Unknown error'}`); }
  };
  const acceptImport = () => { if (!review) return; const draft = review.draft; setReview(null); createAndOpen(draft); };

  return <main className="dashboard">
    <header className="dashboard-header">
      <div className="brand"><Logo /> Classic Blue</div>
      <button onClick={() => navigate(`/builder/${cv.id}/cv`)}>Open editor</button>
      {USE_API && user && <span className="dashboard-user">{user.email}</span>}
      {USE_API && user ? <button className="icon-button" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut /></button> : <div className="avatar">JG</div>}
    </header>
    <div className="dashboard-content">
      <div className="dash-title"><div><p>Good afternoon</p><h1>My CVs</h1></div><div className="dash-actions"><button className="secondary" onClick={() => uploadRef.current?.click()}><Upload />Upload CV</button><button className="primary" onClick={create}><Plus />New CV</button></div></div>
      <label className="search"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search profiles, roles, or skills" /></label>
      <div className="profile-grid">{profiles.filter((p) => JSON.stringify(p).toLowerCase().includes(search.toLowerCase())).map((profile) => <article className="profile-card" key={profile.id}>
        <div className="mini-page"><span>JG</span></div>
        <div><h2>{profile.profileName}</h2><p>Updated {relative(profile.updatedAt)}</p><span>Classic Blue</span></div>
        <div className="profile-actions">
          <button onClick={() => openExisting(profile)}>Open</button>
          <button onClick={() => duplicate(profile)}>Duplicate</button>
          <button className="danger" onClick={async () => { if (confirm('Delete this CV? This cannot be undone.')) await remove(profile.id); }}>Delete</button>
        </div>
      </article>)}</div>
    </div>
    <input ref={uploadRef} hidden type="file" accept=".pdf,.docx" onChange={(e) => onUpload(e.target.files?.[0])} />
    {review && <ImportReview result={review} onCancel={() => setReview(null)} onAccept={acceptImport} />}
  </main>;
}
