# MASTER PRD

## Professional Image to Pixel Art, Halftone, Line Art and Creative Design Generator

**Document Type:** Complete Product Requirements Document  
**Status:** Production Build Specification  
**Primary Goal:** Add a completely independent, professional Pixel Art processing engine while preserving all existing creative engines.  
**Target:** Production-ready browser application  
**Primary Platform:** Desktop Web  
**Secondary Platform:** Tablet / Mobile  
**Processing Model:** Browser-first, client-side image processing  
**Export:** PNG + true vector SVG  
**AI Development:** Designed for incremental implementation by AI coding agents

---

# 1. PRODUCT OBJECTIVE

Build a professional image-processing web application where users can upload an image and transform it into:

- Pixel Art
- Halftone
- Line Art
- Mosaic / geometric artwork
- Existing Random Flow designs
- Existing Camo Mesh designs
- Existing Pencil-generated designs

The application must provide:

- Accurate image processing
- Live preview
- Professional controls
- Fixed-grid Pixel Art generation
- Original-color sampling
- Palette generation
- Palette reduction
- Dithering
- Pixel-level editing
- Undo / Redo
- Zoom / Pan
- Grid visualization
- PNG export
- True SVG vector export
- Project save/load
- Reliable error handling
- High performance
- Responsive UI
- No regression of existing features

---

# 2. NON-NEGOTIABLE ARCHITECTURAL RULE

The most important requirement is:

**Pixel Art must be a completely independent processing engine.**

It must NOT be implemented as:

- a special halftone mode
- a modified dot-radius mode
- a grayscale mode
- a visual CSS filter
- a screenshot/pixelation trick
- an embedded raster image inside SVG

The architecture must be:

```text
                 IMAGE
                   |
             IMAGE PIPELINE
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
   HALFTONE    PIXEL ART    LINE ART
       |           |           |
       v           v           v
   existing     NEW ENGINE   existing
   engine
       |
       +-------- MOSAIC --------+
                   |
                   v
              RENDERER
                   |
          +--------+--------+
          |                 |
          v                 v
         PNG               SVG
```

---

# 3. EXISTING FUNCTIONALITY PROTECTION

The existing engines must remain operational.

The following functionality must NOT be broken:

- Random Flow
- Camo Mesh
- Pencil
- Photo → Halftone
- Existing Halftone
- Existing Line Art
- Existing Image Upload
- Existing Reset
- Existing SVG export
- Existing PNG export

The current live site exposes these existing workflows and controls, including Random Flow, Camo Mesh, Pencil, Photo → Halftone, Halftone Dots, Line Art, grid types, sampling, shapes, color controls and SVG/PNG export.

**Default rule:**

> If a feature already works, do not rewrite it merely to make the new Pixel Art engine fit into it.

---

# 4. CURRENT PIXEL ART PROBLEM

The existing site currently exposes:

**Pixel Art Mode — original colors, solid mosaic**

and describes it as assigning each cell its original color without shading/size variation.

This is a useful starting point, but production Pixel Art must become a dedicated pipeline.

The new engine must own:

- fixed grid
- resolution
- cell generation
- color sampling
- palette generation
- palette mapping
- dithering
- transparency
- pixel data
- editing
- history
- preview rendering
- SVG generation
- PNG generation

---

# 5. USER PERSONAS

## Designer

Needs:

- fast conversion
- precise controls
- SVG
- clean output
- color control

## Pixel Artist

Needs:

- fixed pixel grid
- palette
- dithering
- manual editing
- zoom
- grid
- undo/redo

## Illustrator / Vector Designer

Needs:

- true vector SVG
- clean geometry
- editable rectangles
- scalable output

## Stock / Graphic Creator

Needs:

- clean artwork
- controllable colors
- no unwanted raster embedding
- reliable export

---

# 6. PRIMARY USER FLOW

```text
Open Website
     |
Upload Image
     |
Image Validation
     |
Crop / Frame
     |
Choose Mode
     |
+-----------------------------+
|                             |
Pixel Art / Halftone / Line Art
|                             |
+-----------------------------+
     |
Adjust Controls
     |
Live Preview
     |
Optional Editing
     |
Undo / Redo
     |
Zoom / Inspect
     |
Export PNG / SVG
     |
Download
```

