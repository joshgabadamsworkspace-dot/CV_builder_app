const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Reads a local image file into a data URL for local/offline preview and storage.
 *  Phase 2 (cloud storage) replaces this with an upload to object storage and a
 *  stored asset reference instead of embedding base64 in CVData — see
 *  docs/portfolio/IMPLEMENTATION_PLAN.md section 6.2. */
export function readImageFile(file: File, maxBytes = 4_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_TYPES.includes(file.type)) { reject(new Error('Please choose a JPEG, PNG, or WebP image.')); return; }
    if (file.size > maxBytes) { reject(new Error(`Image is too large. Please choose a file under ${Math.round(maxBytes / 1_000_000)}MB.`)); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
}
