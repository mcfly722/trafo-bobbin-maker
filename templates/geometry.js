(function (global) {
  function arcSegmentsForRadius(radius, sweep = Math.PI) {
    if (!(radius > 0)) return 1;
    const maxSagitta = Math.min(0.0015, radius / 4);
    const steps = Math.abs(sweep) / (2 * Math.acos(1 - maxSagitta / radius));
    return Math.max(1, Math.min(360, Math.ceil(steps)));
  }

  function inwardArchPoints(points, index, radius, segments) {
    const arcSegments = segments || arcSegmentsForRadius(radius);
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
    return Array.from({ length: arcSegments + 1 }, (_, step) => {
      const angle = Math.PI * step / arcSegments;
      return [
        center[0] - chord[0] * cornerRadius * Math.cos(angle) + inward[0] * cornerRadius * Math.sin(angle),
        center[1] - chord[1] * cornerRadius * Math.cos(angle) + inward[1] * cornerRadius * Math.sin(angle),
      ];
    });
  }

  function filletedPolygonPoints(points, cornerRadii, segments = 0) {
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
        const arcSegments = segments || arcSegmentsForRadius(cornerRadius, sweep);
        return Array.from({ length: arcSegments + 1 }, (_, step) => {
          const arcAngle = startAngle + (sweep * step) / arcSegments;
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
      const arcSegments = segments || arcSegmentsForRadius(cornerRadius, sweep);
      return Array.from({ length: arcSegments + 1 }, (_, step) => {
        const arcAngle = startAngle + (sweep * step) / arcSegments;
        return [center[0] + cornerRadius * Math.cos(arcAngle), center[1] + cornerRadius * Math.sin(arcAngle)];
      });
    });
  }
  function circleContourPoints(cx, cy, radius, segments = 0) {
    const arcSegments = segments || arcSegmentsForRadius(radius, 2 * Math.PI);
    return Array.from({ length: arcSegments }, (_, step) => {
      const angle = (2 * Math.PI * step) / arcSegments;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
  }

  function offsetContourPoints(sourcePoints, offset) {
    const points = [];
    for (const point of sourcePoints) {
      const last = points[points.length - 1];
      if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) > 1e-9) points.push(point);
    }
    while (points.length > 1 && Math.hypot(points[0][0] - points[points.length - 1][0], points[0][1] - points[points.length - 1][1]) <= 1e-9) points.pop();
    const count = points.length;
    if (count < 3 || !offset) return points.map((point) => [...point]);
    const doubledArea = points.reduce((sum, point, index) => {
      const next = points[(index + 1) % count];
      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0);
    if (!doubledArea) return points.map((point) => [...point]);
    const distance = offset * Math.sign(doubledArea);
    const vertices = points.map((vertex, index) => {
      const previous = points[(index + count - 1) % count];
      const next = points[(index + 1) % count];
      const incoming = [vertex[0] - previous[0], vertex[1] - previous[1]];
      const outgoing = [next[0] - vertex[0], next[1] - vertex[1]];
      const incomingLength = Math.hypot(...incoming);
      const outgoingLength = Math.hypot(...outgoing);
      if (!incomingLength || !outgoingLength) return null;
      const incomingUnit = [incoming[0] / incomingLength, incoming[1] / incomingLength];
      const outgoingUnit = [outgoing[0] / outgoingLength, outgoing[1] / outgoingLength];
      return {
        point: vertex,
        incomingUnit,
        outgoingUnit,
        incomingNormal: [incomingUnit[1], -incomingUnit[0]],
        outgoingNormal: [outgoingUnit[1], -outgoingUnit[0]],
        turnSine: incomingUnit[0] * outgoingUnit[1] - incomingUnit[1] * outgoingUnit[0],
      };
    });
    const direction = Math.sign(distance);
    const isPocket = (entry) => Boolean(entry) && entry.turnSine * direction < -0.01;
    const intersectOffsetLines = (a, b) => {
      const startA = [a.point[0] + distance * a.incomingNormal[0], a.point[1] + distance * a.incomingNormal[1]];
      const startB = [b.point[0] + distance * b.outgoingNormal[0], b.point[1] + distance * b.outgoingNormal[1]];
      const denominator = a.incomingUnit[0] * b.outgoingUnit[1] - a.incomingUnit[1] * b.outgoingUnit[0];
      if (Math.abs(denominator) < 1e-9) return null;
      const t = ((startB[0] - startA[0]) * b.outgoingUnit[1] - (startB[1] - startA[1]) * b.outgoingUnit[0]) / denominator;
      if (Math.abs(t) > 50 * Math.abs(distance)) return null;
      return [startA[0] + t * a.incomingUnit[0], startA[1] + t * a.incomingUnit[1]];
    };
    const miterPoint = (entry) => {
      const miter = intersectOffsetLines(entry, entry);
      if (miter) return miter;
      return [
        entry.point[0] + (distance * (entry.incomingNormal[0] + entry.outgoingNormal[0])) / 2,
        entry.point[1] + (distance * (entry.incomingNormal[1] + entry.outgoingNormal[1])) / 2,
      ];
    };
    let shift = 0;
    if (isPocket(vertices[0])) {
      for (let index = 1; index < count; index++) {
        if (!isPocket(vertices[index])) {
          shift = index;
          break;
        }
      }
    }
    const ring = [...vertices.slice(shift), ...vertices.slice(0, shift)];
    const result = [];
    let index = 0;
    while (index < count) {
      const entry = ring[index];
      if (!isPocket(entry)) {
        if (entry) result.push(miterPoint(entry));
        index++;
        continue;
      }
      let runEnd = index;
      while (
        runEnd + 1 < count && isPocket(ring[runEnd + 1]) &&
        Math.hypot(ring[runEnd + 1].point[0] - ring[runEnd].point[0], ring[runEnd + 1].point[1] - ring[runEnd].point[1]) <= 3 * Math.abs(distance)
      ) runEnd++;
      const incomingFoot = (entry) => [
        entry.point[0] + distance * entry.incomingNormal[0],
        entry.point[1] + distance * entry.incomingNormal[1],
      ];
      const outgoingFoot = (entry) => [
        entry.point[0] + distance * entry.outgoingNormal[0],
        entry.point[1] + distance * entry.outgoingNormal[1],
      ];
      if (runEnd === index) {
        const miter = intersectOffsetLines(entry, entry);
        const tip = incomingFoot(entry);
        if (miter && Math.hypot(miter[0] - tip[0], miter[1] - tip[1]) <= 10 * Math.abs(distance)) {
          result.push(miter, tip, miter);
        } else {
          result.push(miterPoint(entry));
        }
        index++;
        continue;
      }
      const tolerance = 0.25 * Math.abs(distance);
      const average = (pts) => [
        pts.reduce((sum, point) => sum + point[0], 0) / pts.length,
        pts.reduce((sum, point) => sum + point[1], 0) / pts.length,
      ];
      const tips = [];
      for (let k = index; k <= runEnd; k++) tips.push(incomingFoot(ring[k]), outgoingFoot(ring[k]));
      let tip = average(tips);
      let runStart = index;
      while (
        runStart - 1 >= 0 && ring[runStart - 1] && !isPocket(ring[runStart - 1]) &&
        Math.hypot(ring[runStart - 1].point[0] - ring[runStart].point[0], ring[runStart - 1].point[1] - ring[runStart].point[1]) <= 1.1 * Math.abs(distance) &&
        Math.hypot(outgoingFoot(ring[runStart - 1])[0] - tip[0], outgoingFoot(ring[runStart - 1])[1] - tip[1]) <= tolerance
      ) {
        runStart--;
        tips.push(outgoingFoot(ring[runStart]));
        tip = average(tips);
      }
      let wrappedCount = 0;
      let endEntry = ring[runEnd];
      for (;;) {
        let candidate = null;
        if (runEnd + 1 < count) {
          candidate = ring[runEnd + 1];
        } else if (wrappedCount < index && ring[wrappedCount]) {
          candidate = ring[wrappedCount];
        }
        if (!candidate || isPocket(candidate)) break;
        if (Math.hypot(candidate.point[0] - endEntry.point[0], candidate.point[1] - endEntry.point[1]) > 1.1 * Math.abs(distance)) break;
        const foot = incomingFoot(candidate);
        if (Math.hypot(foot[0] - tip[0], foot[1] - tip[1]) > tolerance) break;
        tips.push(foot);
        tip = average(tips);
        if (runEnd + 1 < count) runEnd++; else wrappedCount++;
        endEntry = candidate;
      }
      const collapsed = tips.every((point) => Math.hypot(point[0] - tip[0], point[1] - tip[1]) <= tolerance);
      const corner = collapsed ? intersectOffsetLines(ring[runStart], endEntry) : null;
      if (corner) {
        for (let k = runStart; k < index; k++) result.pop();
        result.push(corner, tip, corner);
        if (wrappedCount) result.splice(0, wrappedCount);
      } else {
        for (let k = index; k <= runEnd; k++) result.push(miterPoint(ring[k]));
      }
      index = runEnd + 1;
    }
    return result;
  }

  function splitContourWithTabs(points, tabPoints, tabWidth) {
    const contour = points.map((point) => [...point]);
    if (!(tabWidth > 0) || !tabPoints || !tabPoints.length || contour.length < 2) return [contour];
    const count = contour.length;
    const segmentLengths = [];
    let totalLength = 0;
    for (let index = 0; index < count; index++) {
      const a = contour[index];
      const b = contour[(index + 1) % count];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segmentLengths.push(length);
      totalLength += length;
    }
    if (!(totalLength > 0) || tabWidth >= totalLength) return [contour];
    const pointAt = (arcLength) => {
      let cursor = 0;
      for (let index = 0; index < count; index++) {
        const length = segmentLengths[index];
        if (arcLength <= cursor + length || index === count - 1) {
          const a = contour[index];
          const b = contour[(index + 1) % count];
          const t = length > 0 ? Math.min(Math.max((arcLength - cursor) / length, 0), 1) : 0;
          return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
        }
        cursor += length;
      }
      return [...contour[0]];
    };
    const halfWidth = tabWidth / 2;
    const gaps = [];
    for (const tabPoint of tabPoints) {
      let best = null;
      let cursor = 0;
      for (let index = 0; index < count; index++) {
        const a = contour[index];
        const b = contour[(index + 1) % count];
        const length = segmentLengths[index];
        if (length > 0) {
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const t = Math.min(Math.max(((tabPoint[0] - a[0]) * dx + (tabPoint[1] - a[1]) * dy) / (length * length), 0), 1);
          const distance = Math.hypot(tabPoint[0] - (a[0] + t * dx), tabPoint[1] - (a[1] + t * dy));
          if (!best || distance < best.distance) best = { distance, arcLength: cursor + t * length };
        }
        cursor += length;
      }
      if (best) gaps.push([best.arcLength - halfWidth, best.arcLength + halfWidth]);
    }
    if (!gaps.length) return [contour];
    const normalized = [];
    for (const [start, end] of gaps) {
      if (start < 0) {
        normalized.push([0, end], [start + totalLength, totalLength]);
      } else if (end > totalLength) {
        normalized.push([start, totalLength], [0, end - totalLength]);
      } else {
        normalized.push([start, end]);
      }
    }
    normalized.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const gap of normalized) {
      const last = merged[merged.length - 1];
      if (last && gap[0] <= last[1]) last[1] = Math.max(last[1], gap[1]);
      else merged.push([...gap]);
    }
    const kept = [];
    let cursor = 0;
    for (const [start, end] of merged) {
      if (start - cursor > 1e-9) kept.push([cursor, start]);
      cursor = Math.max(cursor, end);
    }
    if (totalLength - cursor > 1e-9) kept.push([cursor, totalLength]);
    const segments = kept.map(([start, end]) => {
      const segment = [pointAt(start)];
      let arcCursor = 0;
      for (let index = 0; index < count; index++) {
        arcCursor += segmentLengths[index];
        if (arcCursor > start && arcCursor < end) segment.push([...contour[(index + 1) % count]]);
      }
      segment.push(pointAt(end));
      return segment;
    });
    if (segments.length > 1 && kept[0][0] === 0 && kept[kept.length - 1][1] === totalLength) {
      const tail = segments.pop();
      segments[0] = [...tail, ...segments[0].slice(1)];
    }
    return segments;
  }

    global.BobbinGeometry = { arcSegmentsForRadius, inwardArchPoints, filletedPolygonPoints, circleContourPoints, offsetContourPoints, splitContourWithTabs };
})(globalThis);