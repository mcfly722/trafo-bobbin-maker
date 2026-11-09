(function (global) {
  global.BobbinPartTemplates = global.BobbinPartTemplates || {};
  global.BobbinPartTemplates.vertical = function (v, formatNumber, strings) {
    const { inwardArchPoints, filletedPolygonPoints } = global.BobbinGeometry;
    const tubeH = v.TubeRibbonWidth;
    const verticalW = tubeH;
    const verticalL = v.TubeLength;
    const verticalSlotDepth = Math.max((verticalL - v.TubeSlotWidth) / 2, 0.1);
    const edgeNotchLeft = Math.max(v.SheetThickness, 0.1);
    const edgeNotchRight = Math.max(v.TubeExtVerticalLockWidth, 0.1);
    const verticalOutline = [
      [-verticalW / 2 + edgeNotchLeft, -verticalL / 2],
      [verticalW / 2 - edgeNotchRight, -verticalL / 2],
      [verticalW / 2 - edgeNotchRight, -verticalL / 2 + verticalSlotDepth],
      [verticalW / 2, -verticalL / 2 + verticalSlotDepth],
      [verticalW / 2, verticalL / 2 - verticalSlotDepth],
      [verticalW / 2 - edgeNotchRight, verticalL / 2 - verticalSlotDepth],
      [verticalW / 2 - edgeNotchRight, verticalL / 2],
      [-verticalW / 2 + edgeNotchLeft, verticalL / 2],
      [-verticalW / 2 + edgeNotchLeft, verticalL / 2 - verticalSlotDepth],
      [-verticalW / 2, verticalL / 2 - verticalSlotDepth],
      [-verticalW / 2, -verticalL / 2 + verticalSlotDepth],
      [-verticalW / 2 + edgeNotchLeft, -verticalL / 2 + verticalSlotDepth],
    ];
    const verticalOuterRadius = Math.min(v.ClearanceMillingCutterRadius, verticalSlotDepth / 2, (verticalW - edgeNotchLeft - edgeNotchRight) / 2);
    const verticalSlotRadius = Math.min(v.ClearanceMillingCutterRadius, verticalSlotDepth / 2);
    const verticalCornerRadii = Array(verticalOutline.length).fill(0);
    for (const index of [0, 1, 6, 7]) {
      verticalCornerRadii[index] = verticalOuterRadius;
    }
    for (const index of [2, 5, 8, 11]) {
      verticalCornerRadii[index] = {
        radius: v.ClearanceMillingCutterRadius,
        inwardArch: true,
      };
    }
    const verticalContour = filletedPolygonPoints(verticalOutline, verticalCornerRadii);
    const dimensions = [
        {
          leader: {
            from: [
              -verticalW / 2 + edgeNotchLeft + verticalOuterRadius - verticalOuterRadius / Math.SQRT2,
              -verticalL / 2 + verticalOuterRadius - verticalOuterRadius / Math.SQRT2,
            ],
            to: [-verticalW / 2 + edgeNotchLeft - 8, -verticalL / 2 - 8],
          },
          label: `R${formatNumber(verticalOuterRadius)}`,
          parameterKeys: ["ClearanceMillingCutterRadius"],
          primaryParameterKeys: ["ClearanceMillingCutterRadius"],
        },
        {
          leader: {
            from: inwardArchPoints(verticalOutline, 2, verticalSlotRadius, 8)[4],
            to: [verticalW / 2 - edgeNotchRight - 9, -verticalL / 2 + verticalSlotDepth - 8],
          },
          label: `R${formatNumber(verticalSlotRadius)}`,
          parameterKeys: ["ClearanceMillingCutterRadius"],
          primaryParameterKeys: ["ClearanceMillingCutterRadius"],
        },
        { axis: "x", from: -verticalW / 2, to: verticalW / 2, y: 0, label: formatNumber(verticalW), parameterKeys: ["CoreWidth"], labelDy: -3, internal: true },
        { axis: "x", from: -verticalW / 2 + edgeNotchLeft, to: verticalW / 2 - edgeNotchRight, y: verticalL / 2 + 8, label: formatNumber(verticalW - edgeNotchLeft - edgeNotchRight), parameterKeys: ["CoreWidth", "SheetThickness", "TubeExtVerticalLockWidth"], primaryParameterKeys: ["CoreWidth"] },
        { axis: "y", from: -verticalL / 2, to: verticalL / 2, x: verticalW / 2 + 9, label: formatNumber(verticalL), parameterKeys: ["CoreLength"], primaryParameterKeys: ["CoreLength"] },
        {
          axis: "x",
          from: -verticalW / 2,
          to: -verticalW / 2 + edgeNotchLeft,
          y: -verticalL / 2 - 8,
          label: formatNumber(v.SheetThickness),
          parameterKeys: ["SheetThickness"],
          primaryParameterKeys: ["SheetThickness"],
          arrowOutside: true,
          arrowSize: 1.1,
          extensionFromY: -verticalL / 2 + verticalSlotDepth,
          labelAtMidpoint: true,
          labelDy: 0,
        },
        {
          axis: "x",
          from: verticalW / 2 - edgeNotchRight,
          to: verticalW / 2,
          y: -verticalL / 2 - 8,
          label: formatNumber(v.TubeExtVerticalLockWidth),
          parameterKeys: ["TubeExtVerticalLockWidth"],
          primaryParameterKeys: ["TubeExtVerticalLockWidth"],
          arrowOutside: true,
          arrowSize: 1.1,
          extensionFromY: -verticalL / 2 + verticalSlotDepth,
          labelAtMidpoint: true,
          labelDy: 0,
        },
    ];
    const geometry = {
      contours: [verticalContour],
      referenceContours: [{
        points: [
          [-v.CoreWidth / 2, -v.CoreLength / 2],
          [v.CoreWidth / 2, -v.CoreLength / 2],
          [v.CoreWidth / 2, v.CoreLength / 2],
          [-v.CoreWidth / 2, v.CoreLength / 2],
        ],
        stroke: "#2e8b57",
      }],
      circles: [],
      viewBounds: { minX: -verticalW / 2 - 18, maxX: verticalW / 2 + 20, minY: -verticalL / 2 - 21, maxY: verticalL / 2 + 20 },
    };
    return {
      key: "vertical",
      title: strings["part.vertical.title"],
      subtitle: global.BobbinI18n.format(strings["part.subtitle"], { size: `${formatNumber(verticalW)} × ${formatNumber(verticalL)}` }),
      geometry,
      dimensions,
    };
  };
})(globalThis);