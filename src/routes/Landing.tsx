import { useRef, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import type { ImportResult } from '../lib/importCV';
import { ImportReview, Logo, useProfileActions } from './shared';

export function Landing() {
  const { create, createAndOpen, importDocument } = useProfileActions();
  const [review, setReview] = useState<ImportResult | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const onUpload = async (file?: File) => {
    if (!file) return;
    try { setReview(await importDocument(file)); }
    catch (error) { alert(`Could not read this document: ${error instanceof Error ? error.message : 'Unknown error'}`); }
  };
  const acceptImport = () => { if (!review) return; const draft = review.draft; setReview(null); createAndOpen(draft); };

  return <main className="landing">
    <div className="brand"><Logo /> Classic Blue</div>
    <div className="hero">
      <span>LAYOUT-LOCKED CV BUILDER</span>
      <h1>Your CV, without redesigning it every time.</h1>
      <p>Update your experience, skills and achievements. Your polished layout takes care of itself.</p>
      <div>
        <button className="primary large" onClick={create}>Create CV <Plus /></button>
        <button className="secondary large" onClick={() => uploadRef.current?.click()}>Upload existing CV <Upload /></button>
      </div>
      <small>Private by design · Your data stays in this browser</small>
    </div>
    <input ref={uploadRef} hidden type="file" accept=".pdf,.docx" onChange={(e) => onUpload(e.target.files?.[0])} />
    {review && <ImportReview result={review} onCancel={() => setReview(null)} onAccept={acceptImport} />}
  </main>;
}
