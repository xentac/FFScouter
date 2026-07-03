import type { ReactNode } from "react";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";

// Creates a display:contents container so React's mount div doesn't affect
// the parent's layout (flex/grid children, CSS sibling selectors, etc.).
export function mountComponent(element: ReactNode, parent: Element): Root {
  const container = document.createElement("div");
  container.style.display = "contents";
  parent.appendChild(container);
  const root = createRoot(container);
  root.render(element);
  return root;
}
