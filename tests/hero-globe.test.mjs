import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { initHeroGlobe } from "../src/scripts/hero-globe.js";

function setup(t, { reduced = false, mobile = false } = {}) {
  const dom = new JSDOM('<div><canvas data-hero-globe></canvas></div>', { pretendToBeVisual: true });
  const win = dom.window;
  const canvas = win.document.querySelector('canvas');
  const frames = new Map();
  let next = 0;
  let draws = 0;
  let visible;
  let mask;
  let pixelReads = 0;
  win.Image = class { constructor() { mask = this; } };
  win.HTMLCanvasElement.prototype.getContext = () => ({
    drawImage() {},
    getImageData() {
      pixelReads++;
      return { data: new Uint8ClampedArray(720 * 360 * 4).fill(255) };
    },
  });
  const queries = new Map();
  win.matchMedia = (query) => {
    const media = new win.EventTarget();
    media.matches = query.includes('reduced') ? reduced : mobile;
    queries.set(query, media);
    return media;
  };
  win.requestAnimationFrame = (callback) => { frames.set(++next, callback); return next; };
  win.cancelAnimationFrame = (id) => frames.delete(id);
  win.ResizeObserver = class { observe() {} disconnect() {} };
  win.IntersectionObserver = class {
    constructor(callback) { visible = (value) => callback([{ isIntersecting: value }]); }
    observe() {} disconnect() {}
  };
  canvas.getBoundingClientRect = () => ({ width: 400, height: 400 });
  canvas.getContext = () => ({
    setTransform() {}, clearRect() { draws++; }, beginPath() {},
    arc() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {},
  });
  const cleanup = initHeroGlobe(win.document);
  t.after(() => { cleanup(); dom.window.close(); });
  return { win, frames, queries, visible, cleanup, mask, pixelReads: () => pixelReads, draws: () => draws };
}

test('reduced motion draws a static globe without an animation loop', (t) => {
  const globe = setup(t, { reduced: true });
  globe.visible(true);
  assert.ok(globe.draws() > 0);
  assert.equal(globe.frames.size, 0);
});

test('mobile renders statically without an animation loop', (t) => {
  const globe = setup(t, { mobile: true });
  globe.visible(true);
  assert.ok(globe.draws() > 0);
  assert.equal(globe.frames.size, 0);
});

test('animation pauses outside the viewport and reacts to motion preference changes', (t) => {
  const globe = setup(t);
  globe.visible(true);
  assert.equal(globe.frames.size, 1);
  globe.visible(false);
  assert.equal(globe.frames.size, 0);
  globe.visible(true);
  const media = globe.queries.get('(prefers-reduced-motion: reduce)');
  media.matches = true;
  media.dispatchEvent(new globe.win.Event('change'));
  assert.equal(globe.frames.size, 0);
  media.matches = false;
  media.dispatchEvent(new globe.win.Event('change'));
  assert.equal(globe.frames.size, 1);
});

test('missing canvas or unavailable 2D context leaves the page usable', () => {
  const dom = new JSDOM('<canvas data-hero-globe></canvas>');
  dom.window.document.querySelector('canvas').getContext = () => null;
  assert.doesNotThrow(() => initHeroGlobe(dom.window.document));
  dom.window.document.querySelector('canvas').remove();
  assert.doesNotThrow(() => initHeroGlobe(dom.window.document));
  dom.window.close();
});


test('hidden documents suspend rendering and cleanup cancels pending frames', (t) => {
  const globe = setup(t);
  globe.visible(true);
  assert.equal(globe.frames.size, 1);
  Object.defineProperty(globe.win.document, 'hidden', { value: true, configurable: true });
  globe.win.document.dispatchEvent(new globe.win.Event('visibilitychange'));
  assert.equal(globe.frames.size, 0);
  Object.defineProperty(globe.win.document, 'hidden', { value: false, configurable: true });
  globe.win.document.dispatchEvent(new globe.win.Event('visibilitychange'));
  assert.equal(globe.frames.size, 1);
  globe.cleanup();
  assert.equal(globe.frames.size, 0);
});

test('geographic conversion preserves unit radius, hemispheres and Rio coordinates', async () => {
  const { lonLatToSphere } = await import('../src/scripts/hero-globe.js');
  assert.equal(typeof lonLatToSphere, 'function');
  const origin = lonLatToSphere(0, 0);
  assert.deepEqual(origin, { x: 0, y: -0, z: 1 });
  const north = lonLatToSphere(0, 90);
  assert.ok(Math.abs(north.y + 1) < 1e-12);
  const rio = lonLatToSphere(-43.1729, -22.9068);
  assert.ok(rio.x < 0 && rio.y > 0 && rio.z > 0);
  assert.ok(Math.abs(Math.hypot(rio.x, rio.y, rio.z) - 1) < 1e-12);
});

