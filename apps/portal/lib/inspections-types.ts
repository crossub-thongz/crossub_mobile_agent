import type {
  InspectionRecordStatus,
  InspectionRecordType,
} from "@/constants/inspection-records"

/**
 * Domain types for the Inspection Records module — shaped to match the backend
 * `InspectionView` DTO (apps/api/src/modules/inspections). Date columns arrive
 * as ISO strings over JSON.
 */
export interface InspectionRecord {
  id: string
  type: InspectionRecordType
  status: InspectionRecordStatus
  propertyId: string | null
  propertyAddress: string | null
  propertyLatitude: number | null
  propertyLongitude: number | null
  inspectorName: string | null
  assignedInspectorId: string | null
  workflowPhase: string | null
  /** True when tenant (or ops simulation) signed the ingoing report. */
  tenantReportSigned?: boolean
  inspectorAssignedAt: string | null
  scheduledDate: string | null
  inspectionDate: string | null
  completedDate: string | null
  urgent: boolean
  reportUrl: string | null
  tenantName: string | null
  tenantEmail?: string | null
  tenantPhone?: string | null
  moveInDate: string | null
  caseEmails?: Array<{
    id: string
    subject: string
    body: string
    from: string
    fromEmail?: string | null
    to: string
    toEmail?: string | null
    at: string
    kind: string
  }>
  caseAudit?: Array<{
    id: string
    label: string
    actor: string
    at: string
  }>
  areaCount: number
  photoCount: number
  createdAt: string
  updatedAt: string
}

export interface InspectionListResult {
  inspections: InspectionRecord[]
  total: number
}

export interface InspectionDetailPhoto {
  id: string
  url: string
}

export interface InspectionDetailItem {
  id: string
  name: string | null
  flagged: boolean
  conditionTags: string[]
  comment: string | null
  reading: string | null
  photos: InspectionDetailPhoto[]
}

export interface InspectionDetailArea {
  id: string
  name: string | null
  rating: string
  /** Inspector-app label (Excellent, Good, …) when authored on mobile. */
  ratingRaw: string | null
  sortOrder: number | null
  items: InspectionDetailItem[]
  photos: InspectionDetailPhoto[]
}

export interface InspectionCheckInRecord {
  id: string
  latitude: string | null
  longitude: string | null
  location: string | null
  createdAt: string
}

/** Full inspection findings from the Inspector App — ops QA read model. */
export interface InspectionDetail extends InspectionRecord {
  propertyFullAddress?: string | null
  propertyType?: string | null
  propertyTypeLabel?: string | null
  weeklyRent?: number | null
  signName: string | null
  signUrl: string | null
  areas: InspectionDetailArea[]
  inspectionPhotos: InspectionDetailPhoto[]
  checkIns: InspectionCheckInRecord[]
  /** Latest completed INGOING for the same property (OUTGOING / ROUTINE). */
  referenceIngoing?: {
    inspectionId: string
    propertyId: string
    areas: Array<{ name: string; photos: InspectionDetailPhoto[] }>
  } | null
}

export interface KeyCustodyProgress {
  collectedAt: string | null
  collectPhotos: string[]
  collectNotes: string | null
  returnedAt: string | null
  returnPhotos: string[]
  returnNotes: string | null
  collectComplete: boolean
  returnComplete: boolean
}

export interface KeyCollectionProgress {
  status: string
  time: string | null
  location: string | null
  photos: string[]
}

/** Live on-site progression — synced from the inspector mobile app. */
export interface OnSiteProgression {
  inspectionId: string
  inspectionStatus: string
  inspectorName: string | null
  assignedInspectorId: string | null
  hasKeyArrangement: boolean
  keyCollection: KeyCollectionProgress | null
  keyCustody: KeyCustodyProgress
  fieldPhotoCount: number
  reportUrl: string | null
}
