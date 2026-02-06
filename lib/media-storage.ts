/**
 * Media Storage — Download Evolution API media to local filesystem.
 *
 * Evolution API media URLs are temporary (~1h). We download them immediately
 * and serve from our own domain for permanent access.
 *
 * Storage: /public/media/whatsapp/{instanceName}/{messageId}.{ext}
 * Served:  /media/whatsapp/{instanceName}/{messageId}.{ext}
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'public', 'media', 'whatsapp');

// Max sizes per media type
const MAX_SIZES: Record<string, number> = {
  image: 16 * 1024 * 1024,    // 16MB
  video: 64 * 1024 * 1024,    // 64MB
  audio: 8 * 1024 * 1024,     // 8MB
  document: 64 * 1024 * 1024, // 64MB
  sticker: 1 * 1024 * 1024,   // 1MB
};

// Mimetype → extension mapping
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/ogg; codecs=opus': 'ogg',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function getExtension(mimetype: string | null, fallback = 'bin'): string {
  if (!mimetype) return fallback;
  return MIME_EXTENSIONS[mimetype] || mimetype.split('/').pop()?.split(';')[0] || fallback;
}

function getMediaCategory(mimetype: string | null): string {
  if (!mimetype) return 'document';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('webp') || mimetype.includes('sticker')) return 'sticker';
  return 'document';
}

/**
 * Download media from Evolution API URL and store locally.
 * Returns the public-facing relative URL path.
 */
export async function downloadAndStoreMedia(
  instanceName: string,
  messageId: string,
  url: string,
  mimetype: string | null
): Promise<string | null> {
  try {
    const ext = getExtension(mimetype);
    const category = getMediaCategory(mimetype);
    const maxSize = MAX_SIZES[category] || MAX_SIZES.document;

    // Sanitize instanceName and messageId for filesystem safety
    const safeInstance = instanceName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeMessageId = messageId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const dir = path.join(BASE_DIR, safeInstance);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const filename = `${safeMessageId}.${ext}`;
    const filePath = path.join(dir, filename);

    // Skip if already downloaded
    if (existsSync(filePath)) {
      return `/media/whatsapp/${safeInstance}/${filename}`;
    }

    // Download with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[MediaStorage] Download failed: HTTP ${response.status} for ${url}`);
      return null;
    }

    // Check size from headers
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength > maxSize) {
      console.warn(`[MediaStorage] File too large: ${contentLength} bytes (max ${maxSize})`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Double check actual size
    if (buffer.length > maxSize) {
      console.warn(`[MediaStorage] Downloaded file too large: ${buffer.length} bytes`);
      return null;
    }

    await writeFile(filePath, buffer);

    const publicPath = `/media/whatsapp/${safeInstance}/${filename}`;
    console.log(`[MediaStorage] Saved: ${publicPath} (${buffer.length} bytes)`);
    return publicPath;
  } catch (err: any) {
    console.error(`[MediaStorage] Error downloading media:`, err.message);
    return null;
  }
}
