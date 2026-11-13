// The item.php rows of the given Torn item IDs. The child combinator
// matters: each row also holds a Trash action (li.dump[data-item]) with the
// same item ID. ul.items-cont covers every panel, including the search panel.
const row_selector = (item_ids: readonly number[]) =>
  item_ids.map((id) => `ul.items-cont > li[data-item="${id}"]`).join(", ");

/** Set on a row once it has a slot, so a rescan skips it. */
export const OD_ROW_MARK = "data-ff-od";
const SLOT_ATTR = "data-ff-od-slot";

/**
 * Adds a button slot to each row of the given items that has none yet, and
 * returns the new slots. The item IDs come from the plans' covered items.
 * The slot goes inside .name-wrap, after the item name and quantity.
 * .name-wrap has a fixed width and fills the floated .title, so a
 * slot after it widens .title and pushes Torn's action icons onto a second
 * line. Inside, the free space between the name and the right edge holds the
 * button. TornTools puts its price there too, absolutely positioned at the
 * right, so the slot goes before that price.
 */
export function add_row_slots(
  root: ParentNode,
  item_ids: readonly number[],
): HTMLElement[] {
  const added: HTMLElement[] = [];
  if (item_ids.length === 0) return added;
  for (const row of root.querySelectorAll(row_selector(item_ids))) {
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
