(function (global) {
  global.BobbinPartTemplates = global.BobbinPartTemplates || {};
  global.BobbinPartTemplates.sidewall = function (v, formatNumber, strings) {
    function cornerRelievedRectanglePoints(x1, y1, x2, y2, radius, segments = 0) {
      const r = Math.min(radius, (x2 - x1) / 4, (y2 - y1) / 4);
      const arcSegments = segments || global.BobbinGeometry.arcSegmentsForRadius(r);
      const points = [[x1 + 2 * r, y1], [x2 - 2 * r, y1]];
      const addArc = (cx, cy, start, end) => {
        for (let i = 0; i <= arcSegments; i++) {
          const angle = start + (i / arcSegments) * (end - start);
          points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
        }
      };
      addArc(x2 - r, y1, Math.PI, 2 * Math.PI);
      points.push([x2, y2]);
      addArc(x2 - r, y2, 0, Math.PI);
      points.push([x1 + 2 * r, y2]);
      addArc(x1 + r, y2, 0, Math.PI);
      points.push([x1, y1]);
      addArc(x1 + r, y1, Math.PI, 2 * Math.PI);
      return points;
    }

    function slottedSideWallProfile(width, bodyHeight, extension, radius, slotWidth, slotStart, slotCenters) {
      const { arcSegmentsForRadius } = global.BobbinGeometry;
      const x = width / 2;
      const y = bodyHeight / 2;
      const top = y + extension;
      const r = Math.min(radius, x / 2, top);
      const bottom = -top;
      const points = [[-x + r, bottom]];
      const addArc = (cx, cy, start, end) => {
        const arcSegments = arcSegmentsForRadius(r, end - start);
        for (let i = 0; i <= arcSegments; i++) {
          const angle = start + (i / arcSegments) * (end - start);
          points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
        }
      };
      for (const center of [...slotCenters].sort((a, b) => a - b)) {
        const slotRadius = slotWidth / 2;
        const slotSegments = arcSegmentsForRadius(slotRadius);
        points.push(
          [center - slotRadius, bottom],
          [center - slotRadius, -slotStart - slotRadius],
        );
        for (let i = 0; i <= slotSegments; i++) {
          const angle = Math.PI - (Math.PI * i) / slotSegments;
          points.push([center + slotRadius * Math.cos(angle), -slotStart - slotRadius + slotRadius * Math.sin(angle)]);
        }
        points.push([center + slotRadius, bottom]);
      }
      points.push([x - r, bottom]);
      addArc(x - r, bottom + r, -Math.PI / 2, 0);
      points.push([x, y + extension - r]);
      addArc(x - r, y + extension - r, 0, Math.PI / 2);
      for (const center of [...slotCenters].sort((a, b) => b - a)) {
        const slotRadius = slotWidth / 2;
        const slotSegments = arcSegmentsForRadius(slotRadius);
        points.push(
          [center + slotRadius, top],
          [center + slotRadius, slotStart + slotRadius],
        );
        for (let i = 1; i <= slotSegments; i++) {
          const angle = -Math.PI * i / slotSegments;
          points.push([center + slotRadius * Math.cos(angle), slotStart + slotRadius + slotRadius * Math.sin(angle)]);
        }
        points.push([center - slotRadius, top]);
      }
      points.push([-x + r, top]);
      addArc(-x + r, y + extension - r, Math.PI / 2, Math.PI);
      points.push([-x, bottom + r]);
      addArc(-x + r, bottom + r, Math.PI, Math.PI * 1.5);
      return points;
    }

    function rectanglePoints(x1, y1, x2, y2) {
      return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    }
        const tubeW = v.TubeStackThickness + 2 * v.SheetThickness;
    const tubeH = v.TubeRibbonWidth + 2 * v.SheetThickness;
    const sideW = tubeW + 2 * v.FrameWidth;
    const sideH = tubeH + 2 * v.FrameWidth;
    const outerHalfHeight = sideH / 2 + v.TerminalSlotHeight;
    const cornerHoleX = sideW / 2 - v.SideWallCornerHoleDistance;
    const cornerHoleY = outerHalfHeight - v.SideWallCornerHoleDistance;
    const outerCornerRadius = Math.min(v.SideWallCornerFilletRadius, sideW / 4, outerHalfHeight);
    const cutterRadius = v.ClearanceMillingCutterDiameter / 2;
    const innerOpeningRadius = Math.min(cutterRadius, tubeW / 4, tubeH / 4);
    const wireSlotStart = tubeH / 2 + v.FrameWidth;
    const wireSlotDepth = outerHalfHeight - wireSlotStart;
    const wireSlotCenters = [];
    if (v.TerminalSlotWidth > 0) {
      for (let i = 0; i < v.TerminalSlotCount - 1; i++) {
        wireSlotCenters.push((i - (v.TerminalSlotCount - 2) / 2) * v.TerminalSlotPitch);
      }
    }
    const firstWireSlotX = -(v.TerminalSlotCount - 2) / 2 * v.TerminalSlotPitch;
    const sideOuter = slottedSideWallProfile(
      sideW,
      sideH,
      v.TerminalSlotHeight,
      v.SideWallCornerFilletRadius,
      v.TerminalSlotWidth,
      wireSlotStart,
      wireSlotCenters,
    );
    const sideHoles = [cornerRelievedRectanglePoints(-tubeW / 2, -tubeH / 2, tubeW / 2, tubeH / 2, cutterRadius)];
    const boltY = sideH / 2 + v.TerminalHoleDiameter / 2;
    if (v.TerminalHoleDiameter > 0) {
      for (const sign of [-1, 1]) {
        for (let i = 0; i < v.TerminalSlotCount; i++) {
          const x = (i - (v.TerminalSlotCount - 1) / 2) * v.TerminalSlotPitch;
          sideHoles.push({ circle: true, x, y: sign * boltY, r: v.TerminalHoleDiameter / 2 });
        }
      }
    }
    if (v.SideWallCornerHoleDiameter > 0) {
      for (const xSign of [-1, 1]) {
        for (const ySign of [-1, 1]) {
          sideHoles.push({
            circle: true,
            x: xSign * cornerHoleX,
            y: ySign * cornerHoleY,
            r: v.SideWallCornerHoleDiameter / 2,
          });
        }
      }
    }
    const dimensions = [
        {
          axis: "x",
          from: -sideW / 2,
          to: sideW / 2,
          y: outerHalfHeight + 8,
          extensionFromY: outerHalfHeight - outerCornerRadius,
          label: formatNumber(sideW),
          parameterKeys: ["CoreHight", "SheetThickness", "FrameWidth"],
        },
        { axis: "y", from: -(sideH / 2 + v.TerminalSlotHeight), to: sideH / 2 + v.TerminalSlotHeight, x: sideW / 2 + 8, label: formatNumber(sideH + 2 * v.TerminalSlotHeight), parameterKeys: ["CoreWidth", "SheetThickness", "FrameWidth", "TerminalSlotHeight"] },
        {
          axis: "x",
          from: -tubeW / 2,
          to: tubeW / 2,
          y: -outerHalfHeight - 11,
          extensionFromY: -tubeH / 2,
          label: formatNumber(tubeW),
          parameterKeys: ["CoreHight", "SheetThickness"],
        },
        {
          axis: "y",
          from: -tubeH / 2,
          to: tubeH / 2,
          x: -sideW / 2 - 7,
          extensionFromX1: -tubeW / 2,
          extensionFromX2: -tubeW / 2,
          label: formatNumber(tubeH),
          parameterKeys: ["CoreWidth", "SheetThickness"],
        },
        {
          axis: "x",
          from: -v.CoreHight / 2,
          to: v.CoreHight / 2,
          y: tubeH / 2 + 8,
          extensionFromY: v.CoreWidth / 2,
          label: formatNumber(v.CoreHight),
          parameterKeys: ["CoreHight"],
          primaryParameterKeys: ["CoreHight"],
        },
        {
          axis: "y",
          from: -v.CoreWidth / 2,
          to: v.CoreWidth / 2,
          x: -(tubeW / 2 + 8),
          extensionFromX1: -v.CoreHight / 2,
          extensionFromX2: -v.CoreHight / 2,
          label: formatNumber(v.CoreWidth),
          parameterKeys: ["CoreWidth"],
          primaryParameterKeys: ["CoreWidth"],
        },
        {
          axis: "x",
          from: tubeW / 2,
          to: sideW / 2,
          y: -outerHalfHeight - 11,
          extensionFromY: -tubeH / 2,
          label: formatNumber(v.FrameWidth),
          parameterKeys: ["FrameWidth"],
          primaryParameterKeys: ["FrameWidth"],
          labelAtMidpoint: true,
        },
        {
          leader: {
            from: [
              sideW / 2 - outerCornerRadius + outerCornerRadius / Math.SQRT2,
              outerHalfHeight - outerCornerRadius + outerCornerRadius / Math.SQRT2,
            ],
            to: [sideW / 2 - outerCornerRadius + outerCornerRadius / Math.SQRT2 + 10, outerHalfHeight - outerCornerRadius + outerCornerRadius / Math.SQRT2 + 8],
          },
          label: `R${formatNumber(outerCornerRadius)}`,
          parameterKeys: ["SideWallCornerFilletRadius"],
          primaryParameterKeys: ["SideWallCornerFilletRadius"],
        },
        {
          leader: {
            from: [
              -tubeW / 2 + innerOpeningRadius - innerOpeningRadius / Math.SQRT2,
              tubeH / 2 + innerOpeningRadius / Math.SQRT2,
            ],
            to: [
              -tubeW / 2 + innerOpeningRadius - innerOpeningRadius / Math.SQRT2 - 7,
              tubeH / 2 + innerOpeningRadius / Math.SQRT2 + 7,
            ],
          },
          label: `R${formatNumber(innerOpeningRadius)}`,
          parameterKeys: ["ClearanceMillingCutterDiameter"],
          primaryParameterKeys: ["ClearanceMillingCutterDiameter"],
        },
        ...(v.TerminalHoleDiameter > 0 && v.TerminalSlotCount >= 1 ? [{
          leader: {
            from: [
              (v.TerminalSlotCount - 1) * v.TerminalSlotPitch / 2 + v.TerminalHoleDiameter / (2 * Math.SQRT2),
              boltY - v.TerminalHoleDiameter / (2 * Math.SQRT2),
            ],
            to: [
              (v.TerminalSlotCount - 1) * v.TerminalSlotPitch / 2 + 10,
              boltY - 9,
            ],
          },
          label: `Ø${formatNumber(v.TerminalHoleDiameter)}`,
          parameterKeys: ["TerminalHoleDiameter"],
          primaryParameterKeys: ["TerminalHoleDiameter"],
        }] : []),
        ...(v.SideWallCornerHoleDiameter > 0 ? [{
          axis: "x",
          from: -sideW / 2,
          to: -cornerHoleX,
          y: -outerHalfHeight - 4,
          label: formatNumber(v.SideWallCornerHoleDistance),
          parameterKeys: ["SideWallCornerHoleDistance"],
          primaryParameterKeys: ["SideWallCornerHoleDistance"],
          extensionFromY1: -outerHalfHeight + outerCornerRadius,
          extensionFromY2: -cornerHoleY,
        },
        {
          axis: "y",
          from: -outerHalfHeight,
          to: -cornerHoleY,
          x: -sideW / 2 - 7,
          label: formatNumber(v.SideWallCornerHoleDistance),
          parameterKeys: ["SideWallCornerHoleDistance"],
          primaryParameterKeys: ["SideWallCornerHoleDistance"],
          extensionFromX2: -cornerHoleX,
        },
        {
          leader: {
            from: [
              -cornerHoleX + v.SideWallCornerHoleDiameter / (2 * Math.SQRT2),
              -cornerHoleY + v.SideWallCornerHoleDiameter / (2 * Math.SQRT2),
            ],
            to: [-cornerHoleX + 13, -cornerHoleY + 10],
          },
          label: `Ø${formatNumber(v.SideWallCornerHoleDiameter)}`,
          parameterKeys: ["SideWallCornerHoleDiameter"],
          primaryParameterKeys: ["SideWallCornerHoleDiameter"],
        }] : []),
        ...(v.TerminalSlotWidth > 0 && v.TerminalSlotCount >= 2 ? [{
          axis: "y",
          from: wireSlotStart,
          to: outerHalfHeight,
          x: -sideW / 2 - 7,
          extensionFromX1: firstWireSlotX - v.TerminalSlotWidth / 2,
          extensionFromX2: firstWireSlotX - v.TerminalSlotWidth / 2,
          label: formatNumber(wireSlotDepth),
          parameterKeys: ["TerminalSlotHeight"],
          primaryParameterKeys: ["TerminalSlotHeight"],
        }] : []),
        ...(v.TerminalSlotWidth > 0 && v.TerminalSlotCount >= 2 ? [
          { axis: "x", from: firstWireSlotX - v.TerminalSlotWidth / 2, to: firstWireSlotX + v.TerminalSlotWidth / 2, y: -(sideH / 2 + v.TerminalSlotHeight + 3), label: formatNumber(v.TerminalSlotWidth), parameterKeys: ["TerminalSlotWidth"], primaryParameterKeys: ["TerminalSlotWidth"], arrowOutside: true, arrowSize: 1.1 },
        ] : []),
        ...(v.TerminalSlotWidth > 0 && v.TerminalSlotCount >= 3 ? [
          { axis: "x", from: firstWireSlotX, to: firstWireSlotX + v.TerminalSlotPitch, y: sideH / 2 + v.TerminalSlotHeight + 3, label: formatNumber(v.TerminalSlotPitch), parameterKeys: ["TerminalSlotPitch"], primaryParameterKeys: ["TerminalSlotPitch"] },
        ] : []),
        {
          axis: "y",
          from: tubeH / 2,
          to: wireSlotStart,
          x: -sideW / 2 - 7,
          extensionFromX1: 0,
          label: formatNumber(v.FrameWidth),
          parameterKeys: ["FrameWidth"],
          primaryParameterKeys: ["FrameWidth"],
        },
    ];
    const geometry = {
      contours: [sideOuter, sideHoles[0]],
      referenceContours: [{
        points: rectanglePoints(
          -v.CoreHight / 2,
          -v.CoreWidth / 2,
          v.CoreHight / 2,
          v.CoreWidth / 2,
        ),
        stroke: "#2e8b57",
      }],
      circles: sideHoles.filter((hole) => hole.circle),
      viewBounds: { minX: -sideW / 2 - 28, maxX: sideW / 2 + 36, minY: -sideH / 2 - v.TerminalSlotHeight - 24, maxY: sideH / 2 + v.TerminalSlotHeight + 14 },
    };
    return {
      key: "sidewall",
      title: strings["part.sidewall.title"],
      subtitle: global.BobbinI18n.format(strings["part.subtitle"], { size: `${formatNumber(sideW)} × ${formatNumber(sideH + 2 * v.TerminalSlotHeight)}` }),
      geometry,
      dimensions,
    };
  };
})(globalThis);