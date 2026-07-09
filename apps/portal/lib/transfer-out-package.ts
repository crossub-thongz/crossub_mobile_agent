import JSZip from 'jszip';

import { inspectionsApi } from '@/lib/inspections-api';
import { propertyJobDisplayName } from '@/lib/property-portal-documents';
import {
  propertyRegistryApi,
  type PropertyPortalDocument,
  type PropertyPortalDetail,
  type PropertyRecord,
} from '@/lib/property-registry-api';
import type { AgentDocument, Property } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export interface TransferOutPackageInput {
  property: Property;
  receivingAgentEmail: string;
  agentDocuments?: AgentDocument[];
  apiConnected?: boolean;
}

export interface TransferOutPackageResult {
  documentCount: number;
  skippedCount: number;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function safeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '-').trim() || 'document';
}

function extensionFromUrl(url: string, fallback = 'pdf'): string {
  try {
    const pathname = new URL(url, 'http://local').pathname;
    const match = pathname.match(/\.([a-z0-9]{2,5})$/i);
    return match ? match[1].toLowerCase() : fallback;
  } catch {
    return fallback;
  }
}

function propertyAddressKey(property: Property): string {
  return `${property.address}, ${property.suburb}`.toLowerCase();
}

function matchesProperty(doc: AgentDocument, property: Property): boolean {
  const key = propertyAddressKey(property);
  return doc.propertyAddress.toLowerCase().includes(property.address.toLowerCase()) ||
    doc.propertyAddress.toLowerCase() === key;
}

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

function line(label: string, value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '';
  return `<tr><th>${label}</th><td>${String(value)}</td></tr>`;
}

