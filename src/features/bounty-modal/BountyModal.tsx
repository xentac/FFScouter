import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BountyRow } from './BountyRow';
import { useBountyBoard } from '@/api/bounty-board';
import { useStatsCache } from '@/api/stats-cache';
import { FFValueDisplay } from '@/components/FFValueDisplay';
import { FilterControls } from './FilterControls';

interface BountyModalProps {
  onConsent: () => void;
  onKeyGate: () => void;
}

export const BountyModal = ({ onConsent, onKeyGate }: BountyModalProps) => {
  const { data: board, error, isConsentRequired } = useBountyBoard();
  const { data: stats } = useStatsCache();
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    statsThreshold: 0,
    ffThreshold: 0,
  });

  useEffect(() => {
    if (isConsentRequired) onConsent();
    else if (error?.code === 86) onKeyGate();
  }, [isConsentRequired, error]);

  if (!board || isConsentRequired) return null;

  const filteredTargets = board.targets.filter(target => {
    const statsValue = stats?.[target.id]?.stats || 0;
    const ffValue = stats?.[target.id]?.ff || 0;
    return statsValue >= filters.statsThreshold && ffValue >= filters.ffThreshold;
  });

  return (
    <div className="ffscouter-bounty-modal" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      background: '#1a1a1a',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#fff', margin: 0 }}>FF Scouter Bounties</h3>
        <button onClick={() => onConsent()}>⚙️</button>
      </div>

      <FilterControls
        statsThreshold={filters.statsThreshold}
        ffThreshold={filters.ffThreshold}
        onStatsChange={setFilters}
        onFFChange={setFilters}
      />

      {filteredTargets.map(target => (
        <BountyRow
          key={target.id}
          target={target}
          stats={stats?.[target.id]}
          isExpanded={expandedRows.includes(target.id)}
          onExpand={() => setExpandedRows(prev => [...prev, target.id])}
          onCollapse={() => setExpandedRows(prev => prev.filter(id => id !== target.id))}
        />
      ))}
    </div>
  );
};

export const mountBountyModal = (): void => {
  const container = document.createElement('div');
  container.id = 'ffscouter-bounty-modal-container';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(
    <BountyModal
      onConsent={() => window.location.reload()}
      onKeyGate={() => window.location.reload()}
    />
  );
};

export const unmountBountyModal = (): void => {
  const container = document.getElementById('ffscouter-bounty-modal-container');
  if (container) container.remove();
};