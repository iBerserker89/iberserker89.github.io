import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const script = await readFile(new URL("../script/script.js", import.meta.url),"utf8");

function createDom() {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
  });

  dom.window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  });

  dom.window.eval(script);

  return dom;
}

test("viewport switcher exposes three interactive controls", () => {
  const dom = createDom();

  const buttons = dom.window.document.querySelectorAll(
    ".viewport-switcher button",
  );

  assert.equal(buttons.length, 3);
});

test("desktop viewport is selected by default", () => {
  const dom = createDom();

  const buttons = dom.window.document.querySelectorAll(
    ".viewport-switcher button",
  );

  assert.equal(buttons[0].getAttribute("aria-pressed"), "true");
  assert.equal(buttons[1].getAttribute("aria-pressed"), "false");
  assert.equal(buttons[2].getAttribute("aria-pressed"), "false");
});

test("clicking mobile selects the mobile viewport", () => {
  const dom = createDom();

  const buttons = dom.window.document.querySelectorAll(
    ".viewport-switcher button",
  );

  buttons[2].click();

  assert.equal(buttons[0].getAttribute("aria-pressed"), "false");
  assert.equal(buttons[2].getAttribute("aria-pressed"), "true");
});

test("clicking mobile updates the preview viewport", () => {
  const dom = createDom();

  const mobileButton = dom.window.document.querySelector(
    '[data-viewport="mobile"]',
  );

  const preview = dom.window.document.querySelector(".component-preview");

  mobileButton.click();

  assert.equal(preview.dataset.viewport, "mobile");
});

test("preview starts in desktop viewport", () => {
  const dom = createDom();

  const preview = dom.window.document.querySelector(".component-preview");

  assert.equal(preview.dataset.viewport, "desktop");
});
