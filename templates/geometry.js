(function (global) {
  function inwardArchPoints(points, index, radius, segments) {
    const vertex = points[index];
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const incoming = [vertex[0] - previous[0], vertex[1] - previous[1]];
    const outgoing = [next[0] - vertex[0], next[1] - vertex[1]];
    const previousLength = Math.hypot(...incoming);
    const nextLength = Math.hypot(...outgoing);
    const incomingUnit = incoming.map((coordinate) => coordinate / previousLength);
    const outgoingUnit = outgoing.map((coordinate) => coordinate / nextLength);
    const verticalUnit = Math.abs(outgoingUnit[0]) < 1e-8 ? outgoingUnit : incomingUnit;
    const startsAtVertex = verticalUnit === outgoingUnit;
    const spanningLength = startsAtVertex ? nextLength : previousLength;
    const cornerRadius = Math.min(radius, spanningLength / 2);
    const start = startsAtVertex
      ? vertex
      : [vertex[0] - verticalUnit[0] * 2 * cornerRadius, vertex[1] - verticalUnit[1] * 2 * cornerRadius];
    const end = startsAtVertex
      ? [vertex[0] + verticalUnit[0] * 2 * cornerRadius, vertex[1] + verticalUnit[1] * 2 * cornerRadius]
      : vertex;
    const chord = [(end[0] - start[0]) / (2 * cornerRadius), (end[1] - start[1]) / (2 * cornerRadius)];
    const center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const inward = [-Math.sign(vertex[0]), 0];
    return Array.from({ length: segments + 1 }, (_, step) => {
      const angle = Math.PI * step / segments;
      return [
        center[0] - chord[0] * cornerRadius * Math.cos(angle) + inward[0] * cornerRadius * Math.sin(angle),
        center[1] - chord[1] * cornerRadius * Math.cos(angle) + inward[1] * cornerRadius * Math.sin(angle),
      ];
    });
  }

  function filletedPolygonPoints(points, cornerRadii, segments = 8) {
    const area = points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0);
    const orientation = Math.sign(area);
    return points.flatMap((vertex, index) => {
      const corner = cornerRadii[index] || 0;
      const radius = typeof corner === "number" ? corner : corner.radius;
      const previous = points[(index + points.length - 1) % points.length];
      const next = points[(index + 1) % points.length];
      const incoming = [vertex[0] - previous[0], vertex[1] - previous[1]];
      const outgoing = [next[0] - vertex[0], next[1] - vertex[1]];
      const previousLength = Math.hypot(...incoming);
      const nextLength = Math.hypot(...outgoing);
      const turn = incoming[0] * outgoing[1] - incoming[1] * outgoing[0];
      const isFreeArch = Boolean(corner.arch || corner.inwardArch);
      const cornerRadius = isFreeArch ? radius : Math.min(radius, previousLength / 2, nextLength / 2);
      if (!cornerRadius || !turn) return [vertex];

      const incomingUnit = incoming.map((coordinate) => coordinate / previousLength);
      const outgoingUnit = outgoing.map((coordinate) => coordinate / nextLength);
      if (corner.arch) {
        const center = [
          vertex[0] + (Math.sign(vertex[0]) || 1) * cornerRadius,
          vertex[1],
        ];
        const startAngle = vertex[1] > 0 ? Math.PI : 0;
        const sweep = -Math.PI;
        return Array.from({ length: segments + 1 }, (_, step) => {
          const arcAngle = startAngle + (sweep * step) / segments;
          return [center[0] + cornerRadius * Math.cos(arcAngle), center[1] + cornerRadius * Math.sin(arcAngle)];
        });
      }
      if (corner.inwardArch) {
        return inwardArchPoints(points, index, cornerRadius, segments);
      }
      const angle = Math.acos(Math.max(-1, Math.min(1, -(incomingUnit[0] * outgoingUnit[0] + incomingUnit[1] * outgoingUnit[1]))));
      const distance = cornerRadius / Math.tan(angle / 2);
      const start = [vertex[0] - incomingUnit[0] * distance, vertex[1] - incomingUnit[1] * distance];
      const end = [vertex[0] + outgoingUnit[0] * distance, vertex[1] + outgoingUnit[1] * distance];
      const direction = Math.sign(turn) * orientation;
      const center = [
        start[0] - direction * incomingUnit[1] * cornerRadius,
        start[1] + direction * incomingUnit[0] * cornerRadius,
      ];
      const startAngle = Math.atan2(start[1] - center[1], start[0] - center[0]);
      let sweep = Math.atan2(end[1] - center[1], end[0] - center[0]) - startAngle;
      if (direction > 0) {
        while (sweep < 0) sweep += 2 * Math.PI;
      } else {
        while (sweep > 0) sweep -= 2 * Math.PI;
      }
      return Array.from({ length: segments + 1 }, (_, step) => {
        const arcAngle = startAngle + (sweep * step) / segments;
        return [center[0] + radius * Math.cos(arcAngle), center[1] + radius * Math.sin(arcAngle)];
      });
    });
  }
    global.BobbinGeometry = { inwardArchPoints, filletedPolygonPoints };
})(globalThis);