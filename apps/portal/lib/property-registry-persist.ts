/** True while a property is still a draft, before the agent has activated it. */
export function isPropertyRegistryDraft(
  property: { registryIntakeComplete?: boolean } | null | undefined,
): boolean {
  return property?.registryIntakeComplete === false;
}
