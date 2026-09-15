/**
 * ColorSampling.js
 * Advanced color space conversions (sRGB, Linear RGB, OKLab) and
 * pixel-art cell sampling strategies (Average, Median, Dominant, Perceptual OKLab).
 */

// sRGB [0..255] to Linear RGB [0..1]
function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Linear RGB [0..1] to sRGB [0..255]
function linearToSrgb(c) {
  const v = Math.max(0, Math.min(1, c));
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(255, s * 255)));
}

// RGB [0..255] -> OKLab { L, a, b }
export function rgbToOklab(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  };
}

// OKLab { L, a, b } -> RGB [0..255]
export function oklabToRgb(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

// Perceptual OKLab Color Distance ΔE
export function oklabDistance(ok1, ok2) {
  const dL = ok1.L - ok2.L;
  const da = ok1.a - ok2.a;
  const db = ok1.b - ok2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// RGB Euclidean distance squared
export function rgbDistanceSq(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * Sample a rectangular cell region from an RGBA buffer.
 * Supports 9 algorithms:
 *   - 'perceptual-oklab' / 'perceptual': OKLab Perceptual Area Weighted
 *   - 'k-centroid': Astropulse / PixelOE K-Centroid Vector Clustering
 *   - 'contrast-aware': Edge-Preserving Contrast Weighting
 *   - 'gaussian-weighted': 2D Gaussian Bell-Curve Footprint
 *   - 'lanczos-windowed': Lanczos Sinc-Windowed Kernel
 *   - 'median': Median Filter (Impulse Noise Rejection)
 *   - 'dominant-mode' / 'dominant': 5-Bit Modal Frequency Bucket
 *   - 'center-exact' / 'center': 1:1 Exact Geometric Center Point
 *   - 'average': Standard Uniform Arithmetic Mean
 */
export function sampleCellColor(
  srcData,
  srcWidth,
  srcHeight,
  startX,
  startY,
  endX,
  endY,
  method = 'perceptual',
  _options = {}
) {
  const clampedStartX = Math.max(0, Math.floor(startX));
  const clampedStartY = Math.max(0, Math.floor(startY));
  const clampedEndX = Math.min(srcWidth, Math.ceil(endX));
  const clampedEndY = Math.min(srcHeight, Math.ceil(endY));

  const centerX = (startX + endX) / 2;
  const centerY = (startY + endY) / 2;
  const icx = Math.min(srcWidth - 1, Math.max(0, Math.floor(centerX)));
  const icy = Math.min(srcHeight - 1, Math.max(0, Math.floor(centerY)));

  // Fast-Path: 1:1 Exact Center Point Sampling
  if (method === 'center' || method === 'center-exact') {
    const centerIdx = (icy * srcWidth + icx) * 4;
    return {
      r: srcData[centerIdx],
      g: srcData[centerIdx + 1],
      b: srcData[centerIdx + 2],
      a: srcData[centerIdx + 3]
    };
  }

  const boxW = Math.max(1, clampedEndX - clampedStartX);
  const boxH = Math.max(1, clampedEndY - clampedStartY);

  // Collect valid pixels
  const pixels = [];
  let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
  let count = 0;

  for (let py = clampedStartY; py < clampedEndY; py++) {
    for (let px = clampedStartX; px < clampedEndX; px++) {
      const idx = (py * srcWidth + px) * 4;
      const r = srcData[idx];
      const g = srcData[idx + 1];
      const b = srcData[idx + 2];
      const a = srcData[idx + 3];

      totalA += a;
      count++;

      if (a >= 10) {
        pixels.push({ px, py, r, g, b, a });
        totalR += r;
        totalG += g;
        totalB += b;
      }
    }
  }

  if (count === 0 || pixels.length === 0) {
    const centerIdx = (icy * srcWidth + icx) * 4;
    return {
      r: srcData[centerIdx] || 0,
      g: srcData[centerIdx + 1] || 0,
      b: srcData[centerIdx + 2] || 0,
      a: count > 0 ? Math.round(totalA / count) : 0
    };
  }

  const avgAlpha = Math.round(totalA / count);
  if (avgAlpha < 10) {
    return { r: 0, g: 0, b: 0, a: avgAlpha };
  }

  // 1. Median Filtering
  if (method === 'median') {
    const rSorted = pixels.map(p => p.r).sort((a, b) => a - b);
    const gSorted = pixels.map(p => p.g).sort((a, b) => a - b);
    const bSorted = pixels.map(p => p.b).sort((a, b) => a - b);
    const mid = Math.floor(pixels.length / 2);
    return {
      r: rSorted[mid],
      g: gSorted[mid],
      b: bSorted[mid],
      a: avgAlpha
    };
  }

  // 2. Dominant Modal Frequency Bucket
  if (method === 'dominant' || method === 'dominant-mode') {
    const colorMap = new Map();
    for (const p of pixels) {
      const key = ((p.r >> 3) << 10) | ((p.g >> 3) << 5) | (p.b >> 3);
      const entry = colorMap.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      entry.count++;
      entry.r += p.r;
      entry.g += p.g;
      entry.b += p.b;
      colorMap.set(key, entry);
    }
    let dominantEntry = null;
    for (const entry of colorMap.values()) {
      if (!dominantEntry || entry.count > dominantEntry.count) {
        dominantEntry = entry;
      }
    }
    if (dominantEntry && dominantEntry.count > 0) {
      return {
        r: Math.round(dominantEntry.r / dominantEntry.count),
        g: Math.round(dominantEntry.g / dominantEntry.count),
        b: Math.round(dominantEntry.b / dominantEntry.count),
        a: avgAlpha
      };
    }
  }

  // 3. K-Centroid Clustering (Astropulse / PixelOE Algorithm)
  if (method === 'k-centroid') {
    if (pixels.length <= 3) {
      return {
        r: Math.round(totalR / pixels.length),
        g: Math.round(totalG / pixels.length),
        b: Math.round(totalB / pixels.length),
        a: avgAlpha
      };
    }

    // Initialize 2 centroids using min/max luminance extremes
    let minLum = 999, maxLum = -1;
    let c1 = pixels[0], c2 = pixels[pixels.length - 1];
    for (const p of pixels) {
      const lum = 0.299 * p.r + 0.587 * p.g + 0.114 * p.b;
      if (lum < minLum) { minLum = lum; c1 = { r: p.r, g: p.g, b: p.b }; }
      if (lum > maxLum) { maxLum = lum; c2 = { r: p.r, g: p.g, b: p.b }; }
    }

    // 3 iterations of K-Means clustering
    let cluster1 = [], cluster2 = [];
    for (let iter = 0; iter < 3; iter++) {
      cluster1 = [];
      cluster2 = [];
      for (const p of pixels) {
        const d1 = rgbDistanceSq(p.r, p.g, p.b, c1.r, c1.g, c1.b);
        const d2 = rgbDistanceSq(p.r, p.g, p.b, c2.r, c2.g, c2.b);
        if (d1 <= d2) cluster1.push(p);
        else cluster2.push(p);
      }
      if (cluster1.length > 0) {
        c1 = {
          r: Math.round(cluster1.reduce((s, p) => s + p.r, 0) / cluster1.length),
          g: Math.round(cluster1.reduce((s, p) => s + p.g, 0) / cluster1.length),
          b: Math.round(cluster1.reduce((s, p) => s + p.b, 0) / cluster1.length)
        };
      }
      if (cluster2.length > 0) {
        c2 = {
          r: Math.round(cluster2.reduce((s, p) => s + p.r, 0) / cluster2.length),
          g: Math.round(cluster2.reduce((s, p) => s + p.g, 0) / cluster2.length),
          b: Math.round(cluster2.reduce((s, p) => s + p.g, 0) / cluster2.length)
        };
      }
    }

    // Pick majority cluster centroid
    const winningCentroid = cluster1.length >= cluster2.length ? c1 : c2;
    return {
      r: winningCentroid.r,
      g: winningCentroid.g,
      b: winningCentroid.b,
      a: avgAlpha
    };
  }

  // 4. Contrast-Aware Edge Preserving
  if (method === 'contrast-aware') {
    // Weight each pixel based on distance from local edge gradient
    let weightedR = 0, weightedG = 0, weightedB = 0, totalW = 0;
    for (const p of pixels) {
      // Calculate local neighborhood contrast
      let localContrast = 0;
      if (p.px + 1 < srcWidth && p.py + 1 < srcHeight) {
        const nIdx = (p.py * srcWidth + (p.px + 1)) * 4;
        const diffR = Math.abs(p.r - srcData[nIdx]);
        const diffG = Math.abs(p.g - srcData[nIdx + 1]);
        const diffB = Math.abs(p.b - srcData[nIdx + 2]);
        localContrast = (diffR + diffG + diffB) / 3;
      }
      const distToCenter = Math.hypot(p.px - centerX, p.py - centerY);
      const spatialW = 1.0 / (1.0 + distToCenter * 0.5);
      const weight = spatialW * (1.0 + localContrast * 0.05);

      weightedR += p.r * weight;
      weightedG += p.g * weight;
      weightedB += p.b * weight;
      totalW += weight;
    }

    if (totalW > 0) {
      return {
        r: Math.round(weightedR / totalW),
        g: Math.round(weightedG / totalW),
        b: Math.round(weightedB / totalW),
        a: avgAlpha
      };
    }
  }

  // 5. 2D Gaussian Bell-Curve Footprint
  if (method === 'gaussian-weighted') {
    const sigma = Math.max(0.7, (Math.max(boxW, boxH) / 2.5));
    const twoSigmaSq = 2 * sigma * sigma;
    let wR = 0, wG = 0, wB = 0, wSum = 0;

    for (const p of pixels) {
      const dx = p.px - centerX;
      const dy = p.py - centerY;
      const weight = Math.exp(-(dx * dx + dy * dy) / twoSigmaSq);

      wR += p.r * weight;
      wG += p.g * weight;
      wB += p.b * weight;
      wSum += weight;
    }

    if (wSum > 0) {
      return {
        r: Math.round(wR / wSum),
        g: Math.round(wG / wSum),
        b: Math.round(wB / wSum),
        a: avgAlpha
      };
    }
  }

  // 6. Lanczos Windowed Kernel
  if (method === 'lanczos-windowed') {
    function sinc(x) {
      if (Math.abs(x) < 1e-5) return 1.0;
      const pix = Math.PI * x;
      return Math.sin(pix) / pix;
    }
    function lanczos2(x) {
      const ax = Math.abs(x);
      if (ax >= 2.0) return 0.0;
      return sinc(x) * sinc(x / 2.0);
    }

    const radiusX = Math.max(1, boxW / 2);
    const radiusY = Math.max(1, boxH / 2);
    let lR = 0, lG = 0, lB = 0, lSum = 0;

    for (const p of pixels) {
      const nx = (p.px - centerX) / radiusX * 2.0;
      const ny = (p.py - centerY) / radiusY * 2.0;
      const weight = Math.max(0, lanczos2(nx) * lanczos2(ny));

      lR += p.r * weight;
      lG += p.g * weight;
      lB += p.b * weight;
      lSum += weight;
    }

    if (lSum > 0) {
      return {
        r: Math.round(Math.max(0, Math.min(255, lR / lSum))),
        g: Math.round(Math.max(0, Math.min(255, lG / lSum))),
        b: Math.round(Math.max(0, Math.min(255, lB / lSum))),
        a: avgAlpha
      };
    }
  }

  // 7. Perceptual OKLab Area Weighted (Default High-Fidelity)
  if (method === 'perceptual' || method === 'perceptual-oklab') {
    let okLSum = 0, okaSum = 0, okbSum = 0;
    for (const p of pixels) {
      const ok = rgbToOklab(p.r, p.g, p.b);
      okLSum += ok.L;
      okaSum += ok.a;
      okbSum += ok.b;
    }
    const avgL = okLSum / pixels.length;
    const avga = okaSum / pixels.length;
    const avgb = okbSum / pixels.length;
    const [r, g, b] = oklabToRgb(avgL, avga, avgb);
    return { r, g, b, a: avgAlpha };
  }

  // 8. Fallback / Standard Area Average
  return {
    r: Math.round(totalR / pixels.length),
    g: Math.round(totalG / pixels.length),
    b: Math.round(totalB / pixels.length),
    a: avgAlpha
  };
}
