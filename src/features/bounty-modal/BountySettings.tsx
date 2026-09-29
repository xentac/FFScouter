import { createRoot } from 'react-dom/client';
import React, { useState, useEffect } from 'react';
import { useConfig } from '@/config';

interface BountySettingsProps {
  onToggle: (enabled: boolean) => void;
  onAttackBehaviorChange: (behavior: 'new-tab' | 'same-window') => void;
}

export const BountySettings = () => {
  const { config, updateConfig } = useConfig();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('ffscouter-bounty-settings-open');
    if (savedState) setIsOpen(JSON.parse(savedState));
  }, []);

  const toggleSettings = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    localStorage.setItem('ffscouter-bounty-settings-open', JSON.stringify(newState));
  };

  const handleToggle = (enabled: boolean) => {
    updateConfig({ bountyEnabled: enabled });
    onToggle(enabled);
  };

  const handleAttackBehaviorChange = (behavior: 'new-tab' | 'same-window') => {
    updateConfig({ attackOpenBehavior: behavior });
    onAttackBehaviorChange(behavior);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1001,
    }}>
      <button
        onClick={toggleSettings}
        style={{
          background: '#4dabff',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 12px',
          cursor: 'pointer',
          marginBottom: '8px',
        }}
      >
        ⚙️ Bounty Settings
      </button>

      {isOpen && (
        <div style={{
          background: '#1a1a1a',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          width: '300px',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>
              Enable Bounties
            </label>
            <input
              type="checkbox"
              checked={config.bountyEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>
              Attack Open Behavior
            </label>
            <select
              value={config.attackOpenBehavior}
              onChange={(e) => handleAttackBehaviorChange(e.target.value as 'new-tab' | 'same-window')}
              style={{
                background: '#111',
                color: '#fff',
                border: '1px solid #333',
                padding: '4px',
                borderRadius: '4px',
                width: '100%',
              }}
            >
              <option value="new-tab">New Tab</option>
              <option value="same-window">Same Window</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export const mountSettings = (): void => {
  const container = document.createElement('div');
  container.id = 'ffscouter-bounty-settings-container';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<BountySettings onToggle={() => {}} onAttackBehaviorChange={() => {}} />);
};

export const unmountSettings = (): void => {
  const container = document.getElementById('ffscouter-bounty-settings-container');
  if (container) container.remove();
};