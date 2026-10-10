```typescript
import { FFScouterSettings } from '../features/bounty-board/types';
import { getBountySettings } from '../features/bounty-board/settings';

// Merge global settings with feature-specific settings
export function getGlobalSettings(): FFScouterSettings & Record<string, any> {
  const bountySettings = getBountySettings();
  
  return {
    ...bountySettings,
    // Other global settings would go here
  };
}