---

# 7. APPLICATION LAYOUT

## Desktop

Use a professional dark creative-tool interface.

```text
+-------------------------------------------------------------+
| Header / Toolbar                                            |
+----------------------+--------------------------------------+
|                      |                                      |
|                      |                                      |
|       SIDEBAR        |             PREVIEW                  |
|                      |                                      |
| Upload               |                                      |
| Mode                 |                                      |
| Controls             |                                      |
| Editing              |                                      |
| Export               |                                      |
|                      |                                      |
+----------------------+--------------------------------------+
| Status / processing / zoom / dimensions                    |
+-------------------------------------------------------------+
```

## Sidebar

The sidebar should be scrollable independently from the preview.

---

# 8. TOP TOOLBAR

Include:

- New
- Open
- Save
- Undo
- Redo
- Original
- Preview
- Zoom
- Fit
- Export

Mode selector:

```text
Pixel Art
Halftone
Line Art
Mosaic
```

---

# 9. IMAGE INPUT SYSTEM

## Supported formats

Minimum:

- JPG
- JPEG
- PNG
- WebP

Future:

- GIF first frame
- AVIF

## Upload methods

- Click
- Drag & Drop
- Paste from clipboard

## Validation

Check:

- file type
- file size
- dimensions
- decoding success
- memory requirements

Display meaningful errors.

Example:

```text
Unable to process this image.
Try a smaller image or PNG/JPG/WebP.
```

---

# 10. IMAGE PREPROCESSING PIPELINE

Every engine should receive a normalized processing image.

```text
File
 |
Decode
 |
ImageBitmap
 |
Crop
 |
Orientation
 |
Resize
 |
RGBA buffer
 |
Engine
```

The original file must remain untouched.

---

# 11. IMAGE ORIENTATION

Handle EXIF orientation correctly.

Portrait photographs must not unexpectedly rotate.

Normalize orientation before processing.

---

# 12. CROP / FRAME SYSTEM

Maintain:

- Original
- Landscape
- Portrait
- Square
- Custom

The crop operation must actually affect processing.

It must not merely change the UI preview.

---

# 13. CANVAS / PROCESSING RESOLUTION

Separate:

### Source Resolution

Original uploaded image.

### Processing Resolution

Resolution used by the engine.

### Output Resolution

Final PNG/SVG dimensions.

Do not confuse these three.

---

# 14. PIXEL ART ENGINE

Create:

```text
PixelArtEngine
```

The engine receives:

```text
sourceImage
crop
pixelWidth
pixelHeight
samplingMethod
colorMode
palette
paletteSize
dithering
ditheringStrength
alphaMode
background
```

Returns:

```text
PixelGrid
```

---

# 15. PIXEL GRID DATA MODEL

Use an efficient representation.

Conceptually:

```text
PixelGrid
{
    width,
    height,
    palette,
    indexes,
    alpha
}
```

Avoid:

```text
[
    { x, y, color, ... },
    { x, y, color, ... },
    ...
]
```

for every cell.

Use typed arrays where appropriate.

---

# 16. PIXEL RESOLUTION

Provide:

- 16 × 16
- 32 × 32
- 64 × 64
- 128 × 128
- 256 × 256
- 512 × 512
- Custom

For non-square images:

```text
Maintain aspect ratio
```

Example:

```text
Original:
1400 × 788

Pixel grid:
128 × 72
```

---

# 17. PIXEL SIZE

Pixel Size may be an alternative interface to pixel resolution.

The user can choose:

```text
2
4
6
8
12
16
24
32
```

The engine calculates the resulting grid.

Changing Pixel Size must never alter individual cell dimensions based on brightness.

---

# 18. FIXED-GRID REQUIREMENT

This is mandatory.

Every grid cell must have identical dimensions.

Wrong:

```text
dark → large cell
light → small cell
```

Correct:

```text
dark → same-size cell, darker color
light → same-size cell, lighter color
```

This is the defining difference between Pixel Art and Halftone.

---

# 19. CELL COLOR SAMPLING

For each cell:

```text
Find source region
      |
Read pixels
      |
Handle alpha
      |
Calculate representative color
```

Sampling methods:

- Average
- Median
- Dominant
- Perceptual Average

Default:

