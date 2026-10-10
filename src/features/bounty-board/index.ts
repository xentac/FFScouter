```typescript
import { Feature } from '../../types/feature';
import { BountyModal } from './components/BountyModal';
import { getBountySettings, updateBountySetting } from './settings';
import { FFScouterSettings } from './types';
import { torn_page } from '../../utils/torn-utils';

export const BountyBoardFeature: Feature = {
  id: 'bounty-board',
  name: 'FF Scouter Bounty Board',
  description: 'Desktop modal for tracking Torn Bounties via FF Scouter.',
  
  isEnabled: (): boolean => {
    const settings = getBountySettings();
    return settings.bountyMasterToggle;
  },

  onNavigation: (hash: string) => {
    if (hash === '#!p=main' && torn_page() === 'bounties') {
      return {
        mount: (container: HTMLElement, props: any) => {
          const root = document.createElement('div');
          container.appendChild(root);
          
          const render = () => {
            const settings = getBountySettings();
            ReactDOM.render(
              <BountyModal 
                settings={settings} 
                ffStatsCache={props.ffStatsCache || {}} 
                onClose={() => {}} 
              />,
              root
            );
          };

          render();

          return {
            unmount: () => {
              ReactDOM.unmountComponentAtNode(root);
              root.remove();
            },
            update: (newProps: any) => {
              // Handle prop updates if needed
            }
          };
        },
      };
    }
    return null;
  },

  settingsPanel: {
    title: 'Bounty Board Settings',
    fields: [
      {
        key: 'bountyMasterToggle',
        label: 'Enable Bounty Board',
        type: 'toggle',
        defaultValue: true,
        onChange: (value: boolean) => updateBountySetting('bountyMasterToggle', value),
      },
      {
        key: 'attackOpenBehavior',
        label: 'Attack Link Behavior',
        type: 'select',
        options: [
          { value: 'new_tab', label: 'Open in New Tab' },
          { value: 'same_window', label: 'Open in Same Window' },
        ],
        defaultValue: 'new_tab',
        onChange: (value: string) => updateBountySetting('attackOpenBehavior', value),
      },
    ],
  },
};
