(function (global) {
  global.BobbinPartTemplates = global.BobbinPartTemplates || {};
  global.BobbinPartTemplates.vertical = function (v, formatNumber, strings) {
    const { inwardArchPoints, filletedPolygonPoints } = global.BobbinGeometry;
    const tubeH = v.TubeRibbonWidth;
    const halfTube = tubeH / 2;
    const verticalL = v.TubeLength;
    const verticalSlotDepth = Math.max((verticalL - v.TubeSlotWidth) / 2, 0.1);
    const edgeNotchLeft = Math.max(v.SheetThickness, 0.1);
    const edgeNotchRight = Math.max(v.TubeExtVerticalLockWidth, 0.1);
    const verticalW = tubeH + edgeNotchLeft + edgeNotchRight;
    const verticalOutline = [
      [-halfTube, -verticalL / 2],
      [halfTube, -verticalL / 2],
      [halfTube, -verticalL / 2 + verticalSlotDepth],
      [halfTube + edgeNotchRight, -verticalL / 2 + verticalSlotDepth],
      [halfTube + edgeNotchRight, verticalL / 2 - verticalSlotDepth],
      [halfTube, verticalL / 2 - verticalSlotDepth],
      [halfTube, verticalL / 2],
      [-halfTube, verticalL / 2],
      [-halfTube, verticalL / 2 - verticalSlotDepth],
      [-halfTube - edgeNotchLeft, verticalL / 2 - verticalSlotDepth],
      [-halfTube - edgeNotchLeft, -verticalL / 2 + verticalSlotDepth],
      [-halfTube, -verticalL / 2 + verticalSlotDepth],
    ];
    const verticalOuterRadius = Math.min(v.ClearanceMillingCutterRadius, verticalSlotDepth / 2, tubeH / 2);
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
              -halfTube + verticalOuterRadius - verticalOuterRadius / Math.SQRT2,
              -verticalL / 2 + verticalOuterRadius - verticalOuterRadius / Math.SQRT2,
            ],
            to: [-halfTube - 8, -verticalL / 2 - 8],
          },
          label: `R${formatNumber(verticalOuterRadius)}`,
          parameterKeys: ["ClearanceMillingCutterRadius"],
          primaryParameterKeys: ["ClearanceMillingCutterRadius"],
        },
        {
          leader: {
            from: inwardArchPoints(verticalOutline, 2, verticalSlotRadius, 8)[4],
            to: [halfTube - 9, -verticalL / 2 + verticalSlotDepth - 8],
          },
          label: `R${formatNumber(verticalSlotRadius)}`,
          parameterKeys: ["ClearanceMillingCutterRadius"],
          primaryParameterKeys: ["ClearanceMillingCutterRadius"],
        },
        { axis: "x", from: -halfTube, to: halfTube, y: 0, label: formatNumber(tubeH), parameterKeys: ["CoreWidth"], primaryParameterKeys: ["CoreWidth"], labelDy: -3, internal: true },
        { axis: "x", from: -halfTube - edgeNotchLeft, to: halfTube + edgeNotchRight, y: verticalL / 2 + 8, label: formatNumber(verticalW), parameterKeys: ["CoreWidth", "SheetThickness", "TubeExtVerticalLockWidth"] },
        { axis: "y", from: -verticalL / 2, to: verticalL / 2, x: halfTube + edgeNotchRight + 9, label: formatNumber(verticalL), parameterKeys: ["CoreLength"], primaryParameterKeys: ["CoreLength"] },
        {
          axis: "y",
          from: -verticalL / 2,
          to: -verticalL / 2 + verticalSlotDepth,
          x: -halfTube - edgeNotchLeft - 9,
          extensionFromX1: -halfTube,
          extensionFromX2: -halfTube - edgeNotchLeft,
          label: formatNumber(verticalSlotDepth),
          parameterKeys: ["CoreLength"],
          labelDx: -8,
        },
        {
          axis: "y",
          from: verticalL / 2 - verticalSlotDepth,
          to: verticalL / 2,
          x: -halfTube - edgeNotchLeft - 9,
          extensionFromX1: -halfTube - edgeNotchLeft,
          extensionFromX2: -halfTube,
          label: formatNumber(verticalSlotDepth),
          parameterKeys: ["CoreLength"],
          labelDx: -8,
        },
        {
          axis: "y",
          from: -verticalL / 2 + verticalSlotDepth,
          to: verticalL / 2 - verticalSlotDepth,
          x: -halfTube - edgeNotchLeft - 9,
          extensionFromX1: -halfTube - edgeNotchLeft,
          extensionFromX2: -halfTube - edgeNotchLeft,
          label: formatNumber(verticalL - 2 * verticalSlotDepth),
          parameterKeys: ["CoreLength"],
          labelDx: -8,
        },
        {
          axis: "x",
          from: -halfTube - edgeNotchLeft,
          to: -halfTube,
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
          from: halfTube,
          to: halfTube + edgeNotchRight,
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
      viewBounds: { minX: -halfTube - edgeNotchLeft - 18, maxX: halfTube + edgeNotchRight + 20, minY: -verticalL / 2 - 21, maxY: verticalL / 2 + 20 },
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