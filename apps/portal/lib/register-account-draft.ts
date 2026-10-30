import { isPhoneCountry, type PhoneCountry, type RegistrationCountry } from '@/lib/registration-mobile';

const STORAGE_KEY = 'crossub.register.account';

/** Page 1 of registration, kept for the workspace step. */
export type RegisterAccountDraft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneCountry: PhoneCountry;
  phone: string;
  region: RegistrationCountry;
};

export function saveRegisterAccountDraft(draft: RegisterAccountDraft): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

const WORKSPACE_KEY = 'crossub.register.workspace';

/** Page 2 of registration, kept for the ready step. */
export type RegisterWorkspaceDraft = {
  companyName: string;
  agencyName: string;
  businessNumber: string;
  licenceNumber: string;
  state: string;
  officeAddress: string;
};

export function saveRegisterWorkspaceDraft(draft: RegisterWorkspaceDraft): void {
  sessionStorage.setItem(WORKSPACE_KEY, JSON.stringify(draft));
}

export function readRegisterWorkspaceDraft(): RegisterWorkspaceDraft | null {
  try {
    const raw = sessionStorage.getItem(WORKSPACE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegisterWorkspaceDraft>;
    if (!parsed.companyName || !parsed.officeAddress) return null;
    return {
      companyName: parsed.companyName,
      agencyName: parsed.agencyName ?? '',
      businessNumber: parsed.businessNumber ?? '',
      licenceNumber: parsed.licenceNumber ?? '',
      state: parsed.state ?? '',
      officeAddress: parsed.officeAddress,
    };
  } catch {
    return null;
  }
}

export function readRegisterAccountDraft(): RegisterAccountDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegisterAccountDraft>;
    if (
      !parsed.firstName ||
      !parsed.lastName ||
      !parsed.email ||
      !parsed.password ||
      !parsed.phoneCountry ||
      !isPhoneCountry(parsed.phoneCountry) ||
      !parsed.phone ||
      (parsed.region !== 'AU' && parsed.region !== 'NZ')
    ) {
      return null;
    }
    return parsed as RegisterAccountDraft;
  } catch {
    return null;
  }
}
