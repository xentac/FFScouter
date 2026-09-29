import { Feature } from '@/core/Feature';
import { torn_page, on_navigation } from '@/utils/page-detection';
import { BountyModal } from './BountyModal';
import { BountySettings } from './BountySettings';
import { BountyConsent } from './BountyConsent';
import { BountyKeyGate } from './BountyKeyGate';

export class BountyModalFeature implements Feature {
  private modal?: BountyModal;
  private settings?: BountySettings;
  private consent?: BountyConsent;
  private keyGate?: BountyKeyGate;

  constructor() {
    this.modal = new BountyModal();
    this.settings = new BountySettings();
    this.consent = new BountyConsent();
    this.keyGate = new BountyKeyGate();
  }

  public init(): void {
    if (!torn_page()) return;

    on_navigation(() => {
      if (window.location.hash === '#!p=main') {
        this.mount();
      } else {
        this.unmount();
      }
    });

    this.mount();
  }

  private mount(): void {
    this.modal?.mount();
    this.settings?.mount();
    this.consent?.mount();
    this.keyGate?.mount();
  }

  private unmount(): void {
    this.modal?.unmount();
    this.settings?.unmount();
    this.consent?.unmount();
    this.keyGate?.unmount();
  }
}