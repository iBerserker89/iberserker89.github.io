import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { initPlayground } from "../src/scripts/playground.js";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

function createDom(t) {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  initPlayground(dom.window.document);

  return dom;
}

test("viewport switcher exposes three interactive controls", (t) => {
  const dom = createDom(t);

  const buttons = dom.window.document.querySelectorAll(
    ".viewport-switcher button",
  );

  assert.equal(buttons.length, 3);
});

test("desktop viewport is selected by default", (t) => {
  const dom = createDom(t);

  const buttons = dom.window.document.querySelectorAll(
    ".viewport-switcher button",
  );

  assert.equal(buttons[0].getAttribute("aria-pressed"), "true");
  assert.equal(buttons[1].getAttribute("aria-pressed"), "false");
  assert.equal(buttons[2].getAttribute("aria-pressed"), "false");
});

test("clicking mobile selects the mobile viewport", (t) => {
  const dom = createDom(t);

  const buttons = dom.window.document.querySelectorAll(
    ".viewport-switcher button",
  );

  buttons[2].click();

  assert.equal(buttons[0].getAttribute("aria-pressed"), "false");
  assert.equal(buttons[2].getAttribute("aria-pressed"), "true");
});

test("clicking mobile updates the preview viewport", (t) => {
  const dom = createDom(t);

  const mobileButton = dom.window.document.querySelector(
    '[data-viewport="mobile"]',
  );

  const preview = dom.window.document.querySelector(".component-preview");

  mobileButton.click();

  assert.equal(preview.dataset.viewport, "mobile");
});

test("preview starts in desktop viewport", (t) => {
  const dom = createDom(t);

  const preview = dom.window.document.querySelector(".component-preview");

  assert.equal(preview.dataset.viewport, "desktop");
});

test("switching through every viewport keeps exactly one pressed control", (t) => {
  const dom = createDom(t);
  const document = dom.window.document;
  const buttons = [...document.querySelectorAll(".viewport-switcher button")];

  for (const viewport of ["mobile", "tablet", "desktop", "desktop"]) {
    buttons.find((button) => button.dataset.viewport === viewport).click();
    assert.deepEqual(
      buttons.filter((button) => button.getAttribute("aria-pressed") === "true")
        .map((button) => button.dataset.viewport),
      [viewport],
    );
    assert.equal(document.querySelector(".component-preview").dataset.viewport, viewport);
  }
});
