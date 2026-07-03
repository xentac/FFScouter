import { type Feature, StartTime } from "@features/feature";
import { wait_for_element } from "@utils/dom";

// TODO: Replace with the actual Greasyfork install URL once the script is created
const BETA_INSTALL_URL =
  "https://greasyfork.org/en/scripts/582442-ff-scouter-v2-beta";

async function show_banner() {
  const wrapper = await wait_for_element(".content-wrapper", 10_000);
  if (!wrapper) return;

  const banner = document.createElement("div");
  banner.id = "ffscouter-deprecation-banner";
  banner.style.cssText = [
    "background: #e65100",
    "color: #fff",
    "padding: 10px 16px",
    "font-size: 14px",
    "display: flex",
    "align-items: center",
    "justify-content: space-between",
    "gap: 12px",
    "z-index: 9999",
    "box-sizing: border-box",
    "width: 100%",
  ].join(";");

  const msg = document.createElement("span");
  msg.innerHTML =
    `This version of FF Scouter is no longer maintained. ` +
    `<a href="${BETA_INSTALL_URL}" target="_blank" rel="noopener noreferrer" ` +
    `style="color: #fff; font-weight: bold; text-decoration: underline;">` +
    `Install FF Scouter V2 beta</a> to keep receiving updates.`;

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.style.cssText = [
    "background: none",
    "border: none",
    "color: #fff",
    "font-size: 20px",
    "font-weight: bold",
    "cursor: pointer",
    "padding: 0",
    "line-height: 1",
    "flex-shrink: 0",
  ].join(";");
  closeBtn.onclick = () => banner.remove();

  banner.appendChild(msg);
  banner.appendChild(closeBtn);
  wrapper.prepend(banner);
}

const deprecation_notice: Feature = {
  name: "Deprecation Notice",
  description:
    "Notifies users of retired editions to install FF Scouter V2 beta",
  executionTime: StartTime.DocumentBody,

  async shouldRun() {
    return (
      __FF_SCOUTER_EDITION__ === "xentac" || __FF_SCOUTER_EDITION__ === "v3"
    );
  },

  async run() {
    await show_banner();
  },
};

export default deprecation_notice;
