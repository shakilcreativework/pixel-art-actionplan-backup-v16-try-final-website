/**
 * GridScaleDetector.js
 * High-Precision Native Grid Scale & Phase Detector for Mosaic Engine v2 (Pathway B).
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§3 & §5).
 *
 * Algorithm:
 *   1. Build horizontal and vertical edge maps where color transitions occur.
 *   2. Compute pairwise differences between consecutive edge positions (observed run lengths).
 *   3. Calculate Greatest Common Divisor (GCD) and modal periodic candidate across runs.
 *   4. Evaluate candidate cell sizes and calculate optimal grid phase offsets (offsetX, offsetY).
 *   5. Accurately resolve upscaled pixel art to true underlying native cell size.
 */

export class GridScaleDetector {
  /**
   * Detect underlying cell size and phase offset from ImageData.
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {Object} options
   * @param {number} [options.minCellSize=2]
   * @param {number} [options.maxCellSize=64]
   * @returns {{ detectedCellSize: number, offsetX: number, offsetY: number, confidence: number, runStats: Object }}
   */
  static detect(sourceImage, options = {}) {
    if (!sourceImage || !sourceImage.data || sourceImage.width < 4 || sourceImage.height < 4) {
      return { detectedCellSize: 16, offsetX: 0, offsetY: 0, confidence: 0, runStats: {} };
    }

    const {
      minCellSize = 2,
      maxCellSize = 64
    } = options;

    const width = sourceImage.width;
    const height = sourceImage.height;
    const data = sourceImage.data;

    // 1. Collect exact run lengths across sampled rows and columns
    const horizRunLengths = [];
    const sampleRowCount = Math.min(height, 32);
    const rowStep = Math.max(1, Math.floor(height / sampleRowCount));

    for (let y = 0; y < height; y += rowStep) {
      let runLen = 1;
      const rowOffset = y * width * 4;
      for (let x = 1; x < width; x++) {
        const curr = rowOffset + x * 4;
        const prev = rowOffset + (x - 1) * 4;
        const diff = Math.abs(data[curr] - data[prev]) +
                     Math.abs(data[curr + 1] - data[prev + 1]) +
                     Math.abs(data[curr + 2] - data[prev + 2]) +
                     Math.abs(data[curr + 3] - data[prev + 3]);

        if (diff < 15) {
          runLen++;
        } else {
          if (runLen >= minCellSize && runLen <= maxCellSize) {
            horizRunLengths.push(runLen);
          }
          runLen = 1;
        }
      }
      if (runLen >= minCellSize && runLen <= maxCellSize) {
        horizRunLengths.push(runLen);
      }
    }

    const vertRunLengths = [];
    const sampleColCount = Math.min(width, 32);
    const colStep = Math.max(1, Math.floor(width / sampleColCount));

    for (let x = 0; x < width; x += colStep) {
      let runLen = 1;
      for (let y = 1; y < height; y++) {
        const curr = (y * width + x) * 4;
        const prev = ((y - 1) * width + x) * 4;
        const diff = Math.abs(data[curr] - data[prev]) +
                     Math.abs(data[curr + 1] - data[prev + 1]) +
                     Math.abs(data[curr + 2] - data[prev + 2]) +
                     Math.abs(data[curr + 3] - data[prev + 3]);

        if (diff < 15) {
          runLen++;
        } else {
          if (runLen >= minCellSize && runLen <= maxCellSize) {
            vertRunLengths.push(runLen);
          }
          runLen = 1;
        }
      }
      if (runLen >= minCellSize && runLen <= maxCellSize) {
        vertRunLengths.push(runLen);
      }
    }

    const allRuns = [...horizRunLengths, ...vertRunLengths];
    if (allRuns.length === 0) {
      return { detectedCellSize: 16, offsetX: 0, offsetY: 0, confidence: 0.2, runStats: { count: 0 } };
    }

    // 2. Evaluate common candidate divisors & integer scales
    const candidateSizes = [2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 64].filter(
      s => s >= minCellSize && s <= maxCellSize
    );

    // Score candidates by how many observed run lengths are exact multiples of the candidate
    const candidateMultiples = new Map();
    for (const cand of candidateSizes) {
      let multipleCount = 0;
      let exactCount = 0;
      for (const len of allRuns) {
        if (len % cand === 0) {
          multipleCount++;
        }
        if (len === cand) {
          exactCount++;
        }
      }
      const score = (multipleCount / allRuns.length) * 0.7 + (exactCount / allRuns.length) * 0.3;
      candidateMultiples.set(cand, { score, multipleRatio: multipleCount / allRuns.length, exactRatio: exactCount / allRuns.length });
    }

    // 3. Compute Phase Histogram for Candidate Periodicities
    const horizEdges = new Float32Array(width);
    for (let y = 0; y < height; y += 2) {
      const rowOffset = y * width * 4;
      for (let x = 1; x < width; x++) {
        const i1 = rowOffset + x * 4;
        const i0 = rowOffset + (x - 1) * 4;
        const diff = Math.abs(data[i1] - data[i0]) +
                     Math.abs(data[i1 + 1] - data[i0 + 1]) +
                     Math.abs(data[i1 + 2] - data[i0 + 2]);
        if (diff > 25) horizEdges[x] += diff;
      }
    }

    const vertEdges = new Float32Array(height);
    for (let x = 0; x < width; x += 2) {
      for (let y = 1; y < height; y++) {
        const i1 = (y * width + x) * 4;
        const i0 = ((y - 1) * width + x) * 4;
        const diff = Math.abs(data[i1] - data[i0]) +
                     Math.abs(data[i1 + 1] - data[i0 + 1]) +
                     Math.abs(data[i1 + 2] - data[i0 + 2]);
        if (diff > 25) vertEdges[y] += diff;
      }
    }

    let bestCellSize = 16;
    let bestScore = -1;
    let bestOffsetX = 0;
    let bestOffsetY = 0;

    for (const cand of candidateSizes) {
      const runInfo = candidateMultiples.get(cand) || { score: 0, multipleRatio: 0 };
      if (runInfo.multipleRatio < 0.25) continue;

      let maxPhaseScoreX = 0;
      let optOx = 0;
      for (let ox = 0; ox < cand; ox++) {
        let scoreX = 0;
        let countX = 0;
        for (let x = ox; x < width; x += cand) {
          scoreX += horizEdges[x];
          countX++;
        }
        const avg = countX > 0 ? (scoreX / countX) : 0;
        if (avg > maxPhaseScoreX) {
          maxPhaseScoreX = avg;
          optOx = ox;
        }
      }

      let maxPhaseScoreY = 0;
      let optOy = 0;
      for (let oy = 0; oy < cand; oy++) {
        let scoreY = 0;
        let countY = 0;
        for (let y = oy; y < height; y += cand) {
          scoreY += vertEdges[y];
          countY++;
        }
        const avg = countY > 0 ? (scoreY / countY) : 0;
        if (avg > maxPhaseScoreY) {
          maxPhaseScoreY = avg;
          optOy = oy;
        }
      }

      const phasePower = maxPhaseScoreX + maxPhaseScoreY;
      const combinedScore = (phasePower > 0 ? Math.log(phasePower + 1) : 0) * 0.5 + (runInfo.score * 10);

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestCellSize = cand;
        bestOffsetX = optOx;
        bestOffsetY = optOy;
      }
    }

    const confidence = Math.min(1.0, Math.max(0.1, (candidateMultiples.get(bestCellSize)?.multipleRatio || 0.5)));

    return {
      detectedCellSize: bestCellSize,
      offsetX: bestOffsetX,
      offsetY: bestOffsetY,
      confidence: Number(confidence.toFixed(2)),
      runStats: {
        totalRuns: allRuns.length,
        multipleRatio: candidateMultiples.get(bestCellSize)?.multipleRatio || 0
      }
    };
  }
}
