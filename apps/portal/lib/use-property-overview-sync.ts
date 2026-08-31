'use client';

import { useCallback, useEffect, useState } from 'react';

import { fetchLeasingCycleView } from '@/lib/leasing/fetch-leasing-cycle';
import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';
import {
  listPropertyContacts,
  type AgentPropertyContact,
} from '@/lib/crossub-api/agent-client';
import { resolvePropertyTenantContact, type PropertyTenantContact } from '@/lib/property-form-prefill';
import type { LeasingCycle, LeasingRecord, Property, TenantSelectionCase } from '@/lib/types';
import {
  propertyRegistryApi,
  type PropertyPortalAccounting,
  type PropertyPortalFinancial,
  type PropertyPortalOverview,
  type PropertyRecord,
} from '@/lib/property-registry-api';
import { useLivePoll } from '@/lib/use-live-poll';

export interface PropertyBondSnapshot {
  agentLink: string | null;
  ledgerEntryId: string | null;
  lodgementRef: string | null;
  amount: number | null;
  status: string | null;
  paidAt: string | null;
  sentToTenantAt: string | null;
}

export interface PropertyOverviewSync {
  record: PropertyRecord | null;
  overview: PropertyPortalOverview | null;
  financial: PropertyPortalFinancial | null;
  accounting: PropertyPortalAccounting | null;
  bond: PropertyBondSnapshot | null;
  keyFobCount: number | null;
  tenantContact: PropertyTenantContact | null;
  tenantContacts: AgentPropertyContact[];
  loading: boolean;
}

const EMPTY: PropertyOverviewSync = {
  record: null,
  overview: null,
  financial: null,
  accounting: null,
  bond: null,
  keyFobCount: null,
  tenantContact: null,
  tenantContacts: [],
  loading: false,
};

function bondFromCycleView(
  cycleView: ServerLeasingCycleView,
  portalFinancialBond: number | null,
): PropertyBondSnapshot {
  const bondBlock = cycleView.onboarding?.bond;
  return {
    agentLink: bondBlock?.agentLink ?? null,
    ledgerEntryId: bondBlock?.ledgerEntryId ?? null,
    lodgementRef: bondBlock?.lodgementRef ?? null,
    amount: cycleView.rental.bond ?? portalFinancialBond,
    status: bondBlock?.status ?? null,
    paidAt: bondBlock?.paidAt ?? null,
    sentToTenantAt: bondBlock?.sentToTenantAt ?? null,
  };
}

export function usePropertyOverviewSync(
  property: Property,
  apiConnected: boolean,
  leasingCycle?: LeasingCycle,
  tenantSelections?: TenantSelectionCase[],
  currentLease?: LeasingRecord,
): PropertyOverviewSync {
  const propertyId = property.id;
  const [state, setState] = useState<PropertyOverviewSync>(EMPTY);
  const [cycleView, setCycleView] = useState<ServerLeasingCycleView | null>(null);

  useEffect(() => {
    if (!apiConnected || !leasingCycle?.id) {
      setCycleView(null);
      return;
    }

    let cancelled = false;
    void fetchLeasingCycleView(leasingCycle.id)
      .then((view) => {
        if (!cancelled) setCycleView(view);
      })
      .catch(() => {
        if (!cancelled) setCycleView(null);
      });

    return () => {
      cancelled = true;
    };
  }, [apiConnected, leasingCycle?.id]);

  const sync = useCallback(async () => {
    if (!apiConnected) {
      setState(EMPTY);
      return;
    }
    setState((prev) => ({ ...prev, loading: prev.record == null }));
    try {
      const [record, portal, contacts] = await Promise.all([
        propertyRegistryApi.get(propertyId).catch(() => null),
        propertyRegistryApi.getPortal(propertyId).catch(() => null),
        listPropertyContacts(propertyId).catch(() => [] as AgentPropertyContact[]),
      ]);

      const tenantContact = resolvePropertyTenantContact({
        property,
        currentLease,
        cycleView,
        tenantSelections,
        recordTenant: record
          ? {
              name: record.tenantName ?? undefined,
              email: record.tenantEmail ?? undefined,
              phone: record.tenantPhone ?? undefined,
            }
          : undefined,
      });
      setState({
        record,
        overview: portal?.overview ?? null,
        financial: portal?.financial ?? null,
        accounting: portal?.accounting ?? null,
        bond: cycleView
          ? bondFromCycleView(cycleView, portal?.financial?.bondAmount ?? null)
          : portal?.financial?.bondAmount != null
            ? {
                agentLink: null,
                ledgerEntryId: null,
                lodgementRef: null,
                amount: portal.financial.bondAmount,
                status: null,
                paidAt: null,
                sentToTenantAt: null,
              }
            : null,
        keyFobCount: cycleView?.onboarding?.keyCollection?.tenantReport?.fobsCount ?? null,
        tenantContact: tenantContact.name ? tenantContact : null,
        tenantContacts: contacts.filter((c) => c.role === 'TENANT'),
        loading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [apiConnected, property, propertyId, cycleView, tenantSelections, currentLease]);

  useEffect(() => {
    void sync();
  }, [sync]);

  useLivePoll(sync, apiConnected);

  return state;
}
