import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { initNavigation } from "../src/scripts/navigation.js";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

function createNavigation(t, mobile = true) {
  const dom = new JSDOM(html);
  t.after(() => dom.window.close());
  const media = new dom.window.EventTarget();
  media.matches = mobile;
  dom.window.matchMedia = (query) => {
    assert.equal(query, "(max-width: 760px)");
    return media;
  };
  const document = dom.window.document;
  initNavigation(document);
  return {
    dom, media, document,
    button: document.querySelector(".menu-toggle"),
    menu: document.querySelector("#navigation"),
  };
}

test("mobile menu initializes closed and toggles accessible state", (t) => {
  const { button, menu } = createNavigation(t);
  assert.equal(button.hidden, false);
  assert.equal(button.getAttribute("aria-controls"), menu.id);
  for (const open of [false, true, false]) {
    assert.equal(button.getAttribute("aria-expanded"), String(open));
    assert.equal(button.getAttribute("aria-label"), open ? "Fechar menu" : "Abrir menu");
    assert.equal(menu.classList.contains("is-collapsed"), !open);
    button.click();
  }
});

test("Escape closes navigation and returns focus to its toggle", (t) => {
  const { dom, document, button, menu } = createNavigation(t);
  button.click();
  menu.querySelector("a").focus();
  document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape" }));
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(menu.classList.contains("is-collapsed"), true);
  assert.equal(document.activeElement, button);
});

test("navigation links close the mobile menu and reference real sections", (t) => {
  const { document, button, menu } = createNavigation(t);
  for (const link of menu.querySelectorAll("a")) {
    assert.ok(document.getElementById(link.hash.slice(1)));
    button.click();
    link.click();
    assert.equal(button.getAttribute("aria-expanded"), "false");
    assert.equal(menu.classList.contains("is-collapsed"), true);
  }
});

test("breakpoint changes reset open state and keep desktop navigation visible", (t) => {
  const { dom, media, button, menu } = createNavigation(t, false);
  assert.equal(menu.classList.contains("is-collapsed"), false);
  media.matches = true;
  media.dispatchEvent(new dom.window.Event("change"));
  assert.equal(menu.classList.contains("is-collapsed"), true);
  button.click();
  media.matches = false;
  media.dispatchEvent(new dom.window.Event("change"));
  assert.equal(menu.classList.contains("is-collapsed"), false);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  media.matches = true;
  media.dispatchEvent(new dom.window.Event("change"));
  assert.equal(menu.classList.contains("is-collapsed"), true);
});
