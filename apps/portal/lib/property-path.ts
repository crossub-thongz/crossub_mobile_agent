/** Property id from `/properties/[id]` and nested property routes. */
export function propertyIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(/^\/properties\/([^/]+)/);
  const id = match?.[1];
  if (!id || id === 'new') return undefined;
  return id;
}
