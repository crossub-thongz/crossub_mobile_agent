/**
 * Fixture jobs for the quote-stage updates.
 * Run: npx tsx scripts/maintenance-quote-stage-fixtures.ts
 *
 * Each record is the workspace the task page reads after detail load.
 * The quote card is shown only when the current stage is quote.
 */
import { maintenanceWorkspaceStage } from '../components/agent/self-managed-task/maintenance-stage-workspace';
import type { MaintenanceWorkspaceCase } from '../lib/maintenance-workspace/types';

type QuoteStatus = MaintenanceWorkspaceCase['quotations'][number]['status'];

type Fixture = {
  id: string;
  title: string;
  status: MaintenanceWorkspaceCase['status'];
  responsibility: MaintenanceWorkspaceCase['responsibility'];
  quotes: QuoteStatus[];
  expectStage: string;
  expectQuoteOffer: boolean;
};

const FIXTURES: Fixture[] = [
  {
    id: 'M-assessment',
    title: '刚报修，Assessment 还没做完',
    status: 'under_review',
    responsibility: 'landlord',
    quotes: [],
    expectStage: 'review',
    expectQuoteOffer: false,
  },
  {
    id: 'M-enter-quote',
    title: 'Assessment 刚结束，进入 Quote，还没有供应商报价',
    status: 'pending_quotation',
    responsibility: 'landlord',
    quotes: [],
    expectStage: 'quote',
    expectQuoteOffer: true,
  },
  {
    id: 'M-quoting-label',
    title: '列表状态被收成待审批，但一份报价都没有',
    status: 'pending_approval',
    responsibility: 'landlord',
    quotes: [],
    expectStage: 'quote',
    expectQuoteOffer: true,
  },
  {
    id: 'M-declined-only',
    title: '只剩被拒绝的报价，仍在收报价',
    status: 'pending_approval',
    responsibility: 'landlord',
    quotes: ['declined'],
    expectStage: 'quote',
    expectQuoteOffer: true,
  },
  {
    id: 'M-quote-in',
    title: '供应商已回价，进入 Approval',
    status: 'pending_approval',
    responsibility: 'landlord',
    quotes: ['submitted'],
    expectStage: 'approval',
    expectQuoteOffer: false,
  },
  {
    id: 'M-approved-quote',
    title: '报价已批准，进入施工',
    status: 'in_progress',
    responsibility: 'landlord',
    quotes: ['approved'],
    expectStage: 'progress',
    expectQuoteOffer: false,
  },
  {
    id: 'M-tenant',
    title: '租客负责，时间线没有 Quote',
    status: 'pending_quotation',
    responsibility: 'tenant',
    quotes: [],
    expectStage: 'review',
    expectQuoteOffer: false,
  },
  {
    id: 'M-done',
    title: '工单已完成',
    status: 'completed',
    responsibility: 'landlord',
    quotes: ['approved'],
    expectStage: 'done',
    expectQuoteOffer: false,
  },
];

function workspace(fixture: Fixture): Pick<
  MaintenanceWorkspaceCase,
  'status' | 'responsibility' | 'quotations'
> {
  return {
    status: fixture.status,
    responsibility: fixture.responsibility,
    quotations: fixture.quotes.map((status, index) => ({
      id: `${fixture.id}-q${index}`,
      maintenanceRequestId: fixture.id,
      contractorId: `contractor-${index}`,
      price: 180,
      currency: 'AUD',
      scope: 'Replace the tap washer',
      availableSchedule: '2026-11-08',
      submittedAt: '2026-11-01T06:00:00.000Z',
      status,
    })),
  };
}

const stageLabel: Record<string, string> = {
  created: 'Reported',
  review: 'Assessment',
  quote: 'Quote',
  approval: 'Approval',
  progress: 'Work',
  done: 'Completed',
};

let failed = 0;
const lines: string[] = [];

for (const fixture of FIXTURES) {
  const stage = maintenanceWorkspaceStage(workspace(fixture));
  const offer = stage === 'quote';
  const ok = stage === fixture.expectStage && offer === fixture.expectQuoteOffer;
  if (!ok) failed += 1;
  lines.push(
    [
      ok ? 'PASS' : 'FAIL',
      fixture.id,
      stageLabel[stage] ?? stage,
      offer ? 'show Crossub quote card' : 'hide Crossub quote card',
      fixture.title,
    ].join(' | '),
  );
}

console.log(lines.join('\n'));
console.log(failed === 0 ? `\n${FIXTURES.length} records passed` : `\n${failed} records failed`);
process.exit(failed === 0 ? 0 : 1);
