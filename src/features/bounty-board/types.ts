```typescript
export interface Tier {
  name: string;
  price: number;
  hits: number;
}

export interface BountyTarget {
  id: number;
  name: string;
  faction?: {
    id: number;
    name: string;
    tag: string;
  };
  tiers: Tier[];
  topPrice: number; // Sum of top tier hits * price
  disabled: boolean;
}

export interface FactionMemberBounty extends BountyTarget {
  factionId: number;
  factionName: string;
  factionTag: string;
}

export type Bounty = BountyTarget | FactionMemberBounty;

export interface FFScouterSettings {
  bountyMasterToggle: boolean;
  attackOpenBehavior: 'new_tab' | 'same_window';
}

export interface BountyBoardState {
  expandedRows: Set<number>;
  collapsedFactions: Set<number>;
  filterStatsLessThan: number | null;
  filterFFLessThan: number | null;
  consentAccepted: boolean;
  keyRegistered: boolean;
}

export interface PolicyVersion {
  version: number;
  url: string;
}

export const POLICY_VERSIONS: PolicyVersion[] = [
  { version: 1, url: 'https://ffscouter.com/policy/v1' },
];
