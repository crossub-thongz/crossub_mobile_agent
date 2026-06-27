# Changelog

## 2026-06-27

### Changed
- Tenant provisioning now calls the CROSSUB API (`POST /api/v1/agent/tenants`) through this app's own same-origin proxy, carrying the signed-in Account Manager's session cookie — instead of posting cross-origin to the tenant app's account store. `lib/tenant-provisioning.ts` rewritten to use the shared `api` client; `NEXT_PUBLIC_TENANT_APP_URL` is no longer used.
