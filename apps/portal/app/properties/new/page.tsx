import { AddPropertyPage } from '@/components/agent/add-property/add-property-page';
import { SteppedAddPropertyPage } from '@/components/agent/add-property/stepped-add-property-page';
import { resolveEnvironmentBanner } from '@/lib/environment-banner';

/**
 * Add Property. The one-page form (Daniel's spec v1.0, 13 Nov 2026) runs on the test
 * environment first. Production keeps the stepped form until the new one has been checked
 * there, because this is how every agency registers a property and a push to main releases
 * production at once. Read on the server per request, the same way the staging banner is.
 *
 * To switch production over: render `AddPropertyPage` unconditionally and delete the stepped
 * page and form.
 */
export default function PropertiesNewPage() {
  const testEnvironment =
    resolveEnvironmentBanner({
      label: process.env.CROSSUB_ENVIRONMENT_LABEL,
      apiInternalUrl: process.env.API_INTERNAL_URL,
      productionUrl: process.env.CROSSUB_AGENT_PRODUCTION_URL,
    }) != null;

  return testEnvironment ? <AddPropertyPage /> : <SteppedAddPropertyPage />;
}
