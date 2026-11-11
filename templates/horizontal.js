(function (global) {
  global.BobbinPartTemplates = global.BobbinPartTemplates || {};
  global.BobbinPartTemplates.horizontal = function (v, formatNumber, strings) {
    const { inwardArchPoints, filletedPolygonPoints } = global.BobbinGeometry;
    const tubeW = v.TubeStackThickness + 2 * v.SheetThickness;
    const tubeLengthWithLocks = v.TubeLength + 2 * v.TubeExtSideWallLockHight;
    const tabWidth = tubeW + 2 * v.TubeExtSideWallLockWidth;
    const halfW = tubeW / 2;
    const halfL = v.TubeLength / 2;
    const halfTab = tabWidth / 2;
    const horizontalSlotHalfWidth = v.TubeSlotWidth / 2;
    const horizontalNotchX = v.TubeStackThickness / 2;
    const cutterRadius = v.ClearanceMillingCutterDiameter / 2;
    const horizontalOutline = [
      [-halfTab, -halfL - v.TubeExtSideWallLockHight],
      [halfTab, -halfL - v.TubeExtSideWallLockHight],
      [halfTab, -halfL],
      [halfW, -halfL],
      [halfW, -horizontalSlotHalfWidth],
      [horizontalNotchX, -horizontalSlotHalfWidth],
      [horizontalNotchX, horizontalSlotHalfWidth],
      [halfW, horizontalSlotHalfWidth],
      [halfW, halfL],
      [halfTab, halfL],
      [halfTab, halfL + v.TubeExtSideWallLockHight],
      [-halfTab, halfL + v.TubeExtSideWallLockHight],
      [-halfTab, halfL],
      [-halfW, halfL],
      [-halfW, horizontalSlotHalfWidth],
      [-horizontalNotchX, horizontalSlotHalfWidth],
      [-horizontalNotchX, -horizontalSlotHalfWidth],
      [-halfW, -horizontalSlotHalfWidth],
      [-halfW, -halfL],
      [-halfTab, -halfL],
    ];
    const horizontalOuterRadius = Math.min(v.TubeExtSideWallLockRadius, v.TubeExtSideWallLockHight / 2, tabWidth / 4);
    const horizontalShoulderRadius = Math.min(cutterRadius, (halfTab - halfW) / 2, v.TubeExtSideWallLockHight / 2);
    const horizontalNotchRadius = Math.min(cutterRadius, v.TubeSlotWidth / 2);
    const horizontalTabArchRadius = Math.min(cutterRadius, (halfTab - halfW) / 2);
    const horizontalCornerRadii = [
      horizontalOuterRadius, horizontalOuterRadius, horizontalShoulderRadius, { radius: horizontalTabArchRadius, arch: true }, 0.5,
      { radius: cutterRadius, inwardArch: true },
      { radius: cutterRadius, inwardArch: true },
      0.5, { radius: horizontalTabArchRadius, arch: true }, horizontalShoulderRadius, horizontalOuterRadius, horizontalOuterRadius, horizontalShoulderRadius, { radius: horizontalTabArchRadius, arch: true },
      0.5, { radius: cutterRadius, inwardArch: true },
      { radius: cutterRadius, inwardArch: true },
      0.5, { radius: horizontalTabArchRadius, arch: true }, horizontalShoulderRadius,
    ];
    const horizontalContour = filletedPolygonPoints(horizontalOutline, horizontalCornerRadii);
    const dimensions = [
        {
          leader: {
            from: [
              -halfTab + horizontalOuterRadius - horizontalOuterRadius / Math.SQRT2,
              halfL + v.TubeExtSideWallLockHight - horizontalOuterRadius + horizontalOuterRadius / Math.SQRT2,
            ],
            to: [-halfTab + horizontalOuterRadius + 10, halfL + v.TubeExtSideWallLockHight - horizontalOuterRadius - 8],
          },
          label: `R${formatNumber(horizontalOuterRadius)}`,
          parameterKeys: ["TubeExtSideWallLockRadius"],
          primaryParameterKeys: ["TubeExtSideWallLockRadius"],
        },
        {
          leader: {
            from: [halfW + horizontalShoulderRadius, halfL + horizontalShoulderRadius],
            to: [halfW + 10, halfL + 8],
          },
          label: `R${formatNumber(horizontalShoulderRadius)}`,
          parameterKeys: ["ClearanceMillingCutterDiameter"],
          primaryParameterKeys: ["ClearanceMillingCutterDiameter"],
        },
        {
          leader: {
            from: [
              -halfTab + horizontalShoulderRadius - horizontalShoulderRadius / Math.SQRT2,
              halfL + horizontalShoulderRadius - horizontalShoulderRadius / Math.SQRT2,
            ],
            to: [
              -halfTab + horizontalShoulderRadius - horizontalShoulderRadius / Math.SQRT2 - 8,
              halfL + horizontalShoulderRadius - horizontalShoulderRadius / Math.SQRT2 - 8,
            ],
          },
          label: `R${formatNumber(horizontalShoulderRadius)}`,
          parameterKeys: ["ClearanceMillingCutterDiameter"],
          primaryParameterKeys: ["ClearanceMillingCutterDiameter"],
        },
        {
          leader: {
            from: inwardArchPoints(horizontalOutline, 5, horizontalNotchRadius, 8)[4],
            to: [horizontalNotchX - 10, -horizontalSlotHalfWidth + 6],
          },
          label: `R${formatNumber(horizontalNotchRadius)}`,
          parameterKeys: ["ClearanceMillingCutterDiameter"],
          primaryParameterKeys: ["ClearanceMillingCutterDiameter"],
        },
        { axis: "x", from: -halfTab, to: halfTab, y: tubeLengthWithLocks / 2 + 8, label: formatNumber(tabWidth), parameterKeys: ["CoreHight", "SheetThickness", "TubeExtSideWallLockWidth"], extensionFromY1: halfL + v.TubeExtSideWallLockHight - horizontalOuterRadius, extensionFromY2: halfL + v.TubeExtSideWallLockHight - horizontalOuterRadius },
        { axis: "y", from: -tubeLengthWithLocks / 2, to: tubeLengthWithLocks / 2, x: halfTab + 22, label: formatNumber(tubeLengthWithLocks), parameterKeys: ["CoreLength", "TubeExtSideWallLockHight"] },
        { axis: "x", from: -halfW, to: halfW, y: v.TubeSlotWidth / 2 + 5, label: formatNumber(tubeW), parameterKeys: ["CoreHight", "SheetThickness"], labelDy: -3, internal: true },
        {
          axis: "x",
          from: -v.CoreHight / 2,
          to: v.CoreHight / 2,
          y: 0,
          label: formatNumber(v.CoreHight),
          parameterKeys: ["CoreHight"],
          primaryParameterKeys: ["CoreHight"],
          labelDy: -3,
          internal: true,
        },
        {
          axis: "x",
          from: -halfTab,
          to: -halfW,
          y: -halfL - v.TubeExtSideWallLockHight - 4,
          label: formatNumber(halfTab - halfW),
          parameterKeys: ["TubeExtSideWallLockWidth"],
          primaryParameterKeys: ["TubeExtSideWallLockWidth"],
          extensionFromY: -halfL - v.TubeExtSideWallLockHight,
          extensionFromY1: -halfL - v.TubeExtSideWallLockHight + horizontalOuterRadius,
        },
        {
          axis: "y",
          from: -halfL - v.TubeExtSideWallLockHight,
          to: -halfL,
          x: -halfTab - 2,
          label: formatNumber(v.TubeExtSideWallLockHight),
          parameterKeys: ["TubeExtSideWallLockHight"],
          primaryParameterKeys: ["TubeExtSideWallLockHight"],
          labelDx: -8,
          arrowOutside: true,
        },
        {
          axis: "y",
          from: -v.CoreLength / 2,
          to: v.CoreLength / 2,
          x: halfTab + 15,
          extensionFromX1: v.CoreHight / 2,
          extensionFromX2: v.CoreHight / 2,
          label: formatNumber(v.CoreLength),
          parameterKeys: ["CoreLength"],
          primaryParameterKeys: ["CoreLength"],
        },
        {
          axis: "y",
          from: -horizontalSlotHalfWidth,
          to: horizontalSlotHalfWidth,
          x: -halfW - 4,
          label: formatNumber(v.TubeSlotWidth),
          parameterKeys: ["CoreLength"],
        },
        {
          axis: "x",
          from: horizontalNotchX,
          to: halfW,
          y: -tubeLengthWithLocks / 2 - 8,
          label: formatNumber(halfW - horizontalNotchX),
          parameterKeys: ["SheetThickness"],
          primaryParameterKeys: ["SheetThickness"],
          arrowOutside: true,
          arrowSize: 1.1,
          extensionFromY: -horizontalSlotHalfWidth,
          extensionFromY2: -horizontalSlotHalfWidth - 0.5,
          labelAtMidpoint: true,
        },
    ];
    const geometry = {
      contours: [horizontalContour],
      referenceContours: [{
        points: [
          [-v.CoreHight / 2, -v.CoreLength / 2],
          [v.CoreHight / 2, -v.CoreLength / 2],
          [v.CoreHight / 2, v.CoreLength / 2],
          [-v.CoreHight / 2, v.CoreLength / 2],
        ],
        stroke: "#2e8b57",
      }],
      circles: [],
      viewBounds: { minX: -halfTab - 24, maxX: halfTab + 42, minY: -tubeLengthWithLocks / 2 - 25, maxY: tubeLengthWithLocks / 2 + 20 },
    };
    return {
      key: "horizontal",
      title: strings["part.horizontal.title"],
      subtitle: global.BobbinI18n.format(strings["part.subtitle"], { size: `${formatNumber(tabWidth)} × ${formatNumber(tubeLengthWithLocks)}` }),
      geometry,
      dimensions,
    };
  };
})(globalThis);