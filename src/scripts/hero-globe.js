// Longitude/latitude in degrees; north is negative canvas Y, Greenwich faces +Z.
export function lonLatToSphere(longitude, latitude) {
  const lon = longitude * Math.PI / 180;
  const lat = latitude * Math.PI / 180;
  return { x: Math.cos(lat) * Math.sin(lon), y: -Math.sin(lat),
    z: Math.cos(lat) * Math.cos(lon) };
}

export function sampleLandPoints(data, width, height, stride) {
  const points = [];
  for (let y = stride / 2; y < height; y += stride) {
    const latitude = 90 - y / height * 180;
    // Equalize surface spacing: longitude lines converge toward the poles.
    const stepX = stride / Math.max(0.08, Math.cos(latitude * Math.PI / 180));
    for (let x = stride / 2; x < width; x += stepX) {
      const pixel = (Math.floor(y) * width + Math.floor(x)) * 4;
      if (data[pixel] < 128 || data[pixel + 3] < 128) continue;
      const longitude = x / width * 360 - 180;
      points.push(lonLatToSphere(longitude, latitude));
    }
  }
  return points;
}

// Fibonacci sampling gives a repeatable, evenly distributed unit sphere.
function createPoints(count) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (2 * (index + 0.5)) / count;
    const radius = Math.sqrt(1 - y * y);
    const angle = index * goldenAngle;
    return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
  });
}

// Keep the existing screen-space silhouette while moving the camera farther away.
const CAMERA_DISTANCE = 12;
const SPHERE_RADIUS = 0.32 * 3.8 / Math.sqrt(3.8 ** 2 - 1);
const PROJECTION_RADIUS = SPHERE_RADIUS * Math.sqrt(1 - 1 / CAMERA_DISTANCE ** 2);

// Reuse the output object: projection must not allocate an object for every dot.
export function projectPoint(point, rotation, tilt, size, output) {
  const x = point.x * Math.cos(rotation) + point.z * Math.sin(rotation);
  const depth = -point.x * Math.sin(rotation) + point.z * Math.cos(rotation);
  const y = point.y * Math.cos(tilt) - depth * Math.sin(tilt);
  const z = point.y * Math.sin(tilt) + depth * Math.cos(tilt);
  const scale = CAMERA_DISTANCE / (CAMERA_DISTANCE - z);
  output.x = size / 2 + x * size * PROJECTION_RADIUS * scale;
  output.y = size / 2 + y * size * PROJECTION_RADIUS * scale;
  output.z = z;
  output.scale = scale;
  return output;
}

export function depthAlpha(z) {
  // Smoothstep includes a narrow, very faint rear band, with no opacity jump.
  const depth = Math.max(0, Math.min(1, (z + 0.15) / 1.15));
  return 0.8 * depth * depth * (3 - 2 * depth);
}

export function pointRadius(z, mobile) {
  const front = Math.max(0, Math.min(1, z));
  return (mobile ? 0.72 : 0.58) * (0.92 + 0.08 * front);
}

export function sampleOceanPoints(data, width, height, count) {
  return createPoints(count).filter((point) => {
    const longitude = Math.atan2(point.x, point.z);
    const latitude = Math.asin(-point.y);
    const x = Math.min(width - 1, Math.floor((longitude + Math.PI) / (2 * Math.PI) * width));
    const y = Math.min(height - 1, Math.floor((Math.PI / 2 - latitude) / Math.PI * height));
    const pixel = (y * width + x) * 4;
    return data[pixel] < 128 || data[pixel + 3] < 128;
  });
}

