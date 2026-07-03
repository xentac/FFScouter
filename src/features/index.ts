import type { Feature } from "./feature";

// Automatically discovers all features in the subdirectories.
// Yes, it IS possible! Dynamic imports/Vite glob to the rescue! :D
const modules = import.meta.glob<{ default: Feature }>("./*/index.ts", {
  eager: true,
});

export const Features: Feature[] = Object.values(modules)
  .map((mod) => mod.default)
  .filter(
    (feat): feat is Feature =>
      !!feat && "name" in feat && feat.name !== "Test Feature!",
  );