test('mask sampling is deterministic, selects only opaque white land and maps pixel centers', async () => {
  const { sampleLandPoints } = await import('../src/scripts/hero-globe.js');
  assert.equal(typeof sampleLandPoints, 'function');
  const data = new Uint8ClampedArray(8 * 4 * 4);
  // One land pixel near the equator; all other pixels are transparent ocean.
  data.set([255, 255, 255, 255], (2 * 8 + 4) * 4);
  const points = sampleLandPoints(data, 8, 4, 1);
  assert.equal(points.length, 1);
  assert.deepEqual(points, sampleLandPoints(data, 8, 4, 1));
  assert.ok(points[0].x > 0 && points[0].y > 0 && points[0].z > 0);
  data.set([0, 0, 0, 255], (2 * 8 + 4) * 4);
  assert.equal(sampleLandPoints(data, 8, 4, 1).length, 0);
});


test('loaded land is drawn in reduced motion and pixel data is read only once across resize', (t) => {
  const globe = setup(t, { reduced: true });
  const before = globe.draws();
  globe.mask.onload();
  assert.ok(globe.draws() > before);
  assert.equal(globe.pixelReads(), 1);
  assert.equal(globe.frames.size, 0);
  const media = globe.queries.get('(max-width: 760px)');
  media.matches = true;
  media.dispatchEvent(new globe.win.Event('change'));
  assert.equal(globe.pixelReads(), 1);
  assert.equal(globe.frames.size, 0);
});

test('mask failure retains the rendered fallback and cleanup ignores a late image load', (t) => {
  const globe = setup(t);
  assert.ok(globe.draws() > 0);
  assert.doesNotThrow(() => globe.mask.onerror());
  globe.visible(true);
  assert.equal(globe.frames.size, 1);
  const lateLoad = globe.mask.onload;
  globe.cleanup();
  lateLoad();
  assert.equal(globe.pixelReads(), 0);
  assert.equal(globe.frames.size, 0);
});

test('weak perspective stays finite and limits near/far magnification', async () => {
  const { projectPoint } = await import('../src/scripts/hero-globe.js');
  assert.equal(typeof projectPoint, 'function');
  const output = {};
  for (const z of [-1, 0, 1]) {
    assert.equal(projectPoint({ x: 0, y: 0, z }, 0, 0, 480, output), output);
    assert.ok(Object.values(output).every(Number.isFinite));
    assert.ok(output.scale > 0.92 && output.scale < 1.1);
  }
});

test('depth fade is smooth, bounded and leaves only a faint rear limb', async () => {
  const { depthAlpha, pointRadius } = await import('../src/scripts/hero-globe.js');
  assert.equal(typeof depthAlpha, 'function');
  assert.equal(typeof pointRadius, 'function');
  assert.equal(depthAlpha(-2), 0);
  assert.ok(depthAlpha(0) > 0 && depthAlpha(0) < 0.06);
  assert.ok(depthAlpha(2) <= 0.85);
  let previous = 0;
  for (let z = -1; z <= 1; z += 0.01) {
    const alpha = depthAlpha(z);
    assert.ok(alpha >= previous && alpha - previous < 0.02);
    previous = alpha;
    assert.ok(pointRadius(z, false) >= 0.45 && pointRadius(z, false) <= 0.6);
    assert.ok(pointRadius(z, true) >= 0.6 && pointRadius(z, true) <= 0.8);
  }
});

test('ocean ghosts are deterministic and excluded from land', async () => {
  const { sampleOceanPoints, sampleLandPoints } = await import('../src/scripts/hero-globe.js');
  assert.equal(typeof sampleOceanPoints, 'function');
  const data = new Uint8ClampedArray(720 * 360 * 4);
  assert.equal(sampleOceanPoints(data, 720, 360, 100).length, 100);
  assert.deepEqual(sampleOceanPoints(data, 720, 360, 100), sampleOceanPoints(data, 720, 360, 100));
  data.fill(255);
  assert.equal(sampleOceanPoints(data, 720, 360, 100).length, 0);
  assert.ok(sampleLandPoints(data, 720, 360, 6).length < sampleLandPoints(data, 720, 360, 3).length / 3);
});


test('weak perspective preserves the previous globe silhouette radius', async () => {
  const { projectPoint } = await import('../src/scripts/hero-globe.js');
  const size = 480;
  const z = 1 / 12;
  const edge = projectPoint({ x: Math.sqrt(1 - z * z), y: 0, z }, 0, 0, size, {});
  const previousRadius = size * 0.32 * 3.8 / Math.sqrt(3.8 ** 2 - 1);
  assert.ok(Math.abs(edge.x - size / 2 - previousRadius) < 1e-9);
});