**Perceptual Average**

---

# 20. EDGE-AWARE COLOR SAMPLING

Future advanced option:

```text
Edge-aware sampling
```

The algorithm should prevent important boundaries from becoming excessively muddy.

Example:

```text
Sky | Tree
```

should not unnecessarily become a mixed gray/brown cell when an edge-aware strategy can preserve the dominant visual boundary.

---

# 21. COLOR MODES

Pixel Art must provide:

### Original Colors

Every cell receives sampled source color.

### Limited Palette

Source colors are mapped to a finite palette.

### Monochrome

Map cells to one foreground/background color system.

### Custom Palette

User supplies colors.

---

# 22. PALETTE SIZE

Provide:

```text
2
4
8
16
32
64
128
256
```

Do not silently alter palette size.

Display:

```text
Colors: 16
```

---

# 23. AUTOMATIC PALETTE GENERATION

Implement automatic palette generation.

Possible algorithms:

- Median Cut
- K-Means
- Octree
- Quantization

Initial production implementation:

**Median Cut or K-Means**

Later optimize if needed.

---

# 24. COLOR DISTANCE

Do not rely only on raw RGB Euclidean distance for high-quality palette mapping.

Support:

```text
RGB
OKLab
```

Preferred:

**OKLab perceptual distance**

This improves nearest-palette selection.

---

# 25. PALETTE PROTECTION

Optional:

```text
Preserve dark outlines
Preserve highlights
Preserve rare colors
Preserve dominant colors
```

These options must have measurable effects.

---

# 26. DITHERING ENGINE

Separate module:

```text
DitheringEngine
```

Modes:

- None
- Bayer
- Floyd-Steinberg
- Atkinson
- Ordered
- Random

Default:

**None**

---

# 27. DITHERING RULE

Dithering changes **color distribution**, not cell dimensions.

Never allow dithering to:

- change grid size
- resize cells
- create halftone dots
- rotate pixels

---

# 28. TRANSPARENCY

Support:

- Preserve alpha
- Transparent background
- White background
- Custom background

Transparent source pixels must not accidentally become black.

---

# 29. PIXEL ART SHAPE

True Pixel Art default:

**Square**

No:

- circle
- triangle
- hexagon
- diamond
- rotation

Those belong to Mosaic / Halftone.

---

# 30. PIXEL ART PREVIEW

The preview must render from:

```text
PixelGrid
```

not repeatedly sample the original image.

Architecture:

```text
Original
 ↓
PixelArtEngine
 ↓
PixelGrid
 ↓
PreviewRenderer
```

---

# 31. ZOOM

Support:

- 25%
- 50%
- 100%
- 200%
- 400%
- 800%
- 1600%

At 100%:

**one output pixel should represent one actual pixel.**

Disable unwanted image smoothing.

---

# 32. PAN

Support:

- Space + drag
- Middle mouse
- Mouse drag when zoomed

---

# 33. GRID OVERLAY

Optional:

```text
Show Grid
Grid opacity
Grid thickness
Grid color
```

Grid must be preview-only.

Never export the grid overlay.

---

# 34. PIXEL EDITOR

Add:

### Pencil

Paint one pixel/cell.

### Eraser

Remove or restore pixel.

### Fill

Flood fill contiguous regions.

### Color Picker

Select an existing palette color.

### Rectangle

Paint a rectangular pixel region.

### Line

Draw straight pixel lines.

---

# 35. PIXEL EDITOR RULE

Manual editing changes:

```text
PixelGrid
```

not:

```text
Original Image
```

Therefore the user can always return to the generated state.

---

# 36. UNDO / REDO

History must support:

- conversion
- palette changes
- pixel edits
- fills
- erase
- color changes

Keyboard:

```text
Ctrl/Cmd + Z
Ctrl/Cmd + Shift + Z
```

---

# 37. BEFORE / AFTER

Provide:

```text
Original
Pixel Art
Split
```

Hold-to-preview original is optional.

---

# 38. HALFTONE ENGINE PROTECTION

Do not rewrite Halftone merely to create Pixel Art.

Existing Halftone should retain:

- Square
- Hexagonal
- Radial
- Grid spacing
- Grid angle
- Dot radius
- Sampling
- Blur
- Clip
- Gamma
- Shape
- Scale
- Rotation
- Strength
- Hollow
- Colors

