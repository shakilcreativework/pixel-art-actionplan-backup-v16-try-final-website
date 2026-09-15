# SVG Vector Export

**Location**: `src/core/export/SvgExporter.js`  
**Exports**: `SvgExporter` (static methods)

---

## Core Rule

The exported SVG contains **only vector geometry** — no embedded raster `<image>` tags.
Background `<rect>` is only added when `transparentBg: false` and a `bgColor` is provided.

---

## Export Methods

### `SvgExporter.exportPixelArt(grid, options)`

Exports a `PixelGrid` to SVG. Four modes available via `options.mode`:

| Mode | Behaviour |
|---|---|
| `editable` *(default)* | One `<rect>` per pixel cell — `x`, `y`, `width`, `height`, `fill`, optional `opacity` |
| `optimized` | Horizontally contiguous cells of identical color merged into wider `<rect>` elements (run-length aggregation) |
| `grouped` / `grouped-stock` | Cells grouped by color under `<g fill="#RRGGBB">` tags, with horizontal RLE merge inside each group |
| `objects` / `objects-stock` | Cells grouped by connected 8-neighbor island — each island in its own `<g id="design-element-N">` |

All modes include `shape-rendering="crispEdges"` on the root `<svg>` element.

---

### `SvgExporter.exportHalftone(result, options)`

Exports halftone dot geometry. Dot shapes map to SVG primitives:

| Dot Shape | SVG Element |
|---|---|
| circle *(default)* | `<circle cx cy r>` |
| square | `<rect x y width height>` |
| diamond | `<polygon points>` |

Supports `hollow: true` — renders `fill="none"` + `stroke` instead of solid fill.

---

### `SvgExporter.exportRandomFlow(result, options)`

Exports Random Flow streamlines as SVG `<path>` elements.
Each path uses `M ... L ... L ...` with `stroke-linecap="round"` and `stroke-linejoin="round"`.

---

### `SvgExporter.exportMosaic(result, options)`

Exports Mosaic tile geometry. Tile shapes map to SVG primitives:

| Tile Shape | SVG Element |
|---|---|
| square *(default)* | `<rect>` |
| circle | `<circle>` |
| triangle | `<polygon points>` |
| diamond | `<polygon points>` |
| hexagon | `<polygon points>` (6-vertex) |

Rotation applied via `transform="rotate(deg cx cy)"` on each element.  
Default mode for Mosaic is `grouped` — tiles grouped by color under `<g fill>` layers.

---

## Dimensions

Output SVG dimensions match the selected artboard exactly.

```xml
<svg xmlns="http://www.w3.org/2000/svg" version="1.1"
     viewBox="0 0 W H" width="W" height="H" shape-rendering="crispEdges">
```

No unexpected scaling or aspect-ratio distortion.
