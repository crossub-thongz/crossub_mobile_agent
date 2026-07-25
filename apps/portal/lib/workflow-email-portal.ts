import {
  EMAIL_CTA_BUTTON_STYLE,
  EMAIL_CTA_MARKER,
} from '@/lib/workflow-email-cta';

const PORTAL_URL_PATTERN =
  /crossub-mobile-(tenant|landlord|inspector|agent)|localhost:3002/i;

const PORTAL_RECIPIENT_ROLES = new Set(['tenant', 'landlord', 'inspector', 'agent']);

const AGENT_CTA_PARAGRAPH =
  /<p\b[^>]*>\s*<a\b[^>]*crossub-email-cta[^>]*>[\s\S]*?<\/a>\s*<\/p>\s*/gi;

const ADMIN_PORTAL_URL = /crossub-web|localhost:3000/i;

function emailCtaButton(href: string, label: string): string {
  return `<a href="${href}" class="${EMAIL_CTA_MARKER}" style="${EMAIL_CTA_BUTTON_STYLE}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function emailCtaButtonParagraph(innerHtml: string): string {
  return `<p style="margin:16px 0;">${innerHtml}</p>`;
}

function portalCtaLabelFromUrl(href: string): string {
  if (/landlord/i.test(href)) return 'Open Landlord (Mobile)';
  if (/inspector/i.test(href)) return 'Open Inspector (Mobile)';
  if (/tenant/i.test(href)) return 'Open Tenant (Mobile)';
  if (/agent/i.test(href)) return 'Open Agent Portal';
  return 'Open portal';
}

export function upgradePortalLinksToCtaButtons(content: string): string {
  return content.replace(
    /<a\b(?![^>]*crossub-email-cta)([^>]*?)href="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/gi,
    (match, _before, href, _after, inner) => {
      if (ADMIN_PORTAL_URL.test(href)) return match;
      if (!PORTAL_URL_PATTERN.test(href)) return match;
      const label = inner.replace(/<[^>]+>/g, '').trim();
      const buttonLabel =
        label && !/^https?:\/\//i.test(label) ? label : portalCtaLabelFromUrl(href);
      return emailCtaButtonParagraph(emailCtaButton(href, buttonLabel));
    },
  );
}

function bodyHasPortalCta(content: string): boolean {
  return (
    content.includes(EMAIL_CTA_MARKER) ||
    /Click below to open (Tenant|Landlord|Inspector|Agent)/i.test(content)
  );
}

function stripLegacyPortalFooterIntro(content: string): string {
  return content
    .replace(/\n*Open the (tenant|landlord|inspector) portal[^\n]*:\n*/gi, '\n')
    .replace(/\n*Click below to open (Tenant|Landlord|Inspector|Agent)[^\n]*:\n*/gi, '\n')
    .trimEnd();
}

function stripAgentPortalFooterBlocks(content: string): string {
  return content
    .replace(/\n*Click below to open Agent:\s*/gi, '\n')
    .replace(AGENT_CTA_PARAGRAPH, '')
    .replace(/\n*Open Agent \((Mobile|Desktop|Portal)\)[^\n]*/gi, '')
    .trimEnd();
}

function renderedAgentPortalLinkFooter(agentAppUrl: string): string {
  const url = agentAppUrl.trim();
  if (!url) return '';
  return `\n\nClick below to open Agent:\n${emailCtaButtonParagraph(emailCtaButton(url, 'Open Agent Portal'))}`;
}

function normalizeAgentPortalFooter(
  bodyText: string,
  sampleVariables: Record<string, string>,
): string {
  const agentUrl = (sampleVariables.agentAppUrl ?? '').trim();
  const stripped = stripAgentPortalFooterBlocks(bodyText);
  if (!agentUrl) return stripped;
  return `${stripped}${renderedAgentPortalLinkFooter(agentUrl)}`;
}

function renderedWorkflowPortalLinkFooter(
  role: string,
  variables: Record<string, string>,
): string {
  const labels: Record<string, string> = {
    tenant: 'Tenant',
    landlord: 'Landlord',
    inspector: 'Inspector',
  };
  const urlKeys: Record<string, string> = {
    tenant: 'tenantAppUrl',
    landlord: 'landlordAppUrl',
    inspector: 'inspectorAppUrl',
  };
  const label = labels[role] ?? 'Portal';
  const url = variables[urlKeys[role] ?? ''] ?? '';
  return `\n\nClick below to open ${label} (Mobile):\n${emailCtaButtonParagraph(emailCtaButton(url, `Open ${label} (Mobile)`))}`;
}

/** Mirror API send pipeline for deliverable preview. */
export function prepareWorkflowEmailBodyForPreview(
  bodyText: string,
  recipientRole?: string,
  sampleVariables: Record<string, string> = {},
): string {
  let prepared = upgradePortalLinksToCtaButtons(bodyText);
  if (recipientRole && PORTAL_RECIPIENT_ROLES.has(recipientRole)) {
    prepared = stripLegacyPortalFooterIntro(prepared);
    if (recipientRole === 'agent') {
      prepared = normalizeAgentPortalFooter(prepared, sampleVariables);
    } else if (!bodyHasPortalCta(prepared)) {
      prepared = `${prepared}${renderedWorkflowPortalLinkFooter(recipientRole, sampleVariables)}`;
    }
  }
  return prepared;
}
