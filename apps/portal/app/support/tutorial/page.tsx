import { redirect } from 'next/navigation';

import { isAgentTutorialModuleId } from '@/constants/agent-module-tutorial';
import { tourHref } from '@/constants/agent-page-tour';

export default async function AgentTutorialPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  if (page && isAgentTutorialModuleId(page)) {
    redirect(tourHref(page));
  }
  redirect(tourHref('properties'));
}
