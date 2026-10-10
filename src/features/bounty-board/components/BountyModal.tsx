```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Bounty, FFScouterSettings, BountyBoardState, PolicyVersion } from '../types';
import { BountyRow } from './BountyRow';
import { FactionCard } from './FactionCard';
import { sortBountiesByTopPrice, filterBounties } from '../utils';
import { CODE_86_CONSENT_REQUIRED, DEFAULT_SETTINGS, POLICY_VERSIONS } from '../constants';

interface Props {
  settings: FFScouterSettings;
  ffStatsCache: Record<number, { stats: number; ff: number }>;
  onClose: () => void;
}

export const BountyModal: React.FC<Props> = ({ settings, ffStatsCache, onClose }) => {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<BountyBoardState>({
    expandedRows: new Set(),
    collapsedFactions: new Set(),
    filterStatsLessThan: null,
    filterFFLessThan: null,
    consentAccepted: false,
    keyRegistered: true,
  });

  // Load initial state from localStorage or defaults
  useEffect(() => {
    const savedState = localStorage.getItem('ffscouter_bounty_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState({
          ...parsed,
          expandedRows: new Set(parsed.expandedRows),
          collapsedFactions: new Set(parsed.collapsedFactions),
        });
      } catch (e) {
        console.error('Failed to parse bounty state', e);
      }
    }
  }, []);

  // Save state changes
  useEffect(() => {
    localStorage.setItem(
      'ffscouter_bounty_state',
      JSON.stringify({
        ...state,
        expandedRows: Array.from(state.expandedRows),
        collapsedFactions: Array.from(state.collapsedFactions),
      })
    );
  }, [state]);

  const fetchBounties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/v4/bounty-board');
      const data = await response.json();

      if (response.status === 403 && data.code === CODE_86_CONSENT_REQUIRED) {
        setState((prev) => ({ ...prev, consentAccepted: false }));
        setLoading(false);
        return;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bounties');
      }

      // Filter out disabled targets
      const activeBounties = data.bounties.filter((b: Bounty) => !b.disabled);
      setBounties(activeBounties);
      setState((prev) => ({ ...prev, keyRegistered: true }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBounties();
  }, [fetchBounties]);

  const handleConsentAccept = async () => {
    try {
      const response = await fetch('/v4/bounty-board/consent', {
        method: 'POST',
        body: JSON.stringify({ accepted: true }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setState((prev) => ({ ...prev, consentAccepted: true }));
        fetchBounties(); // Reload board
      } else {
        alert('Failed to accept consent.');
      }
    } catch (err) {
      alert('Error accepting consent.');
    }
  };

  const handleKeyNudge = () => {
    // Redirect to key registration page
    window.location.href = '/register-key';
  };

  const filteredAndSortedBounties = sortBountiesByTopPrice(
    filterBounties(
      bounties,
      state.filterStatsLessThan,
      state.filterFFLessThan,
      ffStatsCache
    )
  );

  const groupedFactions = filteredAndSortedBounties.reduce<Record<number, Bounty[]>>((acc, bounty) => {
    if ('factionId' in bounty) {
      if (!acc[bounty.factionId]) acc[bounty.factionId] = [];
      acc[bounty.factionId].push(bounty);
    }
    return acc;
  }, {});

  const individualBounties = filteredAndSortedBounties.filter(
    (b) => !('factionId' in b)
  );

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  // Consent Gate
  if (!state.consentAccepted) {
    const currentPolicy = POLICY_VERSIONS[POLICY_VERSIONS.length - 1];
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-4">Consent Required</h2>
        <p className="mb-4">
          To use the FF Scouter Bounty Board, you must agree to our{' '}
          <a
            href={currentPolicy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            Data Policy and Rules
          </a>
          .
        </p>
        <button
          onClick={handleConsentAccept}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          I have read the rules and data policy
        </button>
      </div>
    );
  }

  // Key Gate
  if (!state.keyRegistered) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-xl font-bold mb-4">Key Registration Required</h2>
        <p className="mb-4">You need to register your API key to access the Bounty Board.</p>
        <button
          onClick={handleKeyNudge}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Register Key
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 w-full max-w-2xl h-[80vh] rounded-lg shadow-xl flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">FF Scouter Bounties</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-700 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stats Less Than</label>
            <input
              type="number"
              value={state.filterStatsLessThan ?? ''}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  filterStatsLessThan: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-700"
              placeholder="e.g. 5000"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">FF Less Than</label>
            <input
              type="number"
              value={state.filterFFLessThan ?? ''}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  filterFFLessThan: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="w-full bg-gray-800 text-white px-2 py-1 rounded border border-gray-700"
              placeholder="e.g. 100"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {individualBounties.map((bounty) => (
            <BountyRow
              key={bounty.id}
              bounty={bounty}
              ffStats={ffStatsCache[bounty.id]}
              isExpanded={state.expandedRows.has(bounty.id)}
              onToggleExpand={() =>
                setState((prev) => {
                  const next = new Set(prev.expandedRows);
                  if (next.has(bounty.id)) next.delete(bounty.id);
                  else next.add(bounty.id);
                  return { ...prev, expandedRows: next };
                })
              }
              onAttack={() => {}} // Handled in row
              onClaim={() => {}} // Handled in row
              settings={settings}
            />
          ))}

          {Object.entries(groupedFactions).map(([factionId, members]) => {
            const factionBounty = members[0]; // Use first member as representative
            return (
              <FactionCard
                key={factionId}
                factionBounty={factionBounty}
                members={members}
                ffStatsCache={ffStatsCache}
                isCollapsed={state.collapsedFactions.has(Number(factionId))}
                onToggleCollapse={() =>
                  setState((prev) => {
                    const next = new Set(prev.collapsedFactions);
                    if (next.has(Number(factionId))) next.delete(Number(factionId));
                    else next.add(Number(factionId));
                    return { ...prev, collapsedFactions: next };
                  })
                }
                settings={settings}
              />
            );
          })}

          {filteredAndSortedBounties.length === 0 && (
            <div className="p-4 text-center text-gray-400">No bounties match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
};