The current site exposes these Halftone-related controls already.

---

# 39. LINE ART ENGINE PROTECTION

Keep existing Line Art independent.

Its settings should remain separate:

- Sensitivity
- Line thickness
- Detail
- Smoothing
- Invert
- Line color
- Background
- Alpha

These are already represented in the current application.

---

# 40. RANDOM FLOW PROTECTION

Do not change:

- Random Flow algorithm
- Shapes
- Flow parameters
- output behavior

Only refactor if a technical dependency is absolutely necessary.

---

# 41. CAMO MESH PROTECTION

Keep Camo Mesh independent.

Its existing controls include:

- Regions
- Dot/hex size
- Warp
- Size variance
- Dark shade
- Light shade
- Hex/dot mixing

Do not connect these to Pixel Art.

---

# 42. PENCIL PROTECTION

Keep Pencil functionality unchanged.

Existing workflow includes:

- drawing
- undo
- clear
- pencil size
- icon/shape insertion
- text insertion

The current site exposes this workflow.

---

# 43. MOSAIC ENGINE

If geometric colored cells are needed, create a separate Mosaic engine.

Supported:

- Square
- Circle
- Triangle
- Hexagon
- Diamond

Mosaic may use:

- color sampling
- variable size
- spacing
- rotation

But Pixel Art must not inherit these behaviors.

---

# 44. SVG ENGINE

Create:

```text
PixelArtSvgExporter
```

Input:

```text
PixelGrid
```

Output:

```text
SVG string / Blob
```

---

# 45. TRUE VECTOR REQUIREMENT

The exported Pixel Art SVG must contain actual vector geometry.

Correct:

```xml
<rect ... />
<rect ... />
<rect ... />
```

Incorrect:

```xml
<image href="data:image/png..." />
```

The latter is not acceptable as the primary Pixel Art SVG output.

---

# 46. SVG OPTIONS

Provide:

### Editable SVG

One rectangle per pixel/cell.

### Optimized SVG

Merge compatible adjacent cells where safe.

Default:

**Editable SVG**

---

# 47. SVG COLOR GROUPING

Optional optimization:

```text
Group by color
```

Example:

```xml
<g fill="#000000">
...
</g>
```

Do not sacrifice editability unless the user chooses optimized output.

---

# 48. SVG DIMENSIONS

SVG must preserve:

- selected output width
- selected output height
- aspect ratio

No unexpected scaling.

---

# 49. PNG EXPORT

PNG export must render the PixelGrid directly.

Support:

- 1×
- 2×
- 4×
- 8×
- Custom

Preserve:

- sharp edges
- colors
- transparency
- dimensions

---

# 50. EXPORT VALIDATION

Before export:

```text
Validate PixelGrid
Validate dimensions
Validate palette
Validate memory
```

If SVG would be enormous:

```text
Large SVG warning
```

Do not crash the browser.

---

# 51. PROJECT FILE

Create a project format:

```text
.pixelart
```

Store:

```text
projectVersion
sourceMetadata
crop
mode
pixelResolution
palette
pixelIndexes
alpha
background
dithering
settings
```

The project should be reopenable.

---

# 52. PROJECT SAVE / LOAD

Support:

- New
- Open
- Save
- Save As
- Reset

The project should restore:

- Pixel grid
- Palette
- settings
- zoom
- editor state where practical

---

# 53. PERFORMANCE ARCHITECTURE

Heavy processing must not block the UI.

Use:

```text
Web Worker
```

for:

- image sampling
- palette generation
- palette mapping
- dithering
- large PixelGrid creation
- expensive exports

---

# 54. OFFSCREEN CANVAS

Where browser support allows:

```text
OffscreenCanvas
```

Use it for heavy raster processing.

---

# 55. PREVIEW VS EXPORT

Use separate quality levels.

### Live Preview

Fast.

### Final Export

Full quality.

Never force full-resolution processing for every slider movement.

---

# 56. DEBOUNCING

When a slider moves:

```text
slider input
 ↓
debounce
 ↓
cancel previous processing
 ↓
process latest settings
 ↓
update preview
```

Do not queue ten obsolete renders.

---

# 57. CANCELLATION

