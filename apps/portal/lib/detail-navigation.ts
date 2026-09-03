import { propertyDetail, propertyLeasingWorkflow, ROUTES } from '@/constants/routes';

export type DetailNavContext = {
  from?: 'property' | 'leasing' | 'leasing-workflow' | 'tasks' | 'dashboard';
  propertyId?: string;
  tab?: string;
};

export function appendDetailNavContext(path: string, ctx?: DetailNavContext): string {
  if (!ctx?.from) return path;
  const params = new URLSearchParams();
  params.set('from', ctx.from);
  if (ctx.propertyId) params.set('propertyId', ctx.propertyId);
  if (ctx.tab) params.set('tab', ctx.tab);
  return `${path}?${params.toString()}`;
}

export function fromProperty(propertyId: string, tab?: string): DetailNavContext {
  return { from: 'property', propertyId, tab };
}

export function fromLeasing(tab?: string): DetailNavContext {
  return { from: 'leasing', tab };
}

export function fromLeasingWorkflow(propertyId: string): DetailNavContext {
  return { from: 'leasing-workflow', propertyId };
}

export function fromTasks(): DetailNavContext {
  return { from: 'tasks' };
}

export function fromDashboard(): DetailNavContext {
  return { from: 'dashboard' };
}

export function resolveBackNavigation(
  searchParams: Pick<URLSearchParams, 'get'>,
  fallback: { href: string; label: string },
): { href: string; label: string } {
  const from = searchParams.get('from');
  const propertyId = searchParams.get('propertyId');
  const tab = searchParams.get('tab');

  if (from === 'property' && propertyId) {
    const base = propertyDetail(propertyId);
    const href = tab ? `${base}?tab=${encodeURIComponent(tab)}` : base;
    return { href, label: 'Property' };
  }
  if (from === 'leasing') {
    return { href: `${ROUTES.TASKS}?filter=Leasing`, label: 'Tasks' };
  }
  if (from === 'leasing-workflow' && propertyId) {
    return { href: propertyLeasingWorkflow(propertyId), label: 'Leasing workflow' };
  }
  if (from === 'tasks') {
    return { href: ROUTES.TASKS, label: 'Tasks' };
  }
  if (from === 'dashboard') {
    return { href: ROUTES.DASHBOARD, label: 'Dashboard' };
  }
  return fallback;
}
