import { NextResponse, type NextRequest } from 'next/server';

import { isAllowedDocumentPutUrl } from '@/lib/presigned-upload-url';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** Matches the agent document API ceiling. */
const MAX_BYTES = 100 * 1024 * 1024;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as File).arrayBuffer === 'function' &&
    typeof (value as File).size === 'number'
  );
}

/**
 * Same-origin stand-in for a browser PUT to object storage.
 * The Documents tab is opened from origins the bucket CORS list does not include
 * (this host is plain HTTP on a public IP). The browser PUT then fails before any
 * byte is stored. This route sends the raw file server-side with the same
 * Content-Type the presigned URL was signed with.
 */
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ message: 'Upload body could not be read' }, { status: 400 });
  }

  const uploadUrl = form.get('uploadUrl');
  const contentType = form.get('contentType');
  const file = form.get('file');

  if (typeof uploadUrl !== 'string' || !isAllowedDocumentPutUrl(uploadUrl)) {
    return NextResponse.json({ message: 'Upload target is not allowed' }, { status: 400 });
  }
  if (typeof contentType !== 'string' || !contentType.trim() || contentType.length > 150) {
    return NextResponse.json({ message: 'Missing file type' }, { status: 400 });
  }
  if (!isUploadFile(file) || file.size < 1) {
    return NextResponse.json({ message: 'The file is empty' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: 'File exceeds the 100 MB limit' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  let upstream: Response;
  try {
    upstream = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: bytes,
      redirect: 'manual',
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    return NextResponse.json({ message: 'Could not store the file' }, { status: 502 });
  }

  if (upstream.status < 200 || upstream.status >= 300) {
    return NextResponse.json(
      { message: `Could not store the file (${upstream.status})` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