function buildSummaryHtml({
  property,
  receivingAgentEmail,
  record,
  portal,
  includedDocuments,
}: {
  property: Property;
  receivingAgentEmail: string;
  record?: PropertyRecord | null;
  portal?: PropertyPortalDetail | null;
  includedDocuments: { title: string; category: string }[];
}): string {
  const address = propertyJobDisplayName(property);
  const financial = portal?.financial;
  const overview = portal?.overview;
  const rows = [
    line('Address', address),
    line('State', property.state),
    line('Postcode', property.postcode),
    line('Property type', property.propertyType),
    line('Lease status', property.leaseStatus),
    line('Bedrooms', property.bedrooms ?? record?.bedrooms),
    line('Bathrooms', property.bathrooms ?? record?.bathrooms),
    line('Car spaces', property.carSpaces ?? record?.parking),
    line('Furnished', property.furnished == null ? undefined : property.furnished ? 'Yes' : 'No'),
    line('Weekly rent', property.rentWeekly ? formatCurrency(property.rentWeekly) : financial?.currentRentWeekly ? formatCurrency(financial.currentRentWeekly) : undefined),
    line('Bond', property.bondAmount ?? financial?.bondAmount ? formatCurrency(property.bondAmount ?? financial?.bondAmount ?? 0) : undefined),
    line('Deposit', property.depositAmount ?? financial?.depositAmount ? formatCurrency(property.depositAmount ?? financial?.depositAmount ?? 0) : undefined),
    line('Lease start', property.leaseStart ?? overview?.leaseStartDate ?? record?.leaseStartDate ? formatDate(property.leaseStart ?? overview?.leaseStartDate ?? record?.leaseStartDate ?? '') : undefined),
    line('Lease end', property.leaseEnd ? formatDate(property.leaseEnd) : undefined),
    line('Next rent review', property.nextRentReview ? formatDate(property.nextRentReview) : undefined),
    line('Vacate date', overview?.vacateDate ?? record?.vacateDate ? formatDate(overview?.vacateDate ?? record?.vacateDate ?? '') : undefined),
    line('Landlord', property.homeOwnerName ?? record?.landlordName),
    line('Landlord email', property.homeOwnerContact?.email ?? record?.landlordEmail),
    line('Landlord phone', property.homeOwnerContact?.phone ?? record?.landlordPhone),
    line('Tenant', property.tenantName ?? record?.tenantName),
    line('Tenant email', property.tenantContact?.email ?? record?.tenantEmail),
    line('Tenant phone', property.tenantContact?.phone ?? record?.tenantPhone),
    line('Building manager', record?.buildingManagerName ?? overview?.buildingManager?.name),
    line('Building manager email', record?.buildingManagerEmail ?? overview?.buildingManager?.email),
    line('Building manager phone', record?.buildingManagerPhone ?? overview?.buildingManager?.mobile),
    line('Strata contact', record?.strataContactName ?? overview?.strataContact?.name),
    line('Strata email', record?.strataContactEmail ?? overview?.strataContact?.email),
    line('Strata phone', record?.strataContactPhone ?? overview?.strataContact?.mobile),
    line('Management rate', property.managementRatePercent != null ? `${property.managementRatePercent}%` : undefined),
    line('Management GST', property.managementRateGst),
    line('Insurance provider', property.insuranceProvider),
    line('Insurance expiry', property.landlordInsuranceExpiry ? formatDate(property.landlordInsuranceExpiry) : undefined),
    line('Administration fee', property.administrationFee != null ? formatCurrency(property.administrationFee) : undefined),
    line('Documentation fee', property.documentationFee != null ? formatCurrency(property.documentationFee) : undefined),
    line('Letting fee', property.lettingFee != null ? formatCurrency(property.lettingFee) : undefined),
    line('Outstanding rent', financial?.outstandingRent ? formatCurrency(financial.outstandingRent) : portal?.accounting?.outstandingRentAmount ? formatCurrency(portal.accounting.outstandingRentAmount) : undefined),
    line('Receiving agent email', receivingAgentEmail),
    line('Package generated', formatDate(new Date().toISOString())),
  ].filter(Boolean);

  const docList = includedDocuments.length
    ? `<ul>${includedDocuments.map((d) => `<li><strong>${d.category}</strong> — ${d.title}</li>`).join('')}</ul>`
    : '<p>No downloadable files were found on this property profile. Add documents via the property Documents tab or Reports.</p>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Transfer OUT — ${address}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; line-height: 1.5; }
    h1 { font-size: 1.35rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1rem; margin: 1.5rem 0 0.5rem; }
    p.meta { color: #555; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
    th, td { text-align: left; padding: 0.35rem 0.5rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    th { width: 38%; color: #374151; font-weight: 600; }
    ul { padding-left: 1.25rem; }
    @media print { body { margin: 0.75in; } }
  </style>
</head>
<body>
  <h1>Property transfer OUT package</h1>
  <p class="meta">Handover summary for ${address}. Open this file in a browser and use Print → Save as PDF if you need a PDF copy.</p>
  <h2>Property profile</h2>
  <table>${rows.join('')}</table>
  <h2>Included documents (${includedDocuments.length})</h2>
  ${docList}
</body>
</html>`;
}

async function addPortalDocument(
  zip: JSZip,
  doc: PropertyPortalDocument,
  usedNames: Set<string>,
): Promise<boolean> {
  let blob: Blob | null = null;
  let filename = safeFilename(doc.title);

  if (doc.url) {
    blob = await fetchBlob(doc.url);
    if (!filename.includes('.')) {
      filename = `${filename}.${extensionFromUrl(doc.url)}`;
    }
  } else if (doc.inspectionId) {
    try {
      blob = await inspectionsApi.downloadReportPdf(doc.inspectionId);
      if (!filename.toLowerCase().endsWith('.pdf')) {
        filename = `${filename}.pdf`;
      }
    } catch {
      blob = null;
    }
  }

  if (!blob) return false;

  const folder = doc.category.replace(/_/g, '-');
  let path = `documents/${folder}/${filename}`;
  let counter = 1;
  while (usedNames.has(path)) {
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const ext = dot > 0 ? filename.slice(dot) : '';
    path = `documents/${folder}/${stem}-${counter}${ext}`;
    counter += 1;
  }
  usedNames.add(path);
  zip.file(path, blob);
  return true;
}

async function addAgentDocument(
  zip: JSZip,
  doc: AgentDocument,
  usedNames: Set<string>,
): Promise<boolean> {
  const url = doc.downloadUrl ?? doc.href;
  if (!url) return false;
  const blob = await fetchBlob(url);
  if (!blob) return false;

  const folder = doc.category;
  let filename = safeFilename(doc.title);
  if (!filename.includes('.')) {
    filename = `${filename}.${extensionFromUrl(url)}`;
  }
  let path = `documents/${folder}/${filename}`;
  let counter = 1;
  while (usedNames.has(path)) {
    const dot = filename.lastIndexOf('.');
    const stem = dot > 0 ? filename.slice(0, dot) : filename;
    const ext = dot > 0 ? filename.slice(dot) : '';
    path = `documents/${folder}/${stem}-${counter}${ext}`;
    counter += 1;
  }
  usedNames.add(path);
  zip.file(path, blob);
  return true;
}

export async function buildTransferOutPackage(
  input: TransferOutPackageInput,
): Promise<TransferOutPackageResult> {
  const { property, receivingAgentEmail, agentDocuments = [], apiConnected } = input;
  const zip = new JSZip();
  const usedNames = new Set<string>();
  const includedDocuments: { title: string; category: string }[] = [];
  let skippedCount = 0;

  let record: PropertyRecord | null = null;
  let portal: PropertyPortalDetail | null = null;

  if (apiConnected) {
    try {
      [record, portal] = await Promise.all([
        propertyRegistryApi.get(property.id),
        propertyRegistryApi.getPortalDetail(property.id),
      ]);
    } catch {
      // fall back to local property fields
    }
  }

  const portalDocs = portal?.documents ?? [];
  const seenPortalIds = new Set<string>();

  for (const doc of portalDocs) {
    seenPortalIds.add(doc.id);
    const ok = await addPortalDocument(zip, doc, usedNames);
    if (ok) {
      includedDocuments.push({ title: doc.title, category: doc.category });
    } else {
      skippedCount += 1;
    }
  }

  const matchingAgentDocs = agentDocuments.filter((doc) => matchesProperty(doc, property));
  for (const doc of matchingAgentDocs) {
    if (seenPortalIds.has(doc.id)) continue;
    const ok = await addAgentDocument(zip, doc, usedNames);
    if (ok) {
      includedDocuments.push({ title: doc.title, category: doc.category });
    } else {
      skippedCount += 1;
    }
  }

  const summaryHtml = buildSummaryHtml({
    property,
    receivingAgentEmail,
    record,
    portal,
    includedDocuments,
  });
  zip.file('property-transfer-summary.html', summaryHtml);
  zip.file(
    'README.txt',
    [
      `CROSSUB Transfer OUT — ${propertyJobDisplayName(property)}`,
      `Receiving agent: ${receivingAgentEmail}`,
      '',
      'Contents:',
      '- property-transfer-summary.html — open in a browser; use Print → Save as PDF',
      '- documents/ — files from the property profile',
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n'),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const filename = `transfer-out-${slug(propertyJobDisplayName(property)) || 'property'}-${new Date().toISOString().slice(0, 10)}.zip`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);

  return { documentCount: includedDocuments.length, skippedCount };
}
