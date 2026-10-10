```tsx
import React, { useState } from 'react';
import { FactionMemberBounty } from '../types';
import { BountyRow } from './BountyRow';
import { FFScouterSettings } from '../types';

interface Props {
  factionBounty: FactionMemberBounty;
  members: FactionMemberBounty[];
  ffStatsCache: Record<number, { stats: number; ff: number }>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  settings: FFScouterSettings;
}

export const FactionCard: React.FC<Props> = ({
  factionBounty,
  members,
  ffStatsCache,
  isCollapsed,
  onToggleCollapse,
  settings,
}) => {
  return (
    <div className="border-b border-gray-700">
      <div
        className="flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer"
        onClick={onToggleCollapse}
      >
        <div className="flex-1">
          <div className="font-bold text-white">{factionBounty.factionName}</div>
          <div className="text-sm text-gray-400">
            [{factionBounty.factionTag}] - Shared Pool
          </div>
        </div>
        <div className="text-right mr-4">
          <div className="font-semibold text-yellow-400">
            ${factionBounty.topPrice.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">Top Tier</div>
        </div>
        <div className="text-gray-400">{isCollapsed ? '▼' : '▶'}</div>
      </div>

      {!isCollapsed && (
        <div className="bg-gray-900">
          {members.map((member) => (
            <BountyRow
              key={member.id}
              bounty={member}
              ffStats={ffStatsCache[member.id]}
              isExpanded={false} // Members don't expand further in this view
              onToggleExpand={() => {}}
              onAttack={() => {}}
              onClaim={() => {}}
              settings={settings}
            />
          ))}
        </div>
      )}
    </div>
  );
};
