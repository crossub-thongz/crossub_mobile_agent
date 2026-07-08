import type {
  InspectionRecordStatus,
  InspectionRecordType,
} from "@/constants/inspection-records"
import { api } from "@/lib/api"
import type { InspectionListResult, InspectionRecord, InspectionDetail, OnSiteProgression } from "@/lib/inspections-types"

/** Build a `?a=b&c=d` query string, skipping undefined / empty values. */
function qs(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

type InspectionListParams = {
  page?: number
  pageSize?: number
  search?: string
  type?: InspectionRecordType
  status?: InspectionRecordStatus
  propertyId?: string
  propertyType?: string
}

/**
 * Manual ingoing (move-in) inspection create — mirrors the backend
 * `CreateIngoingInspectionDto`. Produces a real DRAFT inspection that enters
 * the inspector pool, exactly like a leasing-scheduled ingoing.
 */
export interface CreateIngoingInspectionInput {
  propertyId: string
  scheduledTime?: string
  moveInDate?: string
  tenantName?: string
  tenantEmail?: string
  tenantPhone?: string
  priority?: 'normal' | 'high' | 'urgent'
  accessInstructions?: string
  notes?: string
  leaseApprovalRef?: string
}

/**
 * Typed wrapper over the backend Inspections read endpoints. Auth cookies + 401
 * refresh are handled by `lib/api.ts`; row-level scoping (an Account Manager
 * only sees their assigned agencies' inspections) is enforced server-side.
 */
export const inspectionsApi = {
  list: (params: InspectionListParams = {}): Promise<InspectionListResult> =>
    api.get<InspectionListResult>(`/inspections${qs(params)}`),

  get: (id: string): Promise<InspectionRecord> =>
    api
      .get<{ inspection: InspectionRecord }>(`/inspections/${id}`)
      .then((r) => r.inspection),

  getDetail: (id: string): Promise<InspectionDetail> =>
    api
      .get<{ inspection: InspectionDetail }>(`/inspections/${id}/detail`)
      .then((r) => r.inspection),

  getOnSiteProgression: (id: string): Promise<OnSiteProgression> =>
    api
      .get<{ progression: OnSiteProgression }>(`/inspections/${id}/on-site-progression`)
      .then((r) => r.progression),

  createIngoing: (input: CreateIngoingInspectionInput): Promise<InspectionRecord> =>
    api
      .post<{ inspection: InspectionRecord }>(`/inspections/ingoing`, input)
      .then((r) => r.inspection),

  reschedule: (id: string, scheduledTime: string): Promise<InspectionRecord> =>
    api
      .patch<{ inspection: InspectionRecord }>(`/inspections/${id}/schedule`, {
        scheduledTime,
      })
      .then((r) => r.inspection),

  uploadReport: (
    id: string,
    input: {
      fileName: string
      mimeType: string
      sizeBytes: number
      contentBase64: string
    },
  ): Promise<InspectionRecord> =>
    api
      .post<{ inspection: InspectionRecord }>(`/inspections/${id}/report/upload`, input)
      .then((r) => r.inspection),

  /** Server-generated or filed inspection report PDF. */
  downloadReportPdf: (id: string): Promise<Blob> =>
    api.getBlob(`/inspections/${id}/report/pdf`),
}