Workers must support cancellation.

If user changes:

```text
Pixel Size 8 → 10 → 12
```

the worker should stop obsolete jobs when possible.

Only the latest result should become visible.

---

# 58. MEMORY PROTECTION

Before processing:

Calculate approximate memory requirements.

If too large:

```text
This image is too large for the selected settings.
Reduce output resolution or use a smaller image.
```

Do not let the browser freeze.

---

# 59. CONTROL SYSTEM

Every control needs:

- label
- value
- tooltip
- min
- max
- step
- default
- validation

Avoid magic numbers hidden inside components.

---

# 60. DEFAULT PIXEL ART SETTINGS

Recommended defaults:

```text
Mode:
Pixel Art

Resolution:
64 px long edge

Color:
Original Colors

Palette:
Automatic

Colors:
64

Dithering:
None

Alpha:
Preserve

Grid:
Visible

Zoom:
Fit
```

The defaults must be defined centrally.

---

# 61. DISABLED CONTROLS

When Pixel Art is active, hide or disable irrelevant Halftone controls:

- Dot radius
- Strength
- Shape rotation
- Grid angle
- Hollow
- Halftone jitter

Do not show controls that do nothing.

---

# 62. TOOLTIP SYSTEM

Example:

### Pixel Size

"Controls the size of each generated pixel cell. Smaller values preserve more detail."

### Palette

"Controls how many colors are available in the final artwork."

### Dithering

"Distributes palette colors across neighboring pixels to simulate additional tones."

---

# 63. ACCESSIBILITY

Support:

- keyboard navigation
- visible focus
- screen-reader labels
- tooltips
- sufficient contrast
- keyboard shortcuts

Do not rely solely on icons.

---

# 64. RESPONSIVE DESIGN

Desktop:

```text
Sidebar + large preview
```

Tablet:

```text
Collapsible sidebar
```

Mobile:

```text
Top toolbar
Preview
Bottom/drawer controls
```

The desktop editor is the primary experience.

---

# 65. ERROR STATES

Every major operation needs errors.

Examples:

```text
Invalid image
Unsupported format
Image decoding failed
Image too large
Processing failed
Worker failed
Export failed
SVG too large
Browser memory issue
```

Never silently fail.

---

# 66. PROCESSING STATES

Display:

```text
Preparing image...
Sampling colors...
Generating pixel grid...
Generating palette...
Applying dithering...
Rendering preview...
Preparing SVG...
Exporting...
```

For fast operations, avoid unnecessary visual loading.

---

# 67. SECURITY

Client-side image processing should not upload user images to a server unless explicitly required.

Do not expose:

- uploaded image URLs
- unnecessary telemetry
- personal image data

Validate files before decoding.

---

# 68. PRIVACY

Clearly communicate:

**Images are processed locally in the browser** if that is the actual implementation.

If any future server processing is introduced, update the privacy behavior and documentation.

---

# 69. BROWSER SUPPORT

Primary:

- Chrome
- Edge
- Firefox
- Safari

Test:

- desktop
- tablet
- mobile

---

# 70. TESTING LEVELS

## Unit Tests

Test:

- sampling
- palette
- color distance
- dithering
- grid
- SVG generation

## Integration Tests

Test:

```text
upload → process → preview
```

and:

```text
process → edit → export
```

## End-to-End Tests

Test:

```text
open site
upload image
choose Pixel Art
change resolution
change palette
edit pixel
undo
redo
export PNG
export SVG
```

---

# 71. PIXEL ART GOLDEN TESTS

Create fixed input images and expected outputs.

Test:

### Test 1

Solid red source.

Expected:

Every cell is red.

### Test 2

Black/white checkerboard.

Expected:

Correct grid sampling.

### Test 3

Horizontal gradient.

Expected:

Smooth color progression.

### Test 4

Two-color image.

Expected:

Palette reduction remains correct.

### Test 5

Transparent PNG.

Expected:

Alpha preserved.

### Test 6

Extreme palette reduction.

Expected:

Correct nearest-color mapping.

### Test 7

Dithering.

Expected:

Grid dimensions unchanged.

### Test 8

SVG.

Expected:

No raster `<image>` element.

---

# 72. REGRESSION TESTS

After Pixel Art implementation:

