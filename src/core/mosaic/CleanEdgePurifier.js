/** Restore likely background-blended edge colors from local source colors. */
export class CleanEdgePurifier {
  static apply(grid, source, options = {}) {
    const report = { correctedCells: 0, backgroundDetected: false };
    if (!grid.length || !source?.data) return report;
    const distanceSq = (a, b) => a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);
    const rgb = cell => [cell.sample.r, cell.sample.g, cell.sample.b];
    const neighbors = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    // Require a dominant opaque source-border color; avoid guessing on photos
    // or transparent artwork. Keep the exact source RGB, not a quantized color.
    const borderColors = new Map();
    let borderSamples = 0;
    const readBorder = (x, y) => {
      const offset = (y * source.width + x) * 4;
      borderSamples++;
      if (source.data[offset + 3] < 240) return;
      const color = Array.from(source.data.subarray(offset, offset + 3));
      const key = color.join(',');
      const entry = borderColors.get(key) || { color, count: 0 };
      entry.count++;
      borderColors.set(key, entry);
    };
    const stride = Math.max(1, Math.ceil((source.width + source.height) / 2048));
    for (let x = 0; x < source.width; x += stride) {
      readBorder(x, 0);
      readBorder(x, source.height - 1);
    }
    for (let y = 0; y < source.height; y += stride) {
      readBorder(0, y);
      readBorder(source.width - 1, y);
    }
    const dominant = [...borderColors.values()].sort((a, b) => b.count - a.count)[0];
    if (!dominant || dominant.count < borderSamples * 0.6) return report;
    const background = dominant.color;
    report.backgroundDetected = true;

    // Flood only exterior background. Enclosed holes and interior shading do
    // not become purification boundaries. This mask stays fixed for the pass.
    const exterior = grid.map(row => new Uint8Array(row.length));
    const queue = [];
    const visit = (r, c) => {
      const cell = grid[r]?.[c];
      if (!cell || exterior[r][c]) return;
      if (!cell.isRemoved && cell.sample.a >= 10 && distanceSq(rgb(cell), background) > 144) return;
      exterior[r][c] = 1;
      queue.push([r, c]);
    };
    for (let r = 0; r < grid.length; r++) {
      visit(r, 0);
      visit(r, grid[r].length - 1);
    }
    for (let c = 0; c < grid[0].length; c++) visit(0, c);
    for (let c = 0; c < grid[grid.length - 1].length; c++) visit(grid.length - 1, c);
    for (let i = 0; i < queue.length; i++) {
      const [r, c] = queue[i];
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) visit(r + dr, c + dc);
    }

    const isLocked = cell => {
      const keys = [cell.id, `${cell.col},${cell.row}`];
      return cell.protected || cell.trimLocked || keys.some(key =>
        options.manualOverrides?.[key] || options.protectedIds?.has?.(key) ||
        options.manualRestoreIds?.has?.(key) || options.manualRemoveIds?.has?.(key));
    };
    const sourceColors = new Map();
    const getColors = cell => {
      if (sourceColors.has(cell)) return sourceColors.get(cell);
      const histogram = new Map();
      let count = 0;
      for (let y = Math.max(0, Math.floor(cell.y)); y < Math.min(source.height, cell.y + cell.height); y++) {
        for (let x = Math.max(0, Math.floor(cell.x)); x < Math.min(source.width, cell.x + cell.width); x++) {
          const offset = (y * source.width + x) * 4;
          if (source.data[offset + 3] < 240) continue;
          const color = Array.from(source.data.subarray(offset, offset + 3));
          if (distanceSq(color, background) < 3600) continue;
          count++;
          const key = color.join(',');
          const entry = histogram.get(key) || { color, count: 0 };
          entry.count++;
          histogram.set(key, entry);
        }
      }
      const colors = [...histogram.values()].filter(entry => entry.count >= count * 0.15)
        .sort((a, b) => b.count - a.count).slice(0, 3);
      sourceColors.set(cell, colors);
      return colors;
    };

    const updates = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (exterior[r][c] || cell.isRemoved || cell.sample.a < 240 || isLocked(cell)) continue;
        if (!neighbors.some(([dr, dc]) => exterior[r + dr]?.[c + dc])) continue;
        const current = rgb(cell);
        // Do not recolor solid neutral outlines, even on a white background.
        if (Math.max(...current) - Math.min(...current) < 12 && Math.max(...current) < 80) continue;

        // Search at most two connected foreground cells away, never across a
        // background gap into a different sprite. Source pixels are read only.
        const nearby = [[r, c, 0]];
        const seen = new Set([`${r},${c}`]);
        const candidates = new Map();
        for (let i = 0; i < nearby.length; i++) {
          const [nr, nc, depth] = nearby[i];
          const neighbor = grid[nr][nc];
          if (!isLocked(neighbor)) {
            for (const entry of getColors(neighbor)) {
              const key = entry.color.join(',');
              const candidate = candidates.get(key) || { color: entry.color, support: 0 };
              candidate.support += entry.count / (depth + 1);
              candidates.set(key, candidate);
            }
          }
          if (depth === 2) continue;
          for (const [dr, dc] of neighbors) {
            const rr = nr + dr, cc = nc + dc, key = `${rr},${cc}`;
            const next = grid[rr]?.[cc];
            if (!next || exterior[rr][cc] || next.isRemoved || next.sample.a < 240 || seen.has(key)) continue;
            seen.add(key);
            nearby.push([rr, cc, depth + 1]);
          }
        }
        let best = null;
        for (const candidate of candidates.values()) {
          const vector = candidate.color.map((value, i) => value - background[i]);
          const lengthSq = vector.reduce((sum, value) => sum + value * value, 0);
          const amount = vector.reduce((sum, value, i) => sum + (current[i] - background[i]) * value, 0) / lengthSq;
          if (amount < 0.12 || amount > 0.92 || distanceSq(current, candidate.color) < 324) continue;
          const blend = vector.map((value, i) => background[i] + amount * value);
          const error = distanceSq(current, blend);
          if (error > 300) continue;
          const score = error + 20 * amount - Math.min(candidate.support, 100) * 0.02;
          if (!best || score < best.score) best = { color: candidate.color, score };
        }
        if (best) updates.push({ cell, color: best.color });
      }
    }
    for (const { cell, color } of updates) {
      [cell.sample.r, cell.sample.g, cell.sample.b] = color;
      cell.color = `rgb(${color.join(',')})`;
    }
    report.correctedCells = updates.length;
    return report;
  }
}
