/** Base URL for the CROSSUB staff web app (crossub_web). */
export function crossubWebBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_CROSSUB_WEB_URL?.trim();
  return raw && raw.length > 0 ? raw.replace(/\/$/, '') : 'http://localhost:3000';
}

/** Open the staff property portal for a property (best-effort deep link). */
export function crossubWebPropertyUrl(propertyId: string): string {
  return `${crossubWebBaseUrl()}/properties?propertyId=${encodeURIComponent(propertyId)}`;
}

/** Open a rent review case in the CROSSUB staff web app. */
export function crossubWebRentReviewUrl(reviewId: string): string {
  return `${crossubWebBaseUrl()}/rent-review?reviewId=${encodeURIComponent(reviewId)}`;
}