Run all existing tests for:

- Random Flow
- Camo Mesh
- Pencil
- Halftone
- Line Art
- existing exports

Pixel Art is not allowed to introduce regressions.

---

# 73. CODE QUALITY

Requirements:

- no duplicated processing algorithms
- no giant component
- no inline processing spaghetti
- no magic constants
- no unused dependencies
- no dead code
- no console errors
- no unnecessary rerenders
- clear module boundaries

---

# 74. COMPONENT RULE

UI components should not contain complex image algorithms.

Wrong:

```text
PixelArtControls.jsx
    ↓
500 lines of image processing
```

Correct:

```text
PixelArtControls
    ↓
settings
    ↓
PixelArtEngine
```

---

# 75. ENGINE RULE

Processing engines must be framework-independent wherever practical.

They should be testable without React.

Example:

```text
pixelArtEngine(input, settings)
```

should work independently.

---

# 76. EXPORT RULE

Exporters must consume processed data.

Do not make SVG exporter resample the original image.

Correct:

```text
PixelGrid → SVG
```

Incorrect:

```text
Original Image → SVG exporter → somehow pixelate
```

---

# 77. DOCUMENTATION

Create:

```text
docs/
```

with:

```text
PROJECT_OVERVIEW.md
ARCHITECTURE.md
PIXEL_ART_ENGINE.md
PIXEL_GRID.md
COLOR_ENGINE.md
PALETTE_ENGINE.md
DITHERING.md
HALFTONE_ENGINE.md
LINE_ART_ENGINE.md
MOSAIC_ENGINE.md
SVG_EXPORT.md
PNG_EXPORT.md
PERFORMANCE.md
DATA_MODEL.md
TEST_PLAN.md
AGENT_RULES.md
CHANGELOG.md
```

---

# 78. AI AGENT RULES

Every coding agent must follow:

```text
1. Inspect before modifying.

2. Never rewrite the entire project without permission.

3. Never delete working features.

4. Never change existing engine behavior unintentionally.

5. Pixel Art is independent.

6. Keep UI and algorithms separate.

7. Test after every meaningful implementation.

8. Fix build errors before continuing.

9. Do not claim functionality works without testing it.

10. Do not create fake controls.

11. Every visible control must affect the correct engine.

12. Never export raster data as fake vector SVG.

13. Keep documentation updated.

14. Make small, reviewable changes.

15. Preserve existing APIs where possible.
```

---

# 79. AI AGENT DEVELOPMENT PROTOCOL

Every implementation task follows:

```text
READ
 ↓
UNDERSTAND
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
RUN
 ↓
TEST
 ↓
INSPECT
 ↓
FIX
 ↓
DOCUMENT
 ↓
REPORT
```

Never:

```text
Prompt
 ↓
Huge rewrite
 ↓
Hope it works
```

---

# 80. MASTER DEVELOPMENT PHASES

## Phase 0 — Repository Audit

Deliver:

```text
PROJECT_AUDIT.md
```

No code changes.

---

## Phase 1 — Architecture

Deliver:

```text
ARCHITECTURE.md
DATA_MODEL.md
```

No unnecessary feature changes.

---

## Phase 2 — Image Pipeline

Implement:

- validation
- decode
- crop
- resize
- normalized RGBA

Test thoroughly.

---

## Phase 3 — PixelGrid

Implement:

- grid dimensions
- cell mapping
- typed arrays
- serialization

Test.

---

## Phase 4 — Pixel Art Sampling

Implement:

- average
- median
- perceptual sampling

Test.

---

## Phase 5 — Palette

Implement:

- original
- limited
- monochrome
- custom
- automatic palette

Test.

---

## Phase 6 — Dithering

Implement:

- none
- Bayer
- Floyd-Steinberg
- Atkinson

Test.

---

## Phase 7 — Pixel Preview

Implement:

- rendering
- sharp pixels
- zoom
- pan
- grid

Test.

---

## Phase 8 — Pixel Editor

Implement:

- pencil
- eraser
- fill
- picker
- rectangle
- line

Test.

---

## Phase 9 — History

Implement:

- undo
- redo

Test.

---

## Phase 10 — SVG

Implement:

- editable SVG
- optimized SVG
- color groups
- dimensions

