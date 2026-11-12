# Changelog

## v1.11

**Holding tabs (bridges) keep the parts attached to the sheet during milling**

- **New "Holding tabs" parameter group** — the `HoldingTabWidth` parameter (default 1 mm) sets the width of the bridges that are left uncut so the milled parts stay attached to the sheet and do not move under the cutter. Set it to 0 to cut the parts out completely.
- **Tab placement on every part** — the horizontal insert gets two tabs on the tube lock tips, the vertical insert two tabs on the top and bottom edges, and the sidewall four tabs: two on the side edges and two on the tube hole edge.
- **Toolpath split around the tabs** — the red cutter center path and the DXF export are broken into open segments at the tab positions: the cutter skips a gap of `tab width + cutter diameter`, leaving the bridge material in place.

## v1.10

**Sharp lock slot mouth corners on the horizontal insert**

- **Removed the 0.5 mm fillet at the lock slot mouth** — the corners where the tube wall steps into the lock slot (`TubeSlotWidth`) are now sharp on the part contour, and the cutter toolpath turns there at a sharp miter instead of rounding.

## v1.9

**Milling cutter toolpath: the drawings show the cutter center path in red, and DXF exports exactly that path**

- **Cutter parameter is now a diameter** — the former "milling cutter radius" parameter became `ClearanceMillingCutterDiameter` (default 2 mm), and the "Clearances and compensation" group moved up right under "Material". Old shared links with `ClearanceMillingCutter` still load.
- **New validations** — hole diameters and the terminal slot width can no longer be smaller than the cutter diameter.
- **Red cutter center toolpath on every drawing** — the cut contours are offset by the cutter radius (outward for outer contours, inward for holes and windows) and drawn as a red line. At pocket corners (lock slot corners, corner relief arches) the path plunges to the corner point and retracts along the very same line before turning, so sharp corners are cut completely without arc moves.
- **DXF export now contains the toolpath itself** — the exported polylines are the cutter center path (including the plunge-retract corner moves), not the raw part outline; round holes become center-path polylines of radius `hole radius − cutter radius`. With the cutter diameter set to 0 the export falls back to the plain part contours.
- **Fixed a self-intersecting part contour** — a fillet arc was drawn with the unclamped radius while its tangent points used the clamped one, bulging outward on narrow edges (e.g. with sheet thickness above zero).

## v1.8

**Dimension extension lines always reach the part, and arcs stay smooth at any zoom**

- **Fixed extension lines hanging in mid-air** — on all three drawings several dimension extension lines started off the part edge: the ones landing exactly on a horizontal edge or a vertical edge line found no contour crossing, and the ones aimed at filleted corners targeted the imaginary sharp corner. Both cases now resolve to the real edge of the part:
  - contour crossings falling exactly on an edge are retried with a tiny inward offset;
  - dimensions pinned to filleted corners (overall widths, protrusion width, slot depths, overall sidewall width) now start at the fillet tangent point on the part edge.
- **Corner hole distance dimensions point at the hole center** — the horizontal and vertical extension lines next to the corner hole now run to the hole center instead of stopping at the edge level or hanging short.
- **Terminal slot height dimension no longer crosses the slot** — its extension lines stop at the left edge of the first terminal slot instead of running through the cutout to its center.
- **Smooth arcs at any zoom level** — fillets, tab arches, inward arches, and terminal slot arches were approximated with a fixed 8–12 chords and turned visibly polygonal when zoomed in. The chord count now adapts to each arc's radius and sweep, keeping the deviation from the ideal arc under 0.0015 mm (sub-pixel even at ×25 zoom), which also improves the DXF cut contour fidelity.
- **Thicker highlight for dependent dimensions** — dependent dimensions are easier to see when zoomed in.

## v1.7

**Mouse wheel zoom**

- **Zoom drawings with the mouse wheel** — scroll over a drawing to zoom in (up to ×25) or out (down to 50%), anchored at the cursor position.
- **100% button** — a new button in the drawing card header resets the zoom while keeping the currently centered point in place.
- **Center button now resets zoom too** — the crosshair button returns the drawing to its original fully-visible centered state, and correctly centers the part at any zoom level.

## v1.6

**Drawing panning**

- **Drag drawings with the mouse** — press and hold anywhere on a drawing and move the mouse to shift the view. Works with touchscreens as well.
- **Center button** — a square crosshair button in the drawing card header returns the drawing to its original centered position.
- Panning is remembered per part and is preserved when switching tabs or changing parameters.

## v1.5

**Dimension chain on the vertical insert drawing**

- **New dimensions on the left side of the vertical insert** — the drawing now shows the full height breakdown: bottom edge offset, protrusion height, and top edge offset.
- **Single dimension line** — all three dimensions form a chain on one line with the same standoff from the part edge as the overall length dimension, with inward-pointing arrows.
- The new dimensions are linked to the core length parameter and are highlighted as dependent when hovering over it.

## v1.4

**DXF export is now compatible with CorelDraw and legacy CAD software**

- **Two export formats** — the Export button is now a dropdown with a choice of DXF version:
  - **DXF AutoCAD 2000 (AC1015)** — the primary format;
  - **DXF AutoCAD R12 (AC1009)** — maximum compatibility: no handles, subclass markers, or any other structures that did not exist in R12.
- **Fixed CorelDraw compatibility** — contours are no longer exported as `LWPOLYLINE`, which CorelDraw failed to open. Classic `POLYLINE` / `VERTEX` / `SEQEND` chains are used instead, readable by every CorelDraw and AutoCAD version since R12.
- **Hairline cut lines** — in AC1015 all entities and the `CUT` layer get a `0.00 mm` lineweight; in AC1009 polylines get an explicit zero width. CorelDraw imports them directly as "Hairline" outlines, no manual stroke adjustment needed.
- **Millimeter units are declared in the file header** (`$INSUNITS=4` / `$MEASUREMENT=1`), so the scale no longer breaks on import.
- **File names include the format version**: `bobbin-templates-mm-ac1015.dxf` and `bobbin-templates-mm-ac1009.dxf`.
