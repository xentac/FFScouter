import logger from "@utils/logger";

const log = logger.child("ui");

export enum TOAST_LEVEL {
  DEBUG,
  INFO,
  WARNING,
  ERROR,
}

const TOAST_COLOURS: Record<TOAST_LEVEL, string> = {
  [TOAST_LEVEL.DEBUG]: "blue",
  [TOAST_LEVEL.INFO]: "green",
  [TOAST_LEVEL.WARNING]: "orange",
  [TOAST_LEVEL.ERROR]: "#c62828",
};

function get_toast_colour(level: TOAST_LEVEL): string {
  return TOAST_COLOURS[level];
}

export function toast(message: string, level: TOAST_LEVEL = TOAST_LEVEL.INFO) {
  const existing = document.getElementById("ffscouter-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "ffscouter-toast";
  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.color = "#fff";
  toast.style.padding = "8px 16px";
  toast.style.borderRadius = "8px";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 2px 12px rgba(0,0,0,0.2)";
  toast.style.zIndex = "2147483647";
  toast.style.opacity = "1";
  toast.style.transition = "opacity 0.5s";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "×";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.marginLeft = "8px";
  closeBtn.style.fontWeight = "bold";
  closeBtn.style.fontSize = "18px";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.onclick = () => toast.remove();

  toast.style.background = get_toast_colour(level);

  const msg = document.createElement("span");
  if (
    message ===
    "Invalid API key. Please sign up at ffscouter.com to use this service"
  ) {
    msg.innerHTML =
      'FairFight Scouter V2: Invalid API key. Please sign up at <a href="https://ffscouter.com" target="_blank" style="color: #fff; text-decoration: underline; font-weight: bold;">ffscouter.com</a> to use this service. Register the API key with the script.';
  } else {
    msg.textContent = `FairFight Scouter V2: ${message}`;
  }

  log.info("[FF Scouter V2] Toast: ", message);

  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 500);
    }
  }, 4000);
}
