import type { DocumentChecklistId } from '@/lib/leasing-workflows/constants';
import {
  NEW_PROPERTY_DOCUMENT_CHECKLIST,
  TRANSFER_IN_DOCUMENT_CHECKLIST,
} from '@/lib/leasing-workflows/constants';

export type PmsSource = 'propertyme' | 'propertytree' | 'crossub' | 'unknown';

export interface PmsImportManifest {
  source?: PmsSource;
  address?: string;
  suburb?: string;
  rentWeekly?: number;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  bondAmount?: number;
  homeOwnerName?: string;
  homeOwnerEmail?: string;
  homeOwnerPhone?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  managementRatePercent?: number;
  insuranceProvider?: string;
  propertyType?: string;
}

export interface PropertyImportResult {
  source: PmsSource;
  manifest?: PmsImportManifest;
  matchedDocuments: Partial<Record<DocumentChecklistId, string[]>>;
  unmatchedFiles: string[];
  prefill: Partial<PmsImportManifest>;
}

const PMS_HINTS: { source: PmsSource; patterns: RegExp[] }[] = [
  {
    source: 'propertyme',
    patterns: [/propertyme/i, /property.?me/i, /pm-export/i, /pm_manifest/i],
  },
  {
    source: 'propertytree',
    patterns: [/propertytree/i, /property.?tree/i, /pt-export/i, /pt_manifest/i],
  },
];

function detectSourceFromNames(names: string[]): PmsSource {
  const joined = names.join(' ');
  for (const hint of PMS_HINTS) {
    if (hint.patterns.some((p) => p.test(joined))) return hint.source;
  }
  return 'unknown';
}

function matchChecklistId(
  fileName: string,
  checklist = [...TRANSFER_IN_DOCUMENT_CHECKLIST, ...NEW_PROPERTY_DOCUMENT_CHECKLIST],
): DocumentChecklistId | null {
  for (const item of checklist) {
    if (item.filePatterns.some((p) => p.test(fileName))) return item.id;
  }
  return null;
}

async function readManifest(files: File[]): Promise<PmsImportManifest | undefined> {
  const manifestFile = files.find((f) =>
    /manifest\.json$/i.test(f.name) ||
    /propertyme.*\.json$/i.test(f.name) ||
    /propertytree.*\.json$/i.test(f.name) ||
    /crossub-import\.json$/i.test(f.name),
  );
  if (!manifestFile) return undefined;
  try {
    const text = await manifestFile.text();
    return JSON.parse(text) as PmsImportManifest;
  } catch {
    return undefined;
  }
}

/** Parse a PropertyMe / PropertyTree export folder or multi-file selection. */
export async function parsePmsPackage(files: File[]): Promise<PropertyImportResult> {
  const names = files.map((f) => f.name);
  const manifest = await readManifest(files);
  const source =
    manifest?.source ??
    detectSourceFromNames(names);

  const matchedDocuments: Partial<Record<DocumentChecklistId, string[]>> = {};
  const unmatchedFiles: string[] = [];

  for (const file of files) {
    if (/\.json$/i.test(file.name) && /manifest|import/i.test(file.name)) continue;
    const id = matchChecklistId(file.name);
    if (id) {
      matchedDocuments[id] = [...(matchedDocuments[id] ?? []), file.name];
    } else {
      unmatchedFiles.push(file.name);
    }
  }

  const prefill: Partial<PmsImportManifest> = { ...manifest };

  if (!prefill.address) {
    const addressFile = files.find((f) => /address|property.*\.csv$/i.test(f.name));
    if (addressFile) {
      try {
        const line = (await addressFile.text()).split('\n').find((l) => l.trim().length > 3);
        if (line) {
          const parts = line.split(',');
          prefill.address = parts[0]?.trim();
          prefill.suburb = parts[1]?.trim();
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return { source, manifest, matchedDocuments, unmatchedFiles, prefill };
}

export function pmsSourceLabel(source: PmsSource): string {
  switch (source) {
    case 'propertyme':
      return 'PropertyMe';
    case 'propertytree':
      return 'PropertyTree';
    case 'crossub':
      return 'CROSSUB export';
    default:
      return 'Unknown source';
  }
}