Test with Illustrator/Inkscape.

---

## Phase 11 — PNG

Implement:

- 1×
- 2×
- 4×
- 8×
- custom

Test.

---

## Phase 12 — Pixel Art UI

Replace the old mixed Pixel Art controls with dedicated controls.

Test every control.

---

## Phase 13 — Worker Architecture

Move expensive operations to Web Workers.

Test performance.

---

## Phase 14 — Existing Engine Verification

Verify:

- Random Flow
- Camo Mesh
- Pencil
- Halftone
- Line Art

No behavior regression.

---

## Phase 15 — Mosaic

Only now build/refactor Mosaic.

---

## Phase 16 — Project Save

Implement:

```text
.pixelart
```

save/load.

---

## Phase 17 — Accessibility

Keyboard + screen reader + focus.

---

## Phase 18 — Responsive

Tablet + mobile.

---

## Phase 19 — Security / Privacy

Validate:

- local processing
- file validation
- no accidental uploads
- no sensitive logging

---

## Phase 20 — QA

Run:

- unit tests
- integration tests
- E2E
- browser tests
- export tests
- regression tests
- performance tests

---

## Phase 21 — Production Optimization

Optimize:

- bundle
- workers
- memory
- rendering
- SVG
- startup
- lazy loading

---

## Phase 22 — Final Release

Requirements:

```text
No known critical bugs
No console errors
Production build passes
Pixel Art tests pass
SVG tests pass
PNG tests pass
Existing engines pass
Responsive tests pass
Accessibility checks pass
```

---

# 81. DEFINITION OF 100% COMPLETE

The project is considered production-ready only when:

## Pixel Art

- [ ] Independent engine
- [ ] Fixed grid
- [ ] Correct sampling
- [ ] Original colors
- [ ] Palette reduction
- [ ] Custom palette
- [ ] Automatic palette
- [ ] Perceptual color matching
- [ ] Dithering
- [ ] Alpha
- [ ] Pixel editing
- [ ] Undo
- [ ] Redo
- [ ] Zoom
- [ ] Pan
- [ ] Grid
- [ ] Live preview

## Export

- [ ] PNG
- [ ] SVG
- [ ] True vector SVG
- [ ] Editable SVG
- [ ] Optimized SVG
- [ ] Correct dimensions
- [ ] Correct colors
- [ ] Correct transparency

## Existing Features

- [ ] Random Flow unchanged
- [ ] Camo Mesh unchanged
- [ ] Pencil unchanged
- [ ] Halftone unchanged
- [ ] Line Art unchanged
- [ ] Existing upload unchanged
- [ ] Existing reset unchanged

## Engineering

- [ ] Web Worker
- [ ] Memory protection
- [ ] Error handling
- [ ] Cancellation
- [ ] Tests
- [ ] Documentation
- [ ] No console errors
- [ ] Production build succeeds

## UX

- [ ] Clear controls
- [ ] Tooltips
- [ ] Responsive
- [ ] Keyboard support
- [ ] Loading states
- [ ] Error states
- [ ] Professional visual design

---

# 82. FINAL PRODUCT ARCHITECTURE

The finished product should conceptually be:

```text
                           APP
                            |
             +--------------+--------------+
             |              |              |
          IMAGE          PROJECT         EXPORT
          SYSTEM          SYSTEM          SYSTEM
             |              |              |
             +--------------+--------------+
                            |
                       MODE MANAGER
                            |
       +--------------------+--------------------+
       |                    |                    |
       v                    v                    v
  PIXEL ART             HALFTONE             LINE ART
    ENGINE                ENGINE               ENGINE
       |                    |                    |
       |                    |                    |
 PixelGrid              DotGeometry         LineGeometry
       |                    |                    |
       +--------------------+--------------------+
                            |
                        RENDERER
                            |
                    +-------+-------+
                    |               |
                   PNG             SVG
                    |               |
                 Raster           Vector
```

---

# 83. FINAL USER EXPERIENCE

The user should be able to:

