/** Body text for open inspection report distribution emails (mirrors API notify util). */
export function buildOpenInspectionReportDistributedBody(input: {
  propertyLabel: string
  caseRef: string
  inspectorName: string
  viewingWindow: string
}): string {
  return [
    `The open inspection for ${input.propertyLabel} is complete.`,
    "",
    `Case: ${input.caseRef}`,
    `Viewing window: ${input.viewingWindow}`,
    `Inspector: ${input.inspectorName}`,
    "",
    "The open inspection report PDF is attached. Please review it in your portal under Open Report.",
  ].join("\n")
}

export function openInspectionCaseRef(sessionId: string): string {
  return `OP-${sessionId.replace(/\D/g, "").slice(0, 7).toUpperCase()}`
}

export function formatOpenInspectionViewingWindow(
  startIso: string,
  endIso?: string | null,
): string {
  const start = new Date(startIso)
  const startLabel = start.toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  if (!endIso) return startLabel
  const end = new Date(endIso)
  const endLabel = end.toLocaleString("en-AU", { timeStyle: "short" })
  return `${startLabel} – ${endLabel}`
}

export function openInspectionReportAttachmentName(sessionId: string): string {
  return `open-report-${sessionId.slice(0, 8)}.pdf`
}
