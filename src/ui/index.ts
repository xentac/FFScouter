import "./styles.css";

/*
This is obviously personal preference but I'd see components work as such:
- components
  - styles.css (shared styles)
  - component_name
    - index.ts (jquery shit, exports a function that returns the component)
    - styles.css (styles specific to that component)
*/

export const init_ui = () => {};
