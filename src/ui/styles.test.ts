// @vitest-environment jsdom

import * as fs from "node:fs";
import * as path from "node:path";
import { beforeAll, expect, test } from "vitest";

beforeAll(() => {
  const css = fs.readFileSync(path.resolve(__dirname, "styles.css"), "utf-8");
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
});

// Advanced Search row markup, reduced to the path a user reported from a
// page that lagged on scroll (animated faction tags).
test("faction tag images get their own compositor layer", () => {
  document.body.innerHTML = `
    <div class="userlist-wrapper"><ul class="user-info-list-wrap"><li class="user1">
      <div class="expander clearfix torn-divider divider-vertical">
        <a class="user faction gold" href="/factions.php?step=profile&amp;ID=1">
          <img src="https://factiontags.torn.com/1-1.gif" alt="TAG">
        </a>
      </div>
    </li></ul></div>`;
  const img = document.querySelector("a.user.faction img");
  expect(img).not.toBeNull();
  expect(getComputedStyle(img as Element).getPropertyValue("will-change")).toBe(
    "transform",
  );
});

test("other images do not get a compositor layer", () => {
  document.body.innerHTML = `<a class="user name"><img src="/images/honors/1/f.png"></a>`;
  const img = document.querySelector("img");
  expect(
    getComputedStyle(img as Element).getPropertyValue("will-change"),
  ).not.toBe("transform");
});
