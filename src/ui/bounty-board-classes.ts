import styles from "./bounty-board.module.css";

// Local aliases for the BEM module classes, shared by the modal shell and the
// row components. The keys are hyphenated, so they are bracket-accessed once
// here and referenced by short name in the renders.
export const cls = {
  modal: styles["ff-bounty-modal"],
  modalMinimized: styles["ff-bounty-modal--minimized"],
  header: styles["ff-bounty-modal__header"],
  title: styles["ff-bounty-modal__title"],
  headerBtn: styles["ff-bounty-modal__header-btn"],
  body: styles["ff-bounty-modal__body"],
  notice: styles["ff-bounty-modal__notice"],
  primaryBtn: styles["ff-bounty-modal__primary-btn"],
  filters: styles["ff-bounty-modal__filters"],
  filter: styles["ff-bounty-modal__filter"],
  list: styles["ff-bounty-modal__list"],
  row: styles["ff-bounty-modal__row"],
  rowMain: styles["ff-bounty-modal__row-main"],
  name: styles["ff-bounty-modal__name"],
  estimate: styles["ff-bounty-modal__estimate"],
  tierLabel: styles["ff-bounty-modal__tier-label"],
  tierToggle: styles["ff-bounty-modal__tier-toggle"],
  tierLadder: styles["ff-bounty-modal__tier-ladder"],
  action: styles["ff-bounty-modal__action"],
  factionCard: styles["ff-bounty-modal__faction-card"],
  factionHeader: styles["ff-bounty-modal__faction-header"],
  pool: styles["ff-bounty-modal__pool"],
  memberList: styles["ff-bounty-modal__member-list"],
  own: styles["ff-bounty-modal--own"],
  ownLabel: styles["ff-bounty-modal__own-label"],
};
