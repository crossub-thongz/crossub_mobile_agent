'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import { notificationHrefToJobRow } from '@/lib/notification-navigation';
import { useAgentStore } from '@/lib/store';
import type { AgentNotification } from '@/lib/types';

type AgentNotificationDialogContextValue = {
  /** Open the portfolio case popup for this notification when the href maps to a case row. */
  openNotification: (notification: Pick<AgentNotification, 'href'>) => boolean;
  openNotificationHref: (href: string) => boolean;
};

const AgentNotificationDialogContext =
  createContext<AgentNotificationDialogContextValue | null>(null);

export function AgentNotificationDialogProvider({ children }: { children: ReactNode }) {
  const agentData = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);
  const { selectedJob, openJob, closeJob } = usePortfolioCaseDialog();

  const portfolioData = useMemo(
    () => ({
      properties: agentData.properties,
      maintenanceAll: agentData.maintenanceAll,
      inspections: agentData.inspections,
      rentReviews: agentData.rentReviews,
      tenantSelections: agentData.tenantSelections,
      tribunalCases: agentData.tribunalCases,
      vacating: agentData.vacating,
      accounting: agentData.accounting,
      leasingCycles: agentData.leasingCycles,
      leasingRecords: agentData.leasingRecords,
      rentReviewDecisions,
    }),
    [agentData, rentReviewDecisions],
  );

  const openNotificationHref = useCallback(
    (href: string) => {
      const job = notificationHrefToJobRow(href, portfolioData);
      if (!job) return false;
      openJob(job);
      return true;
    },
    [openJob, portfolioData],
  );

  const openNotification = useCallback(
    (notification: Pick<AgentNotification, 'href'>) =>
      openNotificationHref(notification.href),
    [openNotificationHref],
  );

  const value = useMemo(
    () => ({ openNotification, openNotificationHref }),
    [openNotification, openNotificationHref],
  );

  return (
    <AgentNotificationDialogContext.Provider value={value}>
      {children}
      <PortfolioCaseDialogHost
        job={selectedJob}
        onClose={closeJob}
        onOpenJob={openJob}
      />
    </AgentNotificationDialogContext.Provider>
  );
}

export function useAgentNotificationDialog(): AgentNotificationDialogContextValue {
  const ctx = useContext(AgentNotificationDialogContext);
  if (!ctx) {
    throw new Error(
      'useAgentNotificationDialog must be used within AgentNotificationDialogProvider',
    );
  }
  return ctx;
}
