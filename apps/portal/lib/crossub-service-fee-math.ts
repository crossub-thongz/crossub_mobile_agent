/** Shared Full Service fee math — mirrors billing-pricing.util on the API. */
export type ManagementRateGstMode = 'include' | 'exclude' | '' | null | undefined;

export const STANDARD_MANAGEMENT_RATE_PERCENT = 4;

export function effectiveManagementRatePercent(
  managementRatePercent: number | null | undefined,
): number {
  const rate =
    managementRatePercent != null && Number.isFinite(managementRatePercent)
      ? managementRatePercent
      : 0;
  return Math.max(rate, STANDARD_MANAGEMENT_RATE_PERCENT);
}

function roundAud(n: number): number {
  return Math.round(n * 100) / 100;
}

export function agentGrossIncomeFromRent(
  weeklyRentAud: number,
  managementRatePercent: number,
): number {
  return roundAud(weeklyRentAud * (managementRatePercent / 100));
}

export function agentIncomeExGstFromRent(
  weeklyRentAud: number,
  managementRatePercent: number,
  managementRateGst?: ManagementRateGstMode,
  gstPercent = 10,
): number {
  const gross = agentGrossIncomeFromRent(weeklyRentAud, managementRatePercent);
  if (managementRateGst === 'include') {
    return roundAud(gross / (1 + gstPercent / 100));
  }
  return gross;
}

export function crossubServiceFeeFromAgentIncome(
  agentIncomeAud: number,
  serviceFeePercent: number,
): number {
  return roundAud(agentIncomeAud * (serviceFeePercent / 100));
}

/** Weekly rent × management rate (min 4%) ÷ 7 × CROSSUB %. */
export function fullServiceFeePerActiveDayIncGst(args: {
  weeklyRentAud: number;
  managementRatePercent: number;
  serviceFeePercent: number;
}): number {
  const rate = effectiveManagementRatePercent(args.managementRatePercent);
  return (
    ((args.weeklyRentAud * (rate / 100)) / 7) * (args.serviceFeePercent / 100)
  );
}

export function crossubMonthlyServiceFeeIncGst(args: {
  weeklyRentAud: number;
  managementRatePercent: number;
  serviceFeePercent: number;
  managementRateGst?: ManagementRateGstMode;
  gstPercent?: number;
  activeDays?: number;
}): {
  weeklyGross: number;
  weeklyExGst: number;
  monthlyIncGst: number;
  feePerActiveDayAud: number;
  pmFeePerDay: number;
} {
  const rate = effectiveManagementRatePercent(args.managementRatePercent);
  const weeklyGross = agentGrossIncomeFromRent(args.weeklyRentAud, rate);
  const weeklyExGst = agentIncomeExGstFromRent(
    args.weeklyRentAud,
    rate,
    args.managementRateGst,
    args.gstPercent ?? 10,
  );
  const feePerActiveDayAud = fullServiceFeePerActiveDayIncGst({
    weeklyRentAud: args.weeklyRentAud,
    managementRatePercent: rate,
    serviceFeePercent: args.serviceFeePercent,
  });
  const days = args.activeDays ?? 30;
  return {
    weeklyGross,
    weeklyExGst,
    feePerActiveDayAud: roundAud(feePerActiveDayAud),
    pmFeePerDay: roundAud(weeklyGross / 7),
    monthlyIncGst: roundAud(feePerActiveDayAud * days),
  };
}
