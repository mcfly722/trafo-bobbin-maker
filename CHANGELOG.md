# Changelog

## v1.4

**DXF export is now compatible with CorelDraw and legacy CAD software**

- **Two export formats** — the Export button is now a dropdown with a choice of DXF version:
  - **DXF AutoCAD 2000 (AC1015)** — the primary format;
  - **DXF AutoCAD R12 (AC1009)** — maximum compatibility: no handles, subclass markers, or any other structures that did not exist in R12.
- **Fixed CorelDraw compatibility** — contours are no longer exported as `LWPOLYLINE`, which CorelDraw failed to open. Classic `POLYLINE` / `VERTEX` / `SEQEND` chains are used instead, readable by every CorelDraw and AutoCAD version since R12.
- **Hairline cut lines** — in AC1015 all entities and the `CUT` layer get a `0.00 mm` lineweight; in AC1009 polylines get an explicit zero width. CorelDraw imports them directly as "Hairline" outlines, no manual stroke adjustment needed.
- **Millimeter units are declared in the file header** (`$INSUNITS=4` / `$MEASUREMENT=1`), so the scale no longer breaks on import.
- **File names include the format version**: `bobbin-templates-mm-ac1015.dxf` and `bobbin-templates-mm-ac1009.dxf`.
