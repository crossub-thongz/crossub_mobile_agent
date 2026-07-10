'use client';

import { useCallback, useEffect, useState } from 'react';

import { leasingOpsApi } from '@/lib/leasing-ops-api';
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
  amount: number | null;
  status: string | null;
}

export interface PropertyOverviewSync {
  record: PropertyRecord | null;
  overview: PropertyPortalOverview | null;
  financial: PropertyPortalFinancial | null;
  accounting: PropertyPortalAccounting | null;
  bond: PropertyBondSnapshot | null;
  keyFobCount: number | null;
  tenantContact: PropertyTenantContact | null;
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
  loading: false,
};

export function usePropertyOverviewSync(
  property: Property,
  apiConnected: boolean,
  leasingCycle?: LeasingCycle,
  tenantSelections?: TenantSelectionCase[],
  currentLease?: LeasingRecord,
): PropertyOverviewSync {
  const propertyId = property.id;
  const [state, setState] = useState<PropertyOverviewSync>(EMPTY);

  const sync = useCallback(async () => {
    if (!apiConnected) {
      setState(EMPTY);
      return;
    }
    setState((prev) => ({ ...prev, loading: prev.record == null }));
    try {
      const [record, portal, cycleView] = await Promise.all([
        propertyRegistryApi.get(propertyId).catch(() => null),
        propertyRegistryApi.getPortal(propertyId).catch(() => null),
        leasingCycle?.id
          ? leasingOpsApi.get(leasingCycle.id).catch(() => null)
          : Promise.resolve(null),
      ]);

      const bondBlock = cycleView?.onboarding?.bond;
      const keyFobCount = cycleView?.onboarding?.keyCollection?.tenantReport?.fobsCount ?? null;
      const tenantContact = resolvePropertyTenantContact({
        property,
        currentLease,
        cycleView,
        tenantSelections,
        recordTenant: record
          ? {
              name: record.tenantName,
              email: record.tenantEmail,
              phone: record.tenantPhone,
            }
          : undefined,
      });
      setState({
        record,
        overview: portal?.overview ?? null,
        financial: portal?.financial ?? null,
        accounting: portal?.accounting ?? null,
        bond: cycleView
          ? {
              agentLink: bondBlock?.agentLink ?? null,
              ledgerEntryId: bondBlock?.ledgerEntryId ?? null,
              amount: cycleView.rental.bond ?? portal?.financial?.bondAmount ?? null,
              status: bondBlock?.status ?? null,
            }
          : portal?.financial?.bondAmount != null
            ? {
                agentLink: null,
                ledgerEntryId: null,
                amount: portal.financial.bondAmount,
                status: null,
              }
            : null,
        keyFobCount,
        tenantContact: tenantContact.name ? tenantContact : null,
        loading: false,
      });
    } catch {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [apiConnected, property, propertyId, leasingCycle?.id, tenantSelections, currentLease]);

  useEffect(() => {
    void sync();
  }, [sync]);

  useLivePoll(sync, apiConnected);

  return state;
}
