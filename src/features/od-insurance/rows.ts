// The insured drugs on item.php: Ecstasy (197) and Xanax (206). The child
// combinator matters: each row also holds a Trash action
// (li.dump[data-item]) with the same item ID. ul.items-cont covers every
// panel, including the search panel.
const OD_ROW_SELECTOR = [197, 206]
  .map((id) => `ul.items-cont > li[data-item="${id}"]`)
  .join(", ");

/** Set on a row once it has a slot, so a rescan skips it. */
export const OD_ROW_MARK = "data-ff-od";
const SLOT_ATTR = "data-ff-od-slot";

/**
 * Adds a button slot to each insured row that has none yet, and returns the
 * new slots. The slot goes inside .name-wrap, after the item name and
 * quantity. .name-wrap has a fixed width and fills the floated .title, so a
 * slot after it widens .title and pushes Torn's action icons onto a second
 * line. Inside, the free space between the name and the right edge holds the
 * button. TornTools puts its price there too, absolutely positioned at the
 * right, so the slot goes before that price.
 */
export function add_row_slots(root: ParentNode): HTMLElement[] {
  const added: HTMLElement[] = [];
  for (const row of root.querySelectorAll(OD_ROW_SELECTOR)) {
    if (row.hasAttribute(OD_ROW_MARK)) continue;
    const name = row.querySelector(".title > .name-wrap");
    if (!name) continue;
    const slot = document.createElement("span");
    slot.setAttribute(SLOT_ATTR, "");
    name.insertBefore(slot, name.querySelector(":scope > .tt-item-price"));
    row.setAttribute(OD_ROW_MARK, "");
    added.push(slot);
  }
  return added;
}

/** Removes every slot and row mark, so a later scan starts over. */
export function remove_row_slots(root: ParentNode): void {
  for (const slot of root.querySelectorAll(`[${SLOT_ATTR}]`)) slot.remove();
  for (const row of root.querySelectorAll(`[${OD_ROW_MARK}]`)) {
    row.removeAttribute(OD_ROW_MARK);
  }
}
