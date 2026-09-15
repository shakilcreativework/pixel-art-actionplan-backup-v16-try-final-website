/**
 * ExactCellSampler.js
 * Zero-Color-Loss Center-Pixel Sampling Engine for Pathway B (Pure Pixel Pipeline).
 * Conforms to Mosaic Engine PRD v2 Dual-Input System (§5, Stage B2).
 *
 * Guaranteed Invariants:
 *   - Output color set ⊆ input color set (ZERO color loss, ZERO interpolated colors).
 *   - Samples the center pixel of each detected grid cell without averaging or OKLab blending.
 *   - Detects non-uniform cell blocks and reports mixel warnings instead of silently smearing colors.
 */

import { CellModel } from './CellModel.js';

export class ExactCellSampler {
  /**
   * Sample grid cells from raw image data with zero color modification.
   * @param {ImageData|{width: number, height: number, data: Uint8ClampedArray}} sourceImage
   * @param {Object} options
   * @param {number} options.cellSize
   * @param {number} [options.offsetX=0]
   * @param {number} [options.offsetY=0]
   * @param {string} [options.shape='square']
   * @param {number} [options.rotation=0]
   * @returns {{
   *   grid: Array<Array<CellModel>>,
   *   cells: Array<CellModel>,
   *   palette: Array<Array<number>>,
   *   mixelWarnings: Array<{col: number, row: number, x: number, y: number}>
   * }}
   */
  static sample(sourceImage, options = {}) {
    const width = sourceImage.width;
    const height = sourceImage.height;
    const data = sourceImage.data;

    const cellSize = Math.max(1, Math.floor(options.cellSize || 16));
    const offsetX = Math.max(0, Math.min(width - 1, Math.floor(options.offsetX || 0)));
    const offsetY = Math.max(0, Math.min(height - 1, Math.floor(options.offsetY || 0)));
    const shape = options.shape || 'square';
    const rotation = options.rotation || 0;

    const cols = Math.floor((width - offsetX) / cellSize);
    const rows = Math.floor((height - offsetY) / cellSize);

    const grid = [];
    const allCells = [];
    const paletteMap = new Map();
    const mixelWarnings = [];

    for (let r = 0; r < rows; r++) {
      const rowArr = [];
      const cellY = offsetY + r * cellSize;

      for (let c = 0; c < cols; c++) {
        const cellX = offsetX + c * cellSize;

        // Exact Center Pixel Coordinate
        const centerX = Math.min(width - 1, Math.max(0, cellX + Math.floor(cellSize / 2)));
        const centerY = Math.min(height - 1, Math.max(0, cellY + Math.floor(cellSize / 2)));
        const centerIdx = (centerY * width + centerX) * 4;

        const cr = data[centerIdx];
        const cg = data[centerIdx + 1];
        const cb = data[centerIdx + 2];
        const ca = data[centerIdx + 3];

        // Mixel Check: test 4 corners of the cell against center
        let hasMixel = false;
        if (cellSize >= 4 && ca >= 10) {
          const checkPoints = [
            [cellX + 1, cellY + 1],
            [cellX + cellSize - 2, cellY + 1],
            [cellX + 1, cellY + cellSize - 2],
            [cellX + cellSize - 2, cellY + cellSize - 2]
          ];
          for (const [px, py] of checkPoints) {
            if (px >= 0 && px < width && py >= 0 && py < height) {
              const pIdx = (py * width + px) * 4;
              const diff = Math.abs(data[pIdx] - cr) +
                           Math.abs(data[pIdx + 1] - cg) +
                           Math.abs(data[pIdx + 2] - cb);
              if (diff > 45) {
                hasMixel = true;
                break;
              }
            }
          }
        }

        if (hasMixel) {
          mixelWarnings.push({ col: c, row: r, x: cellX, y: cellY });
        }

        const isOccupied = ca >= 10;
        const colorKey = `${cr},${cg},${cb}`;
        if (isOccupied && !paletteMap.has(colorKey)) {
          paletteMap.set(colorKey, [cr, cg, cb]);
        }

        const rgbColor = `rgb(${cr},${cg},${cb})`;
        const sample = {
          r: cr,
          g: cg,
          b: cb,
          a: ca,
          centerX,
          centerY
        };

        const cell = CellModel.createCell({
          col: c,
          row: r,
          x: cellX,
          y: cellY,
          width: cellSize,
          height: cellSize,
          shape,
          rotation,
          color: rgbColor,
          sample,
          occupied: isOccupied,
          sourceAlpha: ca
        });

        cell.hasMixel = hasMixel;
        cell.designState = isOccupied ? 'DESIGN' : 'BACKGROUND_CONFIRMED';
        cell.isRemoved = !isOccupied;

        rowArr.push(cell);
        allCells.push(cell);
      }
      grid.push(rowArr);
    }

    return {
      grid,
      cells: allCells,
      palette: Array.from(paletteMap.values()),
      mixelWarnings,
      cols,
      rows,
      cellSize
    };
  }
}
