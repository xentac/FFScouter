import logger from "./logger";

const log = logger.child("clipboard");

// execCommand("copy") needs a selected, focusable field in the document. The
// field is off-screen and read-only so it neither shows nor opens a mobile
// keyboard.
function copy_with_exec_command(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  try {
    field.focus();
    field.select();
    return document.execCommand("copy");
  } catch (err) {
    log.debug("execCommand copy threw", err);
    return false;
  } finally {
    field.remove();
  }
}

/**
 * Copies text to the clipboard. Tries the Clipboard API first, then
 * execCommand("copy"). Resolves false when neither worked, so the caller can
 * tell the player to select the text by hand. In Torn PDA the Clipboard API
 * is often missing and execCommand can fail once the tap has ended.
 */
export async function copy_text(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      log.debug("Clipboard API refused, trying execCommand", err);
    }
  }
  return copy_with_exec_command(text);
}
