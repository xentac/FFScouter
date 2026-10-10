```typescript
import { PolicyVersion } from './types';

export const API_ENDPOINTS = {
  BOARD: '/v4/bounty-board',
  CONSENT: '/v4/bounty-board/consent',
  ATTACK: '/attack',
};

export const DEFAULT_SETTINGS = {
  bountyMasterToggle: true,
  attackOpenBehavior: 'new_tab' as const,
};

export const CODE_86_CONSENT_REQUIRED = 86;

export const REFERRER_PLAYER_ID = 0; // Placeholder, needs maintainer ID