export function initHeroGlobe(root = document) {
  const canvas = root.querySelector('[data-hero-globe]');
  const context = canvas?.getContext('2d');
  if (!context) return () => {};

  const win = root.defaultView;
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = win.matchMedia('(max-width: 760px)');
  const styles = win.getComputedStyle(canvas);
  const white = styles.getPropertyValue('--color-text').trim() || '#f5f5f5';
  const red = styles.getPropertyValue('--color-accent').trim() || '#ef233c';
  const graphite = styles.getPropertyValue('--color-text-muted').trim() || '#8a8a8a';
  let geometry = { desktop: createPoints(1100), mobile: createPoints(420) };
  let oceanGeometry = { desktop: [], mobile: [] };
  let points = [];
  let oceanPoints = [];
  const projected = {};
  const rio = lonLatToSphere(-43.1729, -22.9068);
  let hasLand = false;
  let disposed = false;
  let size = 0;
  let angle = 0.45;
  let frame = 0;
  let lastTime = 0;
  let visible = false;

  // Y rotation and the original X tilt, now with weak perspective.
  function project(point, rotation = angle, tilt = -0.22) {
    return projectPoint(point, rotation, tilt, size, projected);
  }

  function drawPoints(cloud, ocean = false) {
    context.fillStyle = ocean ? graphite : white;
    for (const point of cloud) {
      project(point);
      const alpha = depthAlpha(projected.z);
      if (alpha < 0.001) continue;
      context.globalAlpha = alpha * (ocean ? 0.45 : 1);
      const radius = ocean ? 0.5 : pointRadius(projected.z, mobile.matches);
      context.beginPath();
      context.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawOrbit(index, front) {
    context.strokeStyle = index === 0 ? red : white;
    context.globalAlpha = front ? 0.18 : 0.045;
    context.lineWidth = 0.65;
    context.beginPath();
    let connected = false;
    for (let step = 0; step <= 150; step++) {
      const phase = (step / 150) * Math.PI * 1.75 + index;
      const point = project({ x: 1.27 * Math.cos(phase), y: 0,
        z: 1.27 * Math.sin(phase) }, 0.3 + index * 0.7, 0.55 + index * 0.7);
      if ((point.z >= 0) !== front) { connected = false; continue; }
      if (connected) context.lineTo(point.x, point.y);
      else context.moveTo(point.x, point.y);
      connected = true;
    }
    context.stroke();
  }

  function draw() {
    if (!size) return;
    context.clearRect(0, 0, size, size);
    const orbitCount = mobile.matches ? 1 : 2;
    for (let index = 0; index < orbitCount; index++) drawOrbit(index, false);
    // Preserve the existing thin rim and its exact screen-space radius.
    context.strokeStyle = white;
    context.globalAlpha = 0.1;
    context.lineWidth = 0.5;
    context.beginPath();
    context.arc(size / 2, size / 2, size * SPHERE_RADIUS, 0, Math.PI * 2);
    context.stroke();
    drawPoints(oceanPoints, true);
    drawPoints(points);
    for (let index = 0; index < orbitCount; index++) drawOrbit(index, true);
    if (hasLand) {
      const marker = project(rio);
      const visibility = Math.max(0, Math.min(1, (marker.z - 1 / CAMERA_DISTANCE) * 3));
      if (visibility > 0) {
        context.globalAlpha = visibility;
        context.fillStyle = red;
        context.beginPath();
        context.arc(marker.x, marker.y, 1.8, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = red;
        context.globalAlpha = visibility * 0.45;
        context.lineWidth = 0.7;
        context.beginPath();
        context.arc(marker.x, marker.y, 4, 0, Math.PI * 2);
        context.stroke();
      }
    }
    context.globalAlpha = 1;
  }

  function tick(time) {
    if (!lastTime) lastTime = time;
    const elapsed = time - lastTime;
    // Cap drawing at 30 fps, and avoid jumps when resuming a suspended tab.
    if (elapsed >= 1000 / 30) {
      angle += Math.min(elapsed, 100) * 0.000075;
      lastTime = time;
      draw();
    }
    frame = win.requestAnimationFrame(tick);
  }

  function syncMotion() {
    win.cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (visible && !root.hidden && !reduced.matches) {
      frame = win.requestAnimationFrame(tick);
    }
  }

  function resize() {
    size = canvas.getBoundingClientRect().width;
    const ratio = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = mobile.matches ? geometry.mobile : geometry.desktop;
    oceanPoints = mobile.matches ? oceanGeometry.mobile : oceanGeometry.desktop;
    draw();
    syncMotion();
  }

  const resizeObserver = new win.ResizeObserver(resize);
  const intersectionObserver = new win.IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncMotion();
  });
  resizeObserver.observe(canvas);
  intersectionObserver.observe(canvas);
  reduced.addEventListener('change', syncMotion);
  mobile.addEventListener('change', resize);
  root.addEventListener('visibilitychange', syncMotion);
  resize();

  // Detached sampling canvas: one pixel read, cached geometry for both breakpoints.
  const mask = new win.Image();
  mask.onload = () => {
    if (disposed) return;
    try {
      const sampler = root.createElement('canvas');
      sampler.width = 720;
      sampler.height = 360;
      const samplingContext = sampler.getContext('2d', { willReadFrequently: true });
      if (!samplingContext) return;
      samplingContext.drawImage(mask, 0, 0, 720, 360);
      const { data } = samplingContext.getImageData(0, 0, 720, 360);
      const desktop = sampleLandPoints(data, 720, 360, 3);
      const mobilePoints = sampleLandPoints(data, 720, 360, 6);
      if (!desktop.length || !mobilePoints.length) return;
      geometry = { desktop, mobile: mobilePoints };
      oceanGeometry = {
        desktop: sampleOceanPoints(data, 720, 360, 700),
        mobile: sampleOceanPoints(data, 720, 360, 100),
      };
      hasLand = true;
      points = mobile.matches ? geometry.mobile : geometry.desktop;
      oceanPoints = mobile.matches ? oceanGeometry.mobile : oceanGeometry.desktop;
      draw();
    } catch {
      // Retain the pre-rendered sphere if decoding or pixel access fails.
    }
  };
  mask.onerror = () => {}; // The initial sphere is the network/decode fallback.
  mask.src = new URL('../assets/world-land-mask.svg', import.meta.url).href;

  return () => {
    disposed = true;
    mask.onload = null;
    mask.onerror = null;
    win.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    reduced.removeEventListener('change', syncMotion);
    mobile.removeEventListener('change', resize);
    root.removeEventListener('visibilitychange', syncMotion);
  };
}
