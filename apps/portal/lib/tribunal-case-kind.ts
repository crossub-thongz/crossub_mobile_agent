export function isRentChasingTribunalCase(matter: string, tribunalType?: string): boolean {
  const matterLower = matter.trim().toLowerCase();
  if (matterLower.includes('rent chasing') || matterLower.includes('rental arrears')) {
    return true;
  }
  return (tribunalType ?? '').toUpperCase() === 'RENTAL_ARREARS';
}
