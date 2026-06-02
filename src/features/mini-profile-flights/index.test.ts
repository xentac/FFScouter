// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import miniProfileFlights from "./index";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("shouldRun returns true", async () => {
  const result = await miniProfileFlights.shouldRun();
  expect(result).toBe(true);
});

test("adds flight tracker element if player is travelling", async () => {
  // Create mini profile root
  const root = document.createElement("div");
  root.id = "profile-mini-root";

  // Anchor with player ID
  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123456";
  root.appendChild(anchor);

  // Status
  const status = document.createElement("div");
  status.className = "profile-status travelling";
  const desc = document.createElement("div");
  desc.className = "description";
  status.appendChild(desc);
  root.appendChild(status);

  document.body.appendChild(root);

  // Run the feature
  await miniProfileFlights.run();

  // Verify that the element was added to description
  const tracker = desc.querySelector("ff-flight-profile-status");
  expect(tracker).not.toBeNull();
  expect((tracker as any).playerId).toBe(123456);
  expect((tracker as any).compact).toBe(true);
});

test("does not add flight tracker if player is not travelling", async () => {
  // Create mini profile root
  const root = document.createElement("div");
  root.id = "profile-mini-root";

  // Anchor with player ID
  const anchor = document.createElement("a");
  anchor.href = "https://www.torn.com/profiles.php?XID=123456";
  root.appendChild(anchor);

  // Status
  const status = document.createElement("div");
  status.className = "profile-status hospital";
  const desc = document.createElement("div");
  desc.className = "description";
  status.appendChild(desc);
  root.appendChild(status);

  document.body.appendChild(root);

  // Run the feature
  await miniProfileFlights.run();

  // Verify that the element was not added to description
  const tracker = desc.querySelector("ff-flight-profile-status");
  expect(tracker).toBeNull();
});
