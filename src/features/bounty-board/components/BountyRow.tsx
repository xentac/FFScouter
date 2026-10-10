```tsx
import React, { useState } from 'react';
import { Bounty } from '../types';
import { formatCurrency } from '../utils';
import { FFScouterSettings } from '../types';

interface Props {
  bounty: Bounty;
  ffStats: { stats: number; ff: number } | undefined;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAttack: () => void;
  onClaim: () => void;
  settings: FFScouterSettings;
}

// Simple color scale for battle stat estimate (ADR 0002)
function getStatColor(stats: number): string {
  if (stats < 1000) return 'text-red-500';
  if (stats < 5000) return 'text-yellow-500';
  return 'text-green-500';
}

export const BountyRow: React.FC<Props> = ({
  bounty,
  ffStats,
  isExpanded,
  onToggleExpand,
  onAttack,
  onClaim,
  settings,
}) => {
  const [claiming, setClaiming] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      // Simulate POST claim
      await fetch('/v4/bounty-board/claim', {
        method: 'POST',
        body: JSON.stringify({ bountyId: bounty.id }),
        headers: { 'Content-Type': 'application/json' },
      });
      setToastMessage('Claim successful!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      setToastMessage(error.message || 'Claim failed.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setClaiming(false);
    }
  };

  const handleAttack = () => {
    if (settings.attackOpenBehavior === 'new_tab') {
      window.open(`/attack?id=${bounty.id}`, '_blank');
    } else {
      window.location.href = `/attack?id=${bounty.id}`;
    }
  };

  return (
    <div className="border-b border-gray-700 last:border-b-0">
      <div
        className="flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex-1">
          <div className="font-bold text-white">{bounty.name}</div>
          {ffStats && (
            <div className={`text-sm ${getStatColor(ffStats.stats)}`}>
              Est. Stats: {ffStats.stats} | FF: {ffStats.ff}
            </div>
          )}
          {!ffStats && <div className="text-sm text-gray-400">Estimate N/A</div>}
        </div>
        <div className="text-right mr-4">
          <div className="font-semibold text-yellow-400">
            {formatCurrency(bounty.topPrice)}
          </div>
          <div className="text-xs text-gray-400">Top Tier</div>
        </div>
        <div className="text-gray-400">{isExpanded ? '▼' : '▶'}</div>
      </div>

      {isExpanded && (
        <div className="p-3 bg-gray-900 text-sm">
          <div className="mb-2">
            <strong>Tiers:</strong>
            <ul className="list-disc list-inside mt-1">
              {bounty.tiers.map((tier, idx) => (
                <li key={idx}>
                  {tier.name}: {formatCurrency(tier.price)} × {tier.hits}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAttack();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Attack
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClaim();
              }}
              disabled={claiming}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              Claim
            </button>
          </div>
          {toastMessage && (
            <div
              className={`mt-2 p-2 rounded ${
                toastMessage.includes('successful')
                  ? 'bg-green-900 text-green-200'
                  : 'bg-red-900 text-red-200'
              }`}
            >
              {toastMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
