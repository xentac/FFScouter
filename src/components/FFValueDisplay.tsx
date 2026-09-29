import React from 'react';

interface FFValueDisplayProps {
  value: number;
}

export const FFValueDisplay = ({ value }: FFValueDisplayProps) => {
  const getColor = (): string => {
    if (value >= 1000) return '#ff4d4d';
    if (value >= 500) return '#ff9500';
    if (value >= 100) return '#ffd166';
    if (value >= 50) return '#00c851';
    return '#4dabff';
  };

  return (
    <span style={{
      color: getColor(),
      fontWeight: 'bold',
      fontSize: '14px',
    }}>
      FF {value.toFixed(0)}
    </span>
  );
};