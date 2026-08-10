export type DocumentPreviewKind = 'pdf' | 'image' | 'none';

export function isViewableDocumentUrl(url?: string | null): url is string {
  if (!url || url === '#') return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('/')
  );
}

export function documentPreviewKindFromFileName(fileName: string): DocumentPreviewKind {
  const path = fileName.toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return 'image';
  return 'none';
}

export function documentPreviewKind(url: string, fileName?: string): DocumentPreviewKind {
  if (fileName) {
    const fromName = documentPreviewKindFromFileName(fileName);
    if (fromName !== 'none') return fromName;
  }
  if (url.startsWith('blob:') && fileName) {
    return documentPreviewKindFromFileName(fileName);
  }
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  if (path.endsWith('.pdf') || url.startsWith('blob:')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path)) return 'image';
  // Assume remote/API URLs without extension are PDFs (common for document storage).
  if (url.startsWith('http://') || url.startsWith('https://')) return 'pdf';
  return 'none';
}
