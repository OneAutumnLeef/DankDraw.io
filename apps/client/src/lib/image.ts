/**
 * Resize an uploaded image to a max bounding box and re-encode as JPEG to keep
 * the data URL under the chat-image size limit. Returns null if the file is
 * not an image or the result is still too big.
 */
export async function shrinkImage(file: File, max = 480, quality = 0.78): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;

  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result ?? ''));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const ratio = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const out = c.toDataURL('image/jpeg', quality);
  if (out.length > 270_000) return null;
  return out;
}