```text
1. Upload a photo.

2. Select Pixel Art.

3. Choose 64 × 36.

4. Choose Original Colors.

5. Reduce palette to 32 colors.

6. Select Bayer dithering if desired.

7. See the pixel artwork immediately.

8. Zoom to 800%.

9. Turn on the grid.

10. Pick a pixel.

11. Paint/fix individual pixels.

12. Undo/redo edits.

13. Export PNG.

14. Export true SVG.

15. Open SVG in Illustrator.

16. Edit individual vector cells.

17. Save the project.

18. Reopen it later.
```

---

# 84. MOST IMPORTANT IMPLEMENTATION PRINCIPLE

Do not think of the new feature as:

```text
"Add Pixel Art Mode"
```

Think of it as:

```text
"Add a complete Pixel Art application inside the existing
creative image generator."
```

The architecture must therefore be:

```text
Existing Website
       +
Independent Pixel Art Application
       =
Unified Creative Generator
```

---

# 85. MASTER AI CODING AGENT PROMPT

Use this as the initial instruction after giving the agent this PRD:

> You are the lead engineer responsible for implementing the attached Product Requirements Document.
>
> This is an existing working image-processing website. Do NOT rebuild it from scratch.
>
> First inspect the repository and existing implementation.
>
> Preserve all existing functionality, especially:
>
> - Random Flow
> - Camo Mesh
> - Pencil
> - Halftone
> - Line Art
> - existing upload
> - existing reset
> - existing PNG export
> - existing SVG export
>
> Your primary new feature is a completely independent Pixel Art processing engine.
>
> Pixel Art must have its own:
>
> - fixed-grid system
> - pixel resolution
> - cell sampling
> - color sampling
> - palette generation
> - palette reduction
> - perceptual color matching
> - dithering
> - transparency
> - PixelGrid data model
> - pixel editor
> - undo/redo
> - zoom/pan
> - preview renderer
> - PNG exporter
> - true SVG exporter
> - project save/load
>
> Do not implement Pixel Art by modifying the Halftone algorithm.
>
> Do not make Pixel Art depend on:
>
> - dot radius
> - halftone strength
> - halftone grid angle
> - variable dot size
> - luminance-controlled geometry
> - halftone shape rotation
>
> Pixel Art must use fixed-size cells where color changes but cell dimensions remain fixed.
>
> SVG export must contain actual vector geometry such as rectangles. Do not embed the source image or generated PNG as an SVG image.
>
> Keep all existing engines isolated.
>
> Work phase-by-phase.
>
> Before each phase:
>
> 1. Inspect the relevant code.
> 2. Explain the implementation plan.
> 3. Identify affected files.
> 4. Implement only that phase.
> 5. Run the appropriate tests/build.
> 6. Fix errors.
> 7. Verify existing functionality has not regressed.
> 8. Update documentation.
> 9. Report exactly what changed.
>
> Never claim something works unless you actually test it.
>
> Never silently remove functionality.
>
> Never rewrite unrelated code.
>
> Never create UI controls that are not connected to real processing logic.
>
> Begin with Phase 0: complete repository audit only. Do not modify application code during the audit.

---

# 86. RELEASE GATE

Before deployment, the final agent must produce:

```text
FINAL_QA_REPORT.md
```

containing:

```text
Feature
Status
Test
Result
Known Issues
```

The deployment is approved only if:

```text
Critical Issues = 0
High Issues = 0
Build Errors = 0
Console Errors = 0
Pixel Art Core Tests = PASS
SVG Tests = PASS
PNG Tests = PASS
Regression Tests = PASS
```

Any remaining medium/low issue must be explicitly documented.

---

# 87. FINAL SUCCESS CONDITION

The finished website should no longer be described as merely a:

**"Halftone Monochrome Generator."**

It should function as a:

**Professional browser-based creative image conversion and vector design tool with independent Pixel Art, Halftone, Line Art, Mosaic, Random Flow, Camo Mesh and Pencil engines.**

The new Pixel Art engine is considered successful only when it can independently perform:

```text
IMAGE
 ↓
FIXED GRID
 ↓
COLOR SAMPLING
 ↓
PALETTE
 ↓
DITHERING
 ↓
PIXEL GRID
 ↓
MANUAL EDITING
 ↓
UNDO / REDO
 ↓
PREVIEW
 ↓
PNG
 ↓
TRUE SVG
```

while the existing:

```text
HALFTONE
CAMO MESH
RANDOM FLOW
PENCIL
LINE ART
```

continue working without regression.