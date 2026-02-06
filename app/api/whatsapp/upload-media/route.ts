/**
 * API: Upload media file for WhatsApp sending
 *
 * POST /api/whatsapp/upload-media (multipart/form-data)
 *
 * Saves file to /public/media/whatsapp/uploads/{uuid}.{ext}
 * Returns the public URL for use with send-media endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'media', 'whatsapp', 'uploads');
const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB

const MEDIA_TYPES: Record<string, string> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/3gpp': 'video',
  'audio/ogg': 'audio',
  'audio/mpeg': 'audio',
  'audio/mp4': 'audio',
  'audio/wav': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
};

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/3gpp': '3gp',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'Arquivo muito grande (max 16MB)' }, { status: 400 });
    }

    // Determine extension and media type
    const ext = MIME_EXTENSIONS[file.type] || file.name.split('.').pop() || 'bin';
    const mediaType = MEDIA_TYPES[file.type] || 'document';

    // Generate unique filename
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.${ext}`;

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(UPLOAD_DIR, filename);
    await writeFile(filePath, buffer);

    // Return public URL (requires NEXT_PUBLIC_APP_URL for Evolution API to fetch)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.WEBHOOK_BASE_URL || '';
    const relativePath = `/media/whatsapp/uploads/${filename}`;
    const absoluteUrl = appUrl ? `${appUrl}${relativePath}` : relativePath;

    return NextResponse.json({
      success: true,
      url: absoluteUrl,
      relativePath,
      mediaType,
      fileName: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error('[Upload Media] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer upload' },
      { status: 500 }
    );
  }
}
