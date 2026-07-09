'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  mapLeaseStatusToPropertyStatusForApi,
  NewPropertyRegistryForm,
  parseCount,
  parseMoney,
  parsePercent,
  type NewPropertyRegistryValues,
} from '@/components/agent/new-property-registry-form';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail, ROUTES } from '@/constants/routes';
import { bondFromWeekly, depositFromWeekly, weeklyRentFromAmount } from '@/lib/rent-calculations';
import { splitParties } from '@/lib/property-parties';
import type { Property } from '@/lib/types';

export default function AddPropertyPage() {
  const router = useRouter();
  const { addProperty, primaryAgency, apiConnected } = useAgentData();
  const [submitting, setSubmitting] = useState(false);

  const onSubmitNewProperty = async (values: NewPropertyRegistryValues) => {
    const address = values.address.trim();
    if (!address) {
      toast.error('Street address is required');
      return;
    }
    if (!values.state) {
      toast.error('Select the property state or territory');
      return;
    }

    const agencyName =
      values.agencyName.trim() ||
      primaryAgency?.name?.trim() ||
      '';
    if (!apiConnected && !agencyName) {
      toast.error('Agency name is required');
      return;
    }

    setSubmitting(true);
    try {
      const landlords = splitParties(values.landlords);
      const tenants = splitParties(values.tenants);
      const { leasing, strata, management } = values;
      const weeklyRent = weeklyRentFromAmount(Number(leasing.rentAmount), leasing.rentPeriod);
      const property = await addProperty({
        intakeMode: 'new',
        agencyName: agencyName || undefined,
        agencyCompany: values.agencyCompany.trim() || undefined,
        address,
        suburb: values.suburb.trim(),
        state: values.state,
        postcode: values.postcode.trim() || undefined,
        homeOwnerName: landlords.primary!.name,
        homeOwnerEmail: landlords.primary?.email,
        homeOwnerPhone: landlords.primary?.phone,
        additionalLandlords: landlords.additional.length ? landlords.additional : undefined,
        tenantName: tenants.label,
        tenantEmail: tenants.primary?.email,
        tenantPhone: tenants.primary?.phone,
        additionalTenants: tenants.additional.length ? tenants.additional : undefined,
        leaseStatus: values.leaseStatus as Property['leaseStatus'],
        rentWeekly: weeklyRent,
        rentPeriod: leasing.rentPeriod || undefined,
        leaseStart: leasing.agreementStart || undefined,
        leaseEnd: leasing.agreementEnd || undefined,
        nextRentReview: leasing.nextRentReview || undefined,
        bondAmount: bondFromWeekly(weeklyRent) || undefined,
        depositAmount: depositFromWeekly(weeklyRent) || undefined,
        bedrooms: parseCount(values.bedrooms),
        bathrooms: parseCount(values.bathrooms),
        carSpaces: parseCount(values.parking),
        furnished: values.furnished === 'yes',
        propertyType: values.propertyType,
        propertyStatus: mapLeaseStatusToPropertyStatusForApi(
          values.leaseStatus as Property['leaseStatus'],
        ),
        latitude: values.latitude,
        longitude: values.longitude,
        buildingName: strata.buildingName.trim() || undefined,
        strataPlanNumber: strata.strataPlanNumber.trim() || undefined,
        buildingManagerName: strata.buildingManagerName.trim() || undefined,
        buildingManagerEmail: strata.buildingManagerEmail.trim() || undefined,
        buildingManagerPhone: strata.buildingManagerContactNumber.trim() || undefined,
        strataContactName: strata.strataName.trim() || undefined,
        strataContactEmail: strata.strataEmail.trim() || undefined,
        strataContactPhone: strata.strataContactNumber.trim() || undefined,
        landlordInsuranceExpiry: management.landlordInsuranceExpiry || undefined,
        administrationFee: parseMoney(management.administrationFee),
        documentationFee: parseMoney(management.documentationFee),
        lettingFee: parseMoney(management.lettingFee),
        managementRatePercent: parsePercent(management.managementRatePercent),
        managementRateGst:
          management.managementRateGst === 'include' || management.managementRateGst === 'exclude'
            ? management.managementRateGst
            : undefined,
      });
      toast.success('Property added — available across leasing, maintenance, and more');
      router.push(propertyDetail(property.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the property');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentShell title="Add property" backHref={ROUTES.PROPERTIES} backLabel="Properties">
      <div className="space-y-5">
        <p className="text-muted-foreground text-sm">
          Register a new property with landlord, tenant, and management details. To hand a property
          over to another agent, use Leasing → Transfer OUT.
        </p>

        <NewPropertyRegistryForm onSubmit={onSubmitNewProperty} submitting={submitting} />
      </div>
    </AgentShell>
  );
}
