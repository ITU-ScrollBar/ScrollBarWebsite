import * as Firebase from 'firebase-admin/firestore';
import { getDownloadURL, getStorage } from 'firebase-admin/storage';
import decodeHeic from 'heic-decode';
import sharp from 'sharp';

// Same size and format the cropper in src/components/UserAvatar.tsx uploads.
const SIZE = 256;

// libheif applies the HEIC rotation while decoding, so the raw pixels are already upright.
const fromHeic = async (buffer: Buffer) => {
  const { width, height, data } = await decodeHeic({ buffer });
  return sharp(data, { raw: { width, height, channels: 4 } });
};

// Re-runs skip pictures that are already small WebP files, so running it more
// than once per Firebase project is harmless.
// Originals are left in place unless one already lives at the target path.
export default async function ({ db }: { db: Firebase.Firestore }) {
  const snapshot = await db.collection('users').get();
  let downscaled = 0;
  const cleared: string[] = [];
  const failed: string[] = [];

  for (const doc of snapshot.docs) {
    const { photoUrl, email } = doc.data();
    // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded path>?alt=media&token=...
    const match = typeof photoUrl === 'string' && photoUrl.match(/\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (!match || !email) continue;

    try {
      const bucket = getStorage().bucket(match[1]);
      const original = bucket.file(decodeURIComponent(match[2]));
      const [{ contentType, metadata }] = await original.getMetadata();

      // An <img> can't show a video, so these were already broken avatars; skip the
      // download and show the default avatar. The file stays in Storage.
      if (contentType?.startsWith('video/') || /\.mov$/i.test(original.name)) {
        await doc.ref.update({ photoUrl: '' });
        cleared.push(`${doc.id}: ${photoUrl}`);
        continue;
      }

      const [buffer] = await original.download();
      const { format, compression, width = 0, height = 0 } = await sharp(buffer).metadata();
      if (format === 'webp' && width <= SIZE && height <= SIZE) continue;

      // SVGs rasterize at 72 DPI (their nominal size, often ~100px); pick the DPI that renders SIZE px instead.
      const density = format === 'svg' ? Math.ceil((72 * SIZE) / Math.min(width, height)) : undefined;
      // sharp's bundled libheif only decodes AVIF, so iPhone HEIC photos go through heic-decode.
      const image = compression === 'hevc' ? await fromHeic(buffer) : sharp(buffer, { density });
      const resized = await image
        .rotate() // apply EXIF orientation before metadata is stripped
        .resize(SIZE, SIZE, { fit: 'cover', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();

      // Copying the custom metadata keeps uploadedBy and the download token.
      const target = bucket.file(`profile_pictures/${email}.webp`);
      await target.save(resized, { contentType: 'image/webp', metadata: { metadata } });

      // Per-doc update right after its upload, so a crash never leaves a URL pointing at nothing.
      await doc.ref.update({ photoUrl: await getDownloadURL(target) });
      downscaled++;
    } catch (error) {
      failed.push(`${doc.id}: ${error}`);
    }
  }

  console.log(`Downscaled ${downscaled} profile pictures.`);
  if (cleared.length) console.log(`Reset ${cleared.length} video "pictures" to the default avatar:\n${cleared.join('\n')}`);
  if (failed.length) console.warn(`Left ${failed.length} unchanged:\n${failed.join('\n')}`);
}
