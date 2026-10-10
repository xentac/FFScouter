```typescript
import { FFScouterSettings, DEFAULT_SETTINGS } from './types';

export const BOUNTY_SETTINGS_KEYS = {
  MASTER_TOGGLE: 'ffscouter_bounty_master_toggle',
  ATTACK_BEHAVIOR: 'ffscouter_bounty_attack_behavior',
} as const;

export function getBountySettings(): FFScouterSettings {
  const masterToggle = localStorage.getItem(BOUNTY_SETTINGS_KEYS.MASTER_TOGGLE);
  const attackBehavior = localStorage.getItem(BOUNTY_SETTINGS_KEYS.ATTACK_BEHAVIOR);

  return {
    bountyMasterToggle: masterToggle === 'false' ? false : true, // Default on
    attackOpenBehavior: (attackBehavior as 'new_tab' | 'same_window') || DEFAULT_SETTINGS.attackOpenBehavior,
  };
}

export function updateBountySetting(key: keyof FFScouterSettings, value: any) {
  if (key === 'bountyMasterToggle') {
    localStorage.setItem(BOUNTY_SETTINGS_KEYS.MASTER_TOGGLE, String(value));
  } else if (key === 'attackOpenBehavior') {
    localStorage.setItem(BOUNTY_SETTINGS_KEYS.ATTACK_BEHAVIOR, value);
  }
}
