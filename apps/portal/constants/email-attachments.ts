/** Labels for received-email files. Signature images stay behind one control. */
export const EMAIL_ATTACHMENT_COPY = {
  showSignatureFiles: (count: number) =>
    count === 1 ? 'Show 1 signature file' : `Show ${count} signature files`,
  hideSignatureFiles: 'Hide signature files',
  kindPdf: 'PDF',
  kindDoc: 'DOC',
  kindSheet: 'SHEET',
  kindImage: 'Image',
} as const;

export const EMAIL_IMAGE_MIME_PREFIX = 'image/';
export const EMAIL_PDF_MIME = 'application/pdf';

/** Outlook and mail apps name embedded signature images like this, not like a file the sender attached. */
export const EMAIL_SIGNATURE_IMAGE_STEM =
  /^(attachment|att|file)[-_\s]?\d+$|^image\d*$|^(logo|signature|icon|banner|spacer|pixel|blank|noname|untitled)([-_.][a-z0-9]+)?$|^~wrd\d*$/;

/** Short names that are a logo or a social icon, with no spaces. */
export const EMAIL_SIGNATURE_IMAGE_WORD = /logo|signature|spacer|pixel|banner|facebook|instagram|linkedin|twitter|youtube|tiktok/;

export const EMAIL_SIGNATURE_JUNK_FILE = /^(oledata\.mso|winmail\.dat)$/i;

export const EMAIL_IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'tif',
  'tiff',
] as const;
