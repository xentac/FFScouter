import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("ff-settings-panel")
export class FFSettingsPanel extends LitElement {
  static override styles = css`
    .accordion {
      margin: 10px 0;
      padding: 15px;
      background-color: #333;
      border: 1px solid #444;
      border-radius: 5px;
      color: #ccc;
    }
    .input-row {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin-bottom: 15px;
    }
    input[type="text"] {
      padding: 8px;
      background-color: #504f4f;
      color: white;
      border: 1px solid #444;
      border-radius: 3px;
    }
    .btn-save {
      padding: 8px 16px;
      background-color: #4caf50;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-save:hover {
      background-color: #45a049;
    }
    .preview {
      font-size: 12px;
      color: #888;
      margin-top: 5px;
    }
  `;

  // Inject the API key (data)
  @property({ type: String }) apiKey = "";
  // Inject the save handler (function)

  // 1. DRAFT STATE: Track the unsaved inputs
  @state()
  private draftApiKey = "";

  // Track if settings were recently saved to show a message
  @state() private showSavedMessage = false;

  override connectedCallback() {
    super.connectedCallback();
    this.draftApiKey = this.apiKey;
  }

  // 2. Update ONLY the draft state as the user types
  private onKeyInput(e: InputEvent) {
    this.draftApiKey = (e.target as HTMLInputElement).value;
    this.showSavedMessage = false; // Hide "Saved!" indicator if they start editing again
  }

  // 3. Commit drafts to actual configuration on click
  private handleSave() {
    // Dispatch a native DOM event containing the new settings
    this.dispatchEvent(
      new CustomEvent("ff-save", {
        detail: { apiKey: this.draftApiKey },
        bubbles: true, // Let the event bubble up the DOM
        composed: true, // Let the event cross the Shadow DOM boundary
      }),
    );
  }

  override render() {
    return html`
      <details class="accordion">
        <summary style="cursor: pointer; font-weight: bold;">
          FF Scouter Settings
        </summary>

        <div style="margin-top: 15px;">
          <!-- Example 1: API Key input -->
          <div class="input-row">
            <label for="api-key">API Key:</label>
            <input
              id="api-key"
              type="text"
              placeholder="Paste your key here..."
              .value=${this.draftApiKey}
              @input=${this.onKeyInput}
            />
          </div>

          <!-- Save Button Area -->
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn-save" @click=${this.handleSave}>
              Save Settings
            </button>
            ${
              this.showSavedMessage
                ? html`<span style="color: #4CAF50;">✓ Saved!</span>`
                : ""
            }
          </div>
        </div>
      </details>
    `;
  }
}
