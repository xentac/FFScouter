import { createRoot } from 'react-dom/client';
import React, { useState } from 'react';
import { acceptConsent } from '@/api/bounty-board';

export const BountyConsent = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await acceptConsent();
      window.location.reload();
    } catch (error) {
      setIsLoading(false);
    }
  };

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
      }}>
        <h2 style={{ color: '#fff', marginTop: 0 }}>Data Policy Consent</h2>
        <p style={{ color: '#ccc', marginBottom: '16px' }}>
          FF Scouter processes bounty data as outlined in our{' '}
          <a href="https://ffscouter.com/policy" style={{ color: '#4dabff' }}>Data Policy</a>.
        </p>
        <p style={{ color: '#ccc', marginBottom: '16px' }}>
          By accepting, you confirm you have read and agree to the terms.
        </p>
        <button
          onClick={handleAccept}
          disabled={isLoading}
          style={{
            background: '#4dabff',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {isLoading ? 'Processing...' : 'I Accept'}
        </button>
      </div>
    </div>
  );
};

export const mountConsent = (): void => {
  const container = document.createElement('div');
  container.id = 'ffscouter-consent-container';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<BountyConsent />);
};

export const unmountConsent = (): void => {
  const container = document.getElementById('ffscouter-consent-container');
  if (container) container.remove();
};