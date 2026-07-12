import {
  TERMINATION_STAGE,
  terminationStageOrderForCase,
  type TerminationStage,
} from '@/constants/end-leasing';
import { LEASING_ITEM_STATUS, type LeasingItemStatus } from '@/lib/leasing/constants';

import type { TerminationCaseDetail } from '@/lib/end-leasing/types';

const S = LEASING_ITEM_STATUS

export function tenantConfirmationItemStatus(
  detail: TerminationCaseDetail,
): LeasingItemStatus {
  const { agentApproval, tenantConfirmation } = detail
  if (agentApproval.decision === "pending") {
    return S.NOT_STARTED
  }
  if (tenantConfirmation.status === "accepted") {
    return S.DONE
  }
  if (tenantConfirmation.status === "declined") {
    return S.BLOCKED
  }
  return S.IN_PROGRESS
}

export function aggregateStatus(
  statuses: LeasingItemStatus[],
): LeasingItemStatus {
  if (statuses.length === 0) return S.NOT_STARTED
  if (statuses.every((s) => s === S.DONE)) return S.DONE
  if (statuses.some((s) => s === S.BLOCKED)) return S.BLOCKED
  if (statuses.some((s) => s === S.WAITING)) return S.WAITING
  if (statuses.some((s) => s !== S.NOT_STARTED)) return S.IN_PROGRESS
  return S.NOT_STARTED
}

function stageOrderFor(detail: TerminationCaseDetail): TerminationStage[] {
  return terminationStageOrderForCase(detail.terminationType)
}

export function terminationStageIndex(
  detail: TerminationCaseDetail,
  stage: TerminationStage,
): number {
  return stageOrderFor(detail).indexOf(stage)
}

function positionalStatus(
  detail: TerminationCaseDetail,
  stage: TerminationStage,
): LeasingItemStatus {
  const order = stageOrderFor(detail)
  const curIdx = order.indexOf(detail.currentStage)
  const idx = order.indexOf(stage)
  if (idx < 0) return S.NOT_STARTED
  if (curIdx < 0) return S.NOT_STARTED
  if (idx < curIdx) return S.DONE
  if (idx === curIdx) return S.IN_PROGRESS
  return S.NOT_STARTED
}

function terminationNoticeStatus(detail: TerminationCaseDetail): LeasingItemStatus {
  const notice = detail.terminationNotice
  if (!notice?.emailSent) return S.NOT_STARTED
  if (notice.tenantVacateDate) return S.DONE
  return S.IN_PROGRESS
}

export function deriveStageStatus(
  detail: TerminationCaseDetail,
  stage: TerminationStage,
): LeasingItemStatus {
  switch (stage) {
    case TERMINATION_STAGE.TERMINATION_NOTICE:
      return terminationNoticeStatus(detail)
    case TERMINATION_STAGE.KEY_RETURN:
      if (detail.vacate.keysReturned) return S.DONE
      return positionalStatus(detail, stage)
    case TERMINATION_STAGE.OUTGOING_INSPECTION:
      return detail.inspection?.status ?? S.NOT_STARTED
    case TERMINATION_STAGE.MAINTENANCE:
      return detail.makeGood.status
    case TERMINATION_STAGE.BOND:
      return aggregateStatus([
        detail.settlement.status,
        detail.agentApproval.status,
        tenantConfirmationItemStatus(detail),
        detail.bond.status,
      ])
    default:
      return S.NOT_STARTED
  }
}

export function activeStageForCase(
  detail: TerminationCaseDetail,
): TerminationStage {
  return detail.currentStage
}

export function isDeletedTerminationCase(detail: TerminationCaseDetail): boolean {
  return detail.status === "cancelled"
}

export function isLiveTerminationCase(detail: TerminationCaseDetail): boolean {
  return detail.status === "open"
}

export function isSettledTerminationCase(detail: TerminationCaseDetail): boolean {
  return (
    detail.currentStage === TERMINATION_STAGE.BOND &&
    detail.bond.status === S.DONE
  )
}

export function isActiveTerminationCase(detail: TerminationCaseDetail): boolean {
  return isLiveTerminationCase(detail) && !isSettledTerminationCase(detail)
}
