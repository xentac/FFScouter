import React from 'react';
import { FFValueDisplay } from '@/components/FFValueDisplay';

interface BountyRowProps {
  target: {
    id: string;
    name: string;
    faction?: string;
    tiers: Array<{ price: number; quantity: number }>;
  };
  stats?: {
    stats: number;
    ff: number;
  };
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export const BountyRow = ({
  target,
  stats,
  isExpanded,
  onExpand,
  onCollapse,
}: BountyRowProps) => {
  const topTier = target.tiers[0];
  const isFaction = !!target.faction;

  return (
    <div style={{
      border: '1px solid #333',
      borderRadius: '4px',
      marginBottom: '8px',
      background: isExpanded ? '#2a2a2a' : '#1a1a1a',
    }}>
      <div
        style={{
          padding: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onClick={isExpanded ? onCollapse : onExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontWeight: 'bold', color: '#fff' }}>
            {isFaction ? `${target.name} (Faction)` : target.name}
          </div>
          {stats && (
            <FFValueDisplay value={stats.ff} />
          )}
        </div>
        <div style={{ color: '#aaa' }}>
          ${topTier.price.toLocaleString()} × {topTier.quantity}
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '0 12px 12px', background: '#111' }}>
          {target.tiers.map((tier, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              fontSize: '14px',
              color: '#ccc',
            }}>
              <span>${tier.price.toLocaleString()} × {tier.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};