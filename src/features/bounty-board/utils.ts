```typescript
import { Bounty, FFScouterSettings } from './types';

export function sortBountiesByTopPrice(bounties: Bounty[]): Bounty[] {
  return [...bounties].sort((a, b) => b.topPrice - a.topPrice);
}

export function filterBounties(
  bounties: Bounty[],
  filterStatsLessThan: number | null,
  filterFFLessThan: number | null,
  ffStatsCache: Record<number, { stats: number; ff: number }>
): Bounty[] {
  return bounties.filter((bounty) => {
    const stats = ffStatsCache[bounty.id]?.stats ?? null;
    const ff = ffStatsCache[bounty.id]?.ff ?? null;

    // Targets with no available estimate are never hidden by filters
    if (stats === null && ff === null) {
      return true;
    }

    if (filterStatsLessThan !== null && stats !== null && stats >= filterStatsLessThan) {
      return false;
    }

    if (filterFFLessThan !== null && ff !== null && ff >= filterFFLessThan) {
      return false;
    }

    return true;
  });
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}

export function getAttackUrl(bountyId: number, behavior: FFScouterSettings['attackOpenBehavior']): string {
  const url = `${API_ENDPOINTS.ATTACK}?id=${bountyId}`;
  if (behavior === 'new_tab') {
    window.open(url, '_blank');
    return '';
  }
  return url;
}

const API_ENDPOINTS = {
  ATTACK: '/attack',
};
