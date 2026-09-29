import { createRoot } from 'react-dom/client';
import React from 'react';

export const BountyKeyGate = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: '#1a1a1a',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#fff', marginTop: 0 }}>Register Your Key</h2>
        <p style={{ color: '#ccc', marginBottom: '16px' }}>
          Please register your FF Scouter key to access bounty features.
        </p>
        <button
          onClick={() => window.location.href = 'https://ffscouter.com/key'}
          style={{
            background: '#4dabff',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Register Key
        </button>
      </div>
    </div>
  );
};

export const mountKeyGate = (): void => {
  const container = document.createElement('div');
  container.id = 'ffscouter-keygate-container';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<BountyKeyGate />);
};

export const unmountKeyGate = (): void => {
  const container = document.getElementById('ffscouter-keygate-container');
  if (container) container.remove();
};