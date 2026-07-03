export function isInPDA(): boolean {
  return (
    typeof window !== "undefined" && typeof window.PDA_httpGet === "function"
  );
}
