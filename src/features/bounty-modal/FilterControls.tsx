import React from 'react';

interface FilterControlsProps {
  statsThreshold: number;
  ffThreshold: number;
  onStatsChange: (threshold: number) => void;
  onFFChange: (threshold: number) => void;
}

export const FilterControls = ({
  statsThreshold,
  ffThreshold,
  onStatsChange,
  onFFChange,
}: FilterControlsProps) => {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      marginBottom: '12px',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1 }}>
        <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Stats Less Than
        </label>
        <input
          type="number"
          value={statsThreshold}
          onChange={(e) => onStatsChange(Number(e.target.value))}
          style={{
            background: '#111',
            color: '#fff',
            border: '1px solid #333',
            padding: '4px',
            borderRadius: '4px',
            width: '100%',
          }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <label style={{ color: '#aaa', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          FF Less Than
        </label>
        <input
          type="number"
          value={ffThreshold}
          onChange={(e) => onFFChange(Number(e.target.value))}
          style={{
            background: '#111',
            color: '#fff',
            border: '1px solid #333',
            padding: '4px',
            borderRadius: '4px',
            width: '100%',
          }}
        />
      </div>
    </div>
  );
};