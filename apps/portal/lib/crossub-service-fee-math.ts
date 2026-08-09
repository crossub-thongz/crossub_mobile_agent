/** Shared Full Service fee math — mirrors billing-pricing.util on the API. */
export type ManagementRateGstMode = 'include' | 'exclude' | '' | null | undefined;

export function agentGrossIncomeFromRent(
  weeklyRentAud: number,
  managementRatePercent: number,
): number {
  return Math.round(weeklyRentAud * (managementRatePercent / 100) * 100) / 100;
}

export function agentIncomeExGstFromRent(
  weeklyRentAud: number,
  managementRatePercent: number,
  managementRateGst?: ManagementRateGstMode,
  gstPercent = 10,
): number {
  const gross = agentGrossIncomeFromRent(weeklyRentAud, managementRatePercent);
  if (managementRateGst === 'include') {
    return Math.round((gross / (1 + gstPercent / 100)) * 100) / 100;
  }
  return gross;
}

export function crossubServiceFeeFromAgentIncome(
  agentIncomeAud: number,
  serviceFeePercent: number,
): number {
  return Math.round(agentIncomeAud * (serviceFeePercent / 100) * 100) / 100;
}

export function crossubMonthlyServiceFeeIncGst(args: {
  weeklyRentAud: number;
  managementRatePercent: number;
  serviceFeePercent: number;
  managementRateGst?: ManagementRateGstMode;
  gstPercent?: number;
}): { weeklyGross: number; weeklyExGst: number; monthlyIncGst: number } {
  const gstPercent = args.gstPercent ?? 10;
  const weeklyGross = agentGrossIncomeFromRent(args.weeklyRentAud, args.managementRatePercent);
  const weeklyExGst = agentIncomeExGstFromRent(
    args.weeklyRentAud,
    args.managementRatePercent,
    args.managementRateGst,
    gstPercent,
  );
  const monthlyEx = (weeklyExGst * 52) / 12;
  const feeEx = crossubServiceFeeFromAgentIncome(monthlyEx, args.serviceFeePercent);
  const gstAmount = Math.round(feeEx * (gstPercent / 100) * 100) / 100;
  const monthlyIncGst = Math.round((feeEx + gstAmount) * 100) / 100;
  return { weeklyGross, weeklyExGst, monthlyIncGst };
}
