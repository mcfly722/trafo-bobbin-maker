const PARAMS = [
  { key: "SheetThickness", group: "material", min: 0.01, step: 0.1 },
  { key: "ClearanceMillingCutterDiameter", group: "clearances", min: 0, step: 0.1 },
  { key: "HoldingTabWidth", group: "tabs", min: 0, step: 0.1 },
  { key: "CoreWidth", group: "core", min: 0.01, step: 0.1 },
  { key: "CoreHight", group: "core", min: 0.01, step: 0.1 },
  { key: "CoreLength", group: "core", min: 0.01, step: 0.1 },
  { key: "FrameWidth", group: "frame", min: 0.01, step: 0.1 },
  { key: "TubeExtSideWallLockHight", group: "protrusions", min: 0, step: 0.1 },
  { key: "TubeExtSideWallLockWidth", group: "protrusions", min: 0, step: 0.1 },
  { key: "TubeExtSideWallLockRadius", group: "protrusions", min: 0, step: 0.1 },
  { key: "TubeExtVerticalLockWidth", group: "protrusions", min: 0, step: 0.1 },
  { key: "TerminalSlotHeight", group: "terminals", min: 0, step: 0.1 },
  { key: "TerminalSlotWidth", group: "terminals", min: 0, step: 0.1 },
  { key: "TerminalSlotCount", group: "terminals", min: 0, step: 1 },
  { key: "TerminalSlotPitch", group: "terminals", min: 0.01, step: 0.1 },
  { key: "TerminalHoleDiameter", group: "terminals", min: 0, step: 0.1 },
  { key: "SideWallCornerHoleDiameter", group: "fasteners", min: 0, step: 0.1 },
  { key: "SideWallCornerHoleDistance", group: "fasteners", min: 0, step: 0.1 },
  { key: "SideWallCornerFilletRadius", group: "fasteners", min: 0, step: 0.1 },
];

const LEGACY_KEYS = {
  ClearanceMillingCutter: "ClearanceMillingCutterDiameter",
  SideWallExtWireTerm: "TerminalSlotHeight",
  WireSlotWidth: "TerminalSlotWidth",
  WireSlotCnt: "TerminalSlotCount",
  WireSlotDst: "TerminalSlotPitch",
  WireTermBoltD: "TerminalHoleDiameter",
  SideWallCornerHoleD: "SideWallCornerHoleDiameter",
  SideWallCornerHoleDst: "SideWallCornerHoleDistance",
  SideWallCornerFilletR: "SideWallCornerFilletRadius",
};

const LEGACY_KEYS_REVERSE_LOOKUP = Object.fromEntries(
  Object.entries(LEGACY_KEYS).map(([oldKey, newKey]) => [newKey, oldKey]),
);

const SVG_NS = "http://www.w3.org/2000/svg";
const $ = (selector) => document.querySelector(selector);
const form = $("#parameters-form");
const fields = $("#parameter-fields");
const partTabs = $("#part-tabs");
const drawingDetail = $("#drawing-detail");
let activePartKey = "sidewall";
let exportMode = "part";
let focusedParameterKey = null;
let hoveredParameterKey = null;
let lastChangedParameterKey = null;
const panOffsets = new Map();
let currentLang = new URLSearchParams(window.location.search).get("lang") === "ru" ? "ru" : "en";
let strings = BobbinI18n.locales[currentLang];

const t = (key, params) => BobbinI18n.format(strings[key], params);

function createField(parameter, container) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  const id = `param-${parameter.key}`;
  wrapper.innerHTML = `<label for="${id}"><span class="field-label"></span><span class="field-key"> · ${parameter.key}</span></label>
    <input id="${id}" name="${parameter.key}" type="number" min="${parameter.min}" step="${parameter.step}" value="${BobbinDefaults[parameter.key]}" inputmode="decimal" required aria-describedby="${id}-error">
    <p class="field-error" id="${id}-error" role="alert" hidden></p>`;
  container.append(wrapper);
  parameterFields.set(parameter.key, {
    label: wrapper.querySelector(".field-label"),
    error: wrapper.querySelector(".field-error"),
  });
}

const parameterFields = new Map();
const groupLegends = new Map();
const parameterGroupFields = new Map();
for (const parameter of PARAMS) {
  let groupFields = parameterGroupFields.get(parameter.group);
  if (!groupFields) {
    const group = document.createElement("fieldset");
    group.className = "parameter-group";
    const legend = document.createElement("legend");
    groupLegends.set(parameter.group, legend);
    groupFields = document.createElement("div");
    groupFields.className = "parameter-grid";
    group.append(legend, groupFields);
    fields.append(group);
    parameterGroupFields.set(parameter.group, groupFields);
  }
  createField(parameter, groupFields);
}

function applyLanguage() {
  document.documentElement.lang = currentLang;
  document.title = t("meta.title");
  $('meta[name="description"]').setAttribute("content", t("meta.description"));
  $("#site-title").textContent = t("header.title");
  $("#source-link").textContent = t("header.sourceLink");
  $("#export-dxf").options[0].textContent = t("header.export");
  $("#export-mode-toggle").textContent = t(exportMode === "part" ? "header.exportModeContour" : "header.exportModeToolpath");
  $("#parameters-heading").textContent = t("params.heading");
  $("#reset").textContent = t("params.reset");
  $("#share-note").textContent = t("params.shareNote");
  $("#drawings-heading").textContent = t("drawings.heading");
  partTabs.setAttribute("aria-label", t("drawings.tabsLabel"));
  $("#lang-toggle").textContent = t("lang.toggle");
  $("#validation-dialog-title").textContent = t("dialog.validationTitle");
  $("#validation-dialog-close").textContent = t("dialog.close");
  for (const [group, legend] of groupLegends) {
    legend.textContent = t(`group.${group}`);
  }
  for (const parameter of PARAMS) {
    parameterFields.get(parameter.key).label.textContent = t(`param.${parameter.key}`);
  }
}

function readValues() {
  const values = {};
  const errors = [];
  for (const parameter of PARAMS) {
    const input = form.elements.namedItem(parameter.key);
    const raw = input.value.trim();
    const value = Number(raw);
    input.setAttribute("aria-invalid", "false");
    if (raw === "" || !Number.isFinite(value) || value < parameter.min) {
      input.setAttribute("aria-invalid", "true");
      errors.push({ keys: [parameter.key], text: t("error.invalidNumber", { label: t(`param.${parameter.key}`), min: parameter.min }) });
    } else if (parameter.key === "TerminalSlotCount" && !Number.isInteger(value)) {
      input.setAttribute("aria-invalid", "true");
      errors.push({ keys: [parameter.key], text: t("error.integerSlotCount") });
    } else {
      values[parameter.key] = value;
    }
  }
  if (errors.length) return { errors };
  values.TubeRibbonWidth = values.CoreWidth;
  values.TubeStackThickness = values.CoreHight;
  values.TubeLength = values.CoreLength;
  values.TubeSlotWidth = Math.round((values.TubeLength / 3) * 100) / 100;
  if (values.TubeLength <= 0) {
    errors.push({ keys: ["CoreLength"], text: t("error.positiveCoreLength") });
  }
  if (values.TubeSlotWidth <= 0) {
    errors.push({ keys: ["CoreLength"], text: t("error.positiveSlotWidth") });
  }
  const sideWallWidth = values.TubeStackThickness + 2 * values.SheetThickness + 2 * values.FrameWidth;
  if (values.TubeSlotWidth >= values.TubeLength || values.TubeSlotWidth <= values.ClearanceMillingCutterDiameter) {
    errors.push({ keys: ["ClearanceMillingCutterDiameter", "CoreLength"], text: t("error.slotVsCutter") });
  }
  if (values.ClearanceMillingCutterDiameter / 2 + values.TubeExtSideWallLockRadius > values.TubeExtSideWallLockHight) {
    errors.push({ keys: ["TubeExtSideWallLockHight", "TubeExtSideWallLockRadius", "ClearanceMillingCutterDiameter"], text: t("error.lockRadiusTooBig") });
  }
  if (3 * (values.ClearanceMillingCutterDiameter / 2) > values.TubeExtSideWallLockWidth) {
    errors.push({ keys: ["TubeExtSideWallLockWidth", "ClearanceMillingCutterDiameter"], text: t("error.lockWidthTooSmall") });
  }
  if (values.TerminalHoleDiameter > 0 && values.TerminalHoleDiameter < values.ClearanceMillingCutterDiameter) {
    errors.push({ keys: ["TerminalHoleDiameter", "ClearanceMillingCutterDiameter"], text: t("error.holeDiameterVsCutter") });
  }
  if (values.SideWallCornerHoleDiameter > 0 && values.SideWallCornerHoleDiameter < values.ClearanceMillingCutterDiameter) {
    errors.push({ keys: ["SideWallCornerHoleDiameter", "ClearanceMillingCutterDiameter"], text: t("error.holeDiameterVsCutter") });
  }
  if (values.TerminalSlotWidth > 0 && values.TerminalSlotWidth < values.ClearanceMillingCutterDiameter) {
    errors.push({ keys: ["TerminalSlotWidth", "ClearanceMillingCutterDiameter"], text: t("error.slotWidthVsCutter") });
  }
  if (values.TerminalHoleDiameter > values.TerminalSlotHeight) {
    errors.push({ keys: ["TerminalHoleDiameter", "TerminalSlotHeight"], text: t("error.holeDiameterVsSlotHeight") });
  }
  if (values.TerminalSlotWidth > values.TerminalSlotPitch) {
    errors.push({ keys: ["TerminalSlotWidth", "TerminalSlotPitch"], text: t("error.slotWidthVsPitch") });
  }
  const tubeH = values.TubeRibbonWidth + 2 * values.SheetThickness;
  const sideWallHeight = tubeH + 2 * values.FrameWidth;
  const slotStart = tubeH / 2 + values.FrameWidth;
  const wireSlotHalfSpan = Math.max(values.TerminalSlotCount - 2, 0) * values.TerminalSlotPitch / 2;
  const farthestBoltHole = (values.TerminalSlotCount - 1) * values.TerminalSlotPitch / 2 + values.TerminalHoleDiameter / 2;
  const outerCornerX = sideWallWidth / 2 - Math.min(values.SideWallCornerFilletRadius, values.TerminalSlotHeight / 2);
  const outerHalfHeight = sideWallHeight / 2 + values.TerminalSlotHeight;
  const cornerHoleX = sideWallWidth / 2 - values.SideWallCornerHoleDistance;
  const cornerHoleY = outerHalfHeight - values.SideWallCornerHoleDistance;
  if (values.TerminalSlotWidth > 0 && slotStart >= sideWallHeight / 2 + values.TerminalSlotHeight) {
    errors.push({ keys: ["TerminalSlotHeight"], text: t("error.slotsDontReachEdge") });
  }
  if (
    (values.TerminalSlotWidth > 0 && values.TerminalSlotCount >= 2 && (
      wireSlotHalfSpan + values.TerminalSlotWidth / 2 >= outerCornerX ||
      wireSlotHalfSpan + values.TerminalSlotWidth / 2 >= sideWallHeight / 2 + values.TerminalSlotHeight
    )) ||
    (values.TerminalHoleDiameter > 0 && farthestBoltHole >= sideWallWidth / 2)
  ) {
    errors.push({ keys: ["TerminalSlotCount", "TerminalSlotPitch"], text: t("error.rowsTooWide") });
  }
  let cornerHoleConflict = false;
  for (const xSign of values.SideWallCornerHoleDiameter > 0 ? [-1, 1] : []) {
    for (const ySign of [-1, 1]) {
      const x = xSign * cornerHoleX;
      const y = ySign * cornerHoleY;
      const openingDx = Math.max(Math.abs(x) - (values.TubeStackThickness / 2 + values.SheetThickness), 0);
      const openingDy = Math.max(Math.abs(y) - tubeH / 2, 0);
      if (Math.hypot(openingDx, openingDy) <= values.SideWallCornerHoleDiameter / 2) {
        cornerHoleConflict = true;
        break;
      }
      for (const yBoltSign of values.TerminalHoleDiameter > 0 ? [-1, 1] : []) {
        for (let i = 0; i < values.TerminalSlotCount; i++) {
          const boltX = (i - (values.TerminalSlotCount - 1) / 2) * values.TerminalSlotPitch;
          const boltY = yBoltSign * (sideWallHeight / 2 + values.TerminalHoleDiameter / 2);
          if (Math.hypot(x - boltX, y - boltY) < (values.SideWallCornerHoleDiameter + values.TerminalHoleDiameter) / 2) {
            cornerHoleConflict = true;
            break;
          }
        }
        if (cornerHoleConflict) break;
      }
      if (cornerHoleConflict) break;
    }
    if (cornerHoleConflict) break;
  }
  if (cornerHoleConflict) {
    errors.push({ keys: ["SideWallCornerHoleDistance", "SideWallCornerHoleDiameter"], text: t("error.cornerHoleConflict") });
  }
  return errors.length ? { errors } : { values };
}

function formatNumber(number) {
  return Number(number.toFixed(3)).toString();
}

function formatDimension(number) {
  return Number(number.toFixed(2)).toString();
}

function updateAddress(values) {
  const url = new URL(window.location.href);
  url.searchParams.delete("UnevenThicknessComp");
  url.searchParams.delete("CoreWindowWidth");
  url.searchParams.delete("ClearanceCore2SideWall");
  url.searchParams.delete("ClearanceRibbonWidth");
  url.searchParams.delete("ClearanceStackThickness");
  url.searchParams.delete("FrameWidthHorizontal");
  url.searchParams.delete("FrameWidthVertical");
  url.searchParams.delete("WireSlotTubeDst");
  url.searchParams.delete("WireTermBoltDst");
  url.searchParams.delete("TubeExtSideWallLock");
  url.searchParams.delete("ClearanceCore2Box");
  url.searchParams.delete("SideWallThicknessExtra");
  url.searchParams.delete("RRibHeight");
  url.searchParams.delete("RRibWidth");
  for (const legacyKey of Object.keys(LEGACY_KEYS)) {
    url.searchParams.delete(legacyKey);
  }
  for (const parameter of PARAMS) {
    if (values[parameter.key] === BobbinDefaults[parameter.key]) {
      url.searchParams.delete(parameter.key);
    } else {
      url.searchParams.set(parameter.key, formatNumber(values[parameter.key]));
    }
  }
  if (currentLang === "en") {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", currentLang);
  }
  window.history.replaceState(null, "", url);
}

function loadAddressParameters() {
  const search = new URLSearchParams(window.location.search);
  const legacyFrameWidth = search.get("FrameWidthHorizontal")
    ?? search.get("FrameWidthVertical")
    ?? search.get("CoreWindowWidth");
  const legacyTubeExt = search.get("TubeExtSideWallLock");
  for (const parameter of PARAMS) {
    const legacyFallback = parameter.key === "FrameWidth"
      ? legacyFrameWidth
      : parameter.key === "TubeExtSideWallLockHight"
        ? legacyTubeExt
        : search.get(LEGACY_KEYS_REVERSE_LOOKUP[parameter.key] ?? "\0");
    if (!search.has(parameter.key) && legacyFallback === null) continue;
    const input = form.elements.namedItem(parameter.key);
    input.value = search.get(parameter.key) ?? legacyFallback;
  }
}

function pathFromPoints(points, close = true) {
  if (!points.length) return "";
  return `M ${points.map(([x, y]) => `${formatNumber(x)} ${formatNumber(y)}`).join(" L ")}${close ? " Z" : ""}`;
}

function buildPartModels(values) {
  const models = [
    BobbinPartTemplates.sidewall(values, formatDimension, strings),
    BobbinPartTemplates.horizontal(values, formatDimension, strings),
    BobbinPartTemplates.vertical(values, formatDimension, strings),
  ];
  const cutterRadius = values.ClearanceMillingCutterDiameter / 2;
  if (cutterRadius > 0) {
    for (const model of models) {
      const toolpaths = [];
      model.geometry.contours.forEach((contour, index) => {
        const toolpath = BobbinGeometry.offsetContourPoints(contour, index === 0 ? cutterRadius : -cutterRadius);
        const tabPoints = (model.geometry.tabs || [])
          .filter((tab) => tab.contour === index)
          .map((tab) => [tab.x, tab.y]);
        if (values.HoldingTabWidth > 0 && tabPoints.length) {
          const tabGapWidth = values.HoldingTabWidth + values.ClearanceMillingCutterDiameter;
          for (const segment of BobbinGeometry.splitContourWithTabs(toolpath, tabPoints, tabGapWidth)) {
            toolpaths.push({ points: segment, closed: false });
          }
        } else {
          toolpaths.push({ points: toolpath, closed: true });
        }
      });
      for (const circle of model.geometry.circles) {
        const pathRadius = circle.r - cutterRadius;
        if (pathRadius > 0) toolpaths.push({ points: BobbinGeometry.circleContourPoints(circle.x, circle.y, pathRadius), closed: true });
      }
      model.geometry.toolpaths = toolpaths;
    }
  }
  return models;
}

function svgElement(name, attrs = {}, text = "") {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  if (text) element.textContent = text;
  return element;
}

function screenPoint(x, y, bounds) {
  return [x - bounds.minX, bounds.maxY - y];
}

function renderDimension(svg, dimension, bounds, unit = 1, contours = []) {
  const lineColor = "#1d6171";
  const EPSILON = 1e-6;
  const edgeCrossingX = (y) => {
    const crossingsAt = (scanY) => {
      const xs = [];
      for (const contour of contours) {
        for (let i = 0; i < contour.length; i++) {
          const [x1, y1] = contour[i];
          const [x2, y2] = contour[(i + 1) % contour.length];
          if (y1 === y2) continue;
          if ((y1 < scanY && y2 >= scanY) || (y2 < scanY && y1 >= scanY)) {
            xs.push(x1 + ((scanY - y1) * (x2 - x1)) / (y2 - y1));
          }
        }
      }
      return xs;
    };
    let xs = crossingsAt(y);
    if (!xs.length) xs = [...crossingsAt(y - EPSILON), ...crossingsAt(y + EPSILON)];
    if (!xs.length) return null;
    return dimension.x >= 0 ? Math.max(...xs) : Math.min(...xs);
  };
  const edgeCrossingY = (x) => {
    const crossingsAt = (scanX) => {
      const ys = [];
      for (const contour of contours) {
        for (let i = 0; i < contour.length; i++) {
          const [x1, y1] = contour[i];
          const [x2, y2] = contour[(i + 1) % contour.length];
          if (x1 === x2) continue;
          if ((x1 < scanX && x2 >= scanX) || (x2 < scanX && x1 >= scanX)) {
            ys.push(y1 + ((scanX - x1) * (y2 - y1)) / (x2 - x1));
          }
        }
      }
      return ys;
    };
    let ys = crossingsAt(x);
    if (!ys.length) ys = [...crossingsAt(x - EPSILON), ...crossingsAt(x + EPSILON)];
    if (!ys.length) return null;
    return dimension.y >= 0 ? Math.max(...ys) : Math.min(...ys);
  };
  const dimensionAttributes = {
    class: "dimension",
    "data-parameter-keys": (dimension.parameterKeys || []).join(" "),
    "data-primary-parameter-keys": (dimension.primaryParameterKeys || []).join(" "),
  };
  if (dimension.leader) {
    const start = screenPoint(...dimension.leader.from, bounds);
    const end = screenPoint(...dimension.leader.to, bounds);
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const arrowSize = 1.7 * unit;
    const px = -uy * arrowSize * 0.48;
    const py = ux * arrowSize * 0.48;
    const group = svgElement("g", dimensionAttributes);
    group.append(
      svgElement("line", { x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 1, "vector-effect": "non-scaling-stroke" }),
      svgElement("path", {
        d: `M ${start[0]} ${start[1]} L ${start[0] + ux * arrowSize + px} ${start[1] + uy * arrowSize + py} L ${start[0] + ux * arrowSize - px} ${start[1] + uy * arrowSize - py} Z`,
        fill: lineColor,
      }),
      svgElement("text", {
        x: end[0] + 1.5 * unit,
        y: end[1] - 1.5 * unit,
        fill: lineColor,
        "font-size": 3.5 * unit,
        "font-family": "Arial, sans-serif",
        "text-anchor": "start",
        "dominant-baseline": "central",
      }, dimension.label),
    );
    svg.append(group);
    return;
  }
  let start;
  let end;
  let textPoint;
  if (dimension.axis === "x") {
    const y = bounds.maxY - dimension.y;
    start = screenPoint(dimension.from, dimension.y, bounds);
    end = screenPoint(dimension.to, dimension.y, bounds);
    const offset = dimension.internal ? 0 : (dimension.y < 0 ? 3 : -3) * unit;
    textPoint = [(start[0] + end[0]) / 2, y + offset];
  } else {
    start = screenPoint(dimension.x, dimension.from, bounds);
    end = screenPoint(dimension.x, dimension.to, bounds);
    const offset = dimension.internal ? 0 : 4 * unit;
    textPoint = [start[0] + offset, (start[1] + end[1]) / 2];
  }
  if (dimension.labelBefore) textPoint = [start[0] - dimension.labelBefore, textPoint[1]];
  if (dimension.labelAtMidpoint) textPoint[0] = (start[0] + end[0]) / 2;
  textPoint[0] += dimension.labelDx || 0;
  textPoint[1] += dimension.labelDy || 0;
  const group = svgElement("g", {
    ...dimensionAttributes,
    class: dimension.internal ? "dimension internal-dimension" : "dimension",
  });
  const arrowSize = (dimension.arrowSize || 1.7) * unit;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  if (dimension.splitArrowLine) {
    const extension = dimension.splitArrowLine;
    group.append(
      svgElement("line", {
        x1: start[0] - ux * extension.before,
        y1: start[1] - uy * extension.before,
        x2: start[0] - ux * arrowSize,
        y2: start[1] - uy * arrowSize,
        stroke: lineColor,
        "stroke-width": 1,
        "vector-effect": "non-scaling-stroke",
      }),
      svgElement("line", {
        x1: end[0] + ux * arrowSize,
        y1: end[1] + uy * arrowSize,
        x2: end[0] + ux * extension.after,
        y2: end[1] + uy * extension.after,
        stroke: lineColor,
        "stroke-width": 1,
        "vector-effect": "non-scaling-stroke",
      }),
    );
  } else {
    group.append(
      svgElement("line", { x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 1, "vector-effect": "non-scaling-stroke" }),
    );
  }
  const arrows = dimension.arrowOutside
    ? [[start, -1], [end, 1]]
    : [[start, 1], [end, -1]];
  for (const [point, direction] of arrows) {
    const bx = point[0] + ux * arrowSize * direction;
    const by = point[1] + uy * arrowSize * direction;
    const px = -uy * arrowSize * 0.48;
    const py = ux * arrowSize * 0.48;
    group.append(svgElement("path", {
      d: `M ${point[0]} ${point[1]} L ${bx + px} ${by + py} L ${bx - px} ${by - py} Z`,
      fill: lineColor,
      "vector-effect": "non-scaling-stroke",
    }));
  }
  if (dimension.axis === "x") {
    const fallbackY = dimension.y + (dimension.internal ? 0 : (dimension.y < 0 ? 2 : -2) * unit);
    const extensionStartY = (x, explicitY) => {
      if (explicitY != null) return explicitY;
      if (dimension.extensionFromY != null) return dimension.extensionFromY;
      if (dimension.extensionOffset != null) return dimension.y + dimension.extensionOffset;
      return dimension.internal ? dimension.y : edgeCrossingY(x) ?? fallbackY;
    };
    const e1 = screenPoint(dimension.from, extensionStartY(dimension.from, dimension.extensionFromY1), bounds);
    const e2 = screenPoint(dimension.to, extensionStartY(dimension.to, dimension.extensionFromY2), bounds);
    group.append(
      svgElement("line", { x1: e1[0], y1: e1[1], x2: start[0], y2: start[1], stroke: lineColor, "stroke-width": 0.75, "vector-effect": "non-scaling-stroke" }),
      svgElement("line", { x1: e2[0], y1: e2[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 0.75, "vector-effect": "non-scaling-stroke" }),
    );
  } else {
    const fallbackX = dimension.x + (dimension.internal ? 0 : -2 * unit);
    const extensionStartX = (y) => {
      if (dimension.internal) return dimension.x;
      return edgeCrossingX(y) ?? fallbackX;
    };
    const e1 = screenPoint(dimension.extensionFromX1 ?? extensionStartX(dimension.from), dimension.from, bounds);
    const e2 = screenPoint(dimension.extensionFromX2 ?? extensionStartX(dimension.to), dimension.to, bounds);
    group.append(
      svgElement("line", { x1: e1[0], y1: e1[1], x2: start[0], y2: start[1], stroke: lineColor, "stroke-width": 0.75, "vector-effect": "non-scaling-stroke" }),
      svgElement("line", { x1: e2[0], y1: e2[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 0.75, "vector-effect": "non-scaling-stroke" }),
    );
  }
  group.append(svgElement("text", {
    x: textPoint[0],
    y: textPoint[1],
    fill: lineColor,
    "font-size": 3.5 * unit,
    "font-family": "Arial, sans-serif",
    "text-anchor": "middle",
    "dominant-baseline": "central",
    transform: dimension.axis === "y" ? `rotate(-90 ${textPoint[0]} ${textPoint[1]})` : "",
    class: dimension.axis === "y" ? "vertical-dimension-label" : "",
  }, dimension.label));
  svg.append(group);
}

function updateDimensionHighlights() {
  const activeParameterKey = hoveredParameterKey || focusedParameterKey;
  for (const dimension of drawingDetail.querySelectorAll(".dimension[data-parameter-keys]")) {
    const parameterKeys = dimension.getAttribute("data-parameter-keys").split(" ");
    const primaryParameterKeys = dimension.getAttribute("data-primary-parameter-keys").split(" ");
    const isAffected = Boolean(activeParameterKey && parameterKeys.includes(activeParameterKey));
    dimension.classList.toggle("is-highlighted", isAffected && primaryParameterKeys.includes(activeParameterKey));
    dimension.classList.toggle("is-dependent", isAffected && !primaryParameterKeys.includes(activeParameterKey));
  }
}

function parameterKeyFromTarget(target) {
  return target instanceof Element && target.closest("#parameter-fields")
    ? target.closest("input[name]")?.name || null
    : null;
}

fields.addEventListener("focusin", (event) => {
  focusedParameterKey = parameterKeyFromTarget(event.target);
  updateDimensionHighlights();
});
fields.addEventListener("focusout", (event) => {
  focusedParameterKey = parameterKeyFromTarget(event.relatedTarget);
  updateDimensionHighlights();
});
fields.addEventListener("pointerover", (event) => {
  hoveredParameterKey = parameterKeyFromTarget(event.target);
  updateDimensionHighlights();
});
fields.addEventListener("pointerout", (event) => {
  hoveredParameterKey = parameterKeyFromTarget(event.relatedTarget);
  updateDimensionHighlights();
});

function renderPartSvg(model) {
  const { geometry } = model;
  const toolpathSelected = exportMode === "toolpath" && Boolean(geometry.toolpaths);
  const partContourColor = toolpathSelected ? "#25394a" : "#d32f2f";
  const toolpathColor = toolpathSelected ? "#d32f2f" : "#1565c0";
  const b = geometry.viewBounds;
  const width = b.maxX - b.minX;
  const height = b.maxY - b.minY;
  const formatViewBox = (view) => `${formatNumber(view.x)} ${formatNumber(view.y)} ${formatNumber(width / view.z)} ${formatNumber(height / view.z)}`;
  const pan = panOffsets.get(model.key) || { x: 0, y: 0, z: 1 };
  const unit = 1 / pan.z;
  const svg = svgElement("svg", {
    xmlns: SVG_NS,
    viewBox: formatViewBox(pan),
    role: "img",
    "aria-label": t("drawing.ariaLabel", { title: model.title }),
    preserveAspectRatio: "xMidYMid meet",
  });
  svg.append(svgElement("rect", { x: 0, y: 0, width, height, fill: "#fff" }));
  const parts = svgElement("g", {
    fill: "#e9edf0",
    stroke: partContourColor,
    "stroke-width": 1.5,
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
  });
  for (const [index, contour] of geometry.contours.entries()) {
    const path = pathFromPoints(contour.map(([x, y]) => screenPoint(x, y, b)));
    parts.append(svgElement("path", { d: path, fill: index === 0 ? "#e9edf0" : "#fff", "vector-effect": "non-scaling-stroke" }));
  }
  for (const circle of geometry.circles) {
    const [cx, cy] = screenPoint(circle.x, circle.y, b);
    parts.append(svgElement("circle", { cx, cy, r: circle.r, fill: "#fff", "vector-effect": "non-scaling-stroke" }));
  }
  svg.append(parts);
  for (const reference of geometry.referenceContours || []) {
    const path = pathFromPoints(reference.points.map(([x, y]) => screenPoint(x, y, b)));
    svg.append(svgElement("path", {
      d: path,
      fill: "none",
      stroke: reference.stroke,
      "stroke-width": 1,
      "vector-effect": "non-scaling-stroke",
      "stroke-dasharray": `${formatNumber(2 * unit)} ${formatNumber(1.2 * unit)}`,
    }));
  }
  for (const toolpath of geometry.toolpaths || []) {
    const path = pathFromPoints(toolpath.points.map(([x, y]) => screenPoint(x, y, b)), toolpath.closed);
    svg.append(svgElement("path", {
      d: path,
      fill: "none",
      stroke: toolpathColor,
      "stroke-width": 1,
      "vector-effect": "non-scaling-stroke",
    }));
  }
  for (const dimension of model.dimensions) renderDimension(svg, dimension, b, unit, geometry.contours);
  let dragState = null;
  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const current = panOffsets.get(model.key) || { x: 0, y: 0, z: 1 };
    dragState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: current.x, panY: current.y, zoom: current.z };
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("is-dragging");
    event.preventDefault();
  });
  svg.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const rect = svg.getBoundingClientRect();
    const scale = Math.max(width / dragState.zoom / rect.width, height / dragState.zoom / rect.height);
    const next = {
      x: dragState.panX - (event.clientX - dragState.startX) * scale,
      y: dragState.panY - (event.clientY - dragState.startY) * scale,
      z: dragState.zoom,
    };
    panOffsets.set(model.key, next);
    svg.setAttribute("viewBox", formatViewBox(next));
  });
  const endDrag = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState = null;
    svg.classList.remove("is-dragging");
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  let zoomRenderTimer = null;
  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    const current = panOffsets.get(model.key) || { x: 0, y: 0, z: 1 };
    const z = Math.min(Math.max(current.z * (event.deltaY < 0 ? 1.2 : 1 / 1.2), 0.5), 25);
    if (z === current.z) return;
    const rect = svg.getBoundingClientRect();
    const viewMetrics = (zoom) => {
      const viewWidth = width / zoom;
      const viewHeight = height / zoom;
      const scale = Math.min(rect.width / viewWidth, rect.height / viewHeight);
      return { scale, marginX: (rect.width - viewWidth * scale) / 2, marginY: (rect.height - viewHeight * scale) / 2 };
    };
    const before = viewMetrics(current.z);
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const anchorX = current.x + (pointerX - before.marginX) / before.scale;
    const anchorY = current.y + (pointerY - before.marginY) / before.scale;
    const after = viewMetrics(z);
    const next = {
      x: anchorX - (pointerX - after.marginX) / after.scale,
      y: anchorY - (pointerY - after.marginY) / after.scale,
      z,
    };
    panOffsets.set(model.key, next);
    svg.setAttribute("viewBox", formatViewBox(next));
    clearTimeout(zoomRenderTimer);
    zoomRenderTimer = setTimeout(() => {
      if (svg.isConnected) svg.replaceWith(renderPartSvg(model));
    }, 120);
  }, { passive: false });
  return svg;
}

function renderModels(values) {
  const models = buildPartModels(values);
  partTabs.replaceChildren();
  drawingDetail.replaceChildren();
  if (!models.some((model) => model.key === activePartKey)) activePartKey = models[0].key;
  for (const model of models) {
    const selected = model.key === activePartKey;
    const button = document.createElement("button");
    button.className = "part-tab";
    button.id = `tab-${model.key}`;
    button.type = "button";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(selected));
    button.setAttribute("aria-controls", `panel-${model.key}`);
    button.tabIndex = selected ? 0 : -1;
    button.textContent = model.title;
    button.addEventListener("click", () => {
      activePartKey = model.key;
      renderModels(values);
      $(`#tab-${model.key}`).focus();
    });
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = models.findIndex((entry) => entry.key === model.key);
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? models.length - 1
          : (currentIndex + (event.key === "ArrowRight" ? 1 : models.length - 1)) % models.length;
      activePartKey = models[nextIndex].key;
      renderModels(values);
      $(`#tab-${activePartKey}`).focus();
    });
    partTabs.append(button);

    const card = document.createElement("article");
    card.className = "drawing-card";
    card.id = `panel-${model.key}`;
    card.setAttribute("role", "tabpanel");
    card.setAttribute("aria-labelledby", `tab-${model.key}`);
    card.hidden = !selected;
    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = model.title;
    const quantity = document.createElement("span");
    quantity.className = "quantity";
    quantity.textContent = model.subtitle;
    const centerButton = document.createElement("button");
    centerButton.className = "icon-button center-button";
    centerButton.type = "button";
    centerButton.title = t("drawing.centerView");
    centerButton.setAttribute("aria-label", t("drawing.centerView"));
    centerButton.innerHTML = `<svg viewBox="0 0 16 16" width="14" height="14" style="width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round" aria-hidden="true">
      <line x1="8" y1="1" x2="8" y2="15"/>
      <line x1="1" y1="8" x2="15" y2="8"/>
      <circle cx="8" cy="8" r="2.4"/>
    </svg>`;
    centerButton.addEventListener("click", () => {
      panOffsets.delete(model.key);
      renderModels(values);
    });
    const zoomButton = document.createElement("button");
    zoomButton.className = "icon-button zoom-button";
    zoomButton.type = "button";
    zoomButton.title = t("drawing.resetZoom");
    zoomButton.setAttribute("aria-label", t("drawing.resetZoom"));
    zoomButton.textContent = "100%";
    zoomButton.addEventListener("click", () => {
      const bounds = model.geometry.viewBounds;
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const view = panOffsets.get(model.key) || { x: 0, y: 0, z: 1 };
      panOffsets.set(model.key, { x: view.x + (width / view.z - width) / 2, y: view.y + (height / view.z - height) / 2, z: 1 });
      renderModels(values);
    });
    const headerActions = document.createElement("span");
    headerActions.className = "drawing-card-actions";
    headerActions.append(quantity, zoomButton, centerButton);
    header.append(title, headerActions);
    const figure = document.createElement("div");
    figure.className = "drawing-figure";
    figure.append(renderPartSvg(model));
    card.append(header, figure);
    drawingDetail.append(card);
  }
  updateDimensionHighlights();
}

function showValidation(errors) {
  for (const field of parameterFields.values()) {
    field.error.hidden = true;
    field.error.textContent = "";
  }
  const messagesByKey = new Map();
  for (const error of errors) {
    const anchorKey = error.keys.includes(lastChangedParameterKey) ? lastChangedParameterKey : error.keys[0];
    messagesByKey.set(anchorKey, [...(messagesByKey.get(anchorKey) || []), error.text]);
  }
  for (const [key, messages] of messagesByKey) {
    const field = parameterFields.get(key);
    if (!field) continue;
    field.error.textContent = messages.join(" ");
    field.error.hidden = false;
  }
}

function update() {
  const result = readValues();
  if (result.errors) {
    showValidation(result.errors);
    return;
  }
  showValidation([]);
  renderModels(result.values);
  updateAddress(result.values);
}

function cleanPolylinePoints(points) {
  const clean = points.filter(([x, y], index) => {
    if (index === 0) return true;
    const [px, py] = points[index - 1];
    return formatNumber(x) !== formatNumber(px) || formatNumber(y) !== formatNumber(py);
  });
  if (clean.length > 1) {
    const [fx, fy] = clean[0];
    const [lx, ly] = clean[clean.length - 1];
    if (formatNumber(fx) === formatNumber(lx) && formatNumber(fy) === formatNumber(ly)) clean.pop();
  }
  return clean;
}

function addDxfPolyline(points, ownerHandle, nextHandle, closed = true) {
  const clean = cleanPolylinePoints(points);
  const entries = [
    "0", "POLYLINE", "5", nextHandle(), "330", ownerHandle,
    "100", "AcDbEntity", "8", "CUT", "370", "0",
    "100", "AcDb2dPolyline", "66", "1", "70", closed ? "1" : "0",
    "10", "0", "20", "0", "30", "0",
  ];
  for (const [x, y] of clean) {
    entries.push(
      "0", "VERTEX", "5", nextHandle(), "330", ownerHandle,
      "100", "AcDbEntity", "8", "CUT", "370", "0",
      "100", "AcDbVertex", "100", "AcDb2dVertex",
      "10", formatNumber(x), "20", formatNumber(y), "30", "0",
    );
  }
  entries.push(
    "0", "SEQEND", "5", nextHandle(), "330", ownerHandle,
    "100", "AcDbEntity", "8", "CUT",
  );
  return entries;
}

function addDxfPolylineR12(points, closed = true) {
  const clean = cleanPolylinePoints(points);
  const entries = [
    "0", "POLYLINE", "8", "CUT", "66", "1", "70", closed ? "1" : "0", "40", "0", "41", "0",
    "10", "0", "20", "0", "30", "0",
  ];
  for (const [x, y] of clean) {
    entries.push(
      "0", "VERTEX", "8", "CUT",
      "10", formatNumber(x), "20", formatNumber(y), "30", "0",
    );
  }
  entries.push("0", "SEQEND", "8", "CUT");
  return entries;
}

function generateDxf(models, version) {
  const gap = 8;
  const entities = [];
  let yOffset = 0;
  let drawingMaxX = 0;
  let drawingMaxY = 0;
  let nextHandleValue = 15;
  const nextHandle = () => (nextHandleValue++).toString(16).toUpperCase();
  const isR12 = version === "AC1009";
  for (const model of models) {
    const { geometry } = model;
    const useToolpaths = exportMode === "toolpath" && Boolean(geometry.toolpaths);
    const exportContours = useToolpaths
      ? geometry.toolpaths
      : geometry.contours.map((contour) => ({ points: contour, closed: true }));
    const points = exportContours.map((contour) => contour.points);
    if (!useToolpaths) {
      for (const circle of geometry.circles) {
        points.push([
          [circle.x - circle.r, circle.y - circle.r],
          [circle.x + circle.r, circle.y + circle.r],
        ]);
      }
    }
    const xs = points.flatMap((contour) => contour.map(([x]) => x));
    const ys = points.flatMap((contour) => contour.map(([, y]) => y));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const shiftX = -minX;
    const rowHeight = maxY - minY;
    for (let copy = 0; copy < 2; copy++) {
      const dx = shiftX + copy * (maxX - minX + gap);
      drawingMaxX = Math.max(drawingMaxX, maxX + dx);
      drawingMaxY = Math.max(drawingMaxY, maxY + yOffset - minY);
      for (const contour of exportContours) {
        const points = contour.points.map(([x, y]) => [x + dx, y + yOffset - minY]);
        entities.push(isR12 ? addDxfPolylineR12(points, contour.closed) : addDxfPolyline(points, "9", nextHandle, contour.closed));
      }
      if (!useToolpaths) {
        for (const circle of geometry.circles) {
          entities.push(isR12 ? [
            "0", "CIRCLE", "8", "CUT",
            "10", formatNumber(circle.x + dx),
            "20", formatNumber(circle.y + yOffset - minY),
            "30", "0", "40", formatNumber(circle.r),
          ] : [
            "0", "CIRCLE", "5", nextHandle(), "330", "9",
            "100", "AcDbEntity", "8", "CUT", "370", "0",
            "100", "AcDbCircle",
            "10", formatNumber(circle.x + dx),
            "20", formatNumber(circle.y + yOffset - minY),
            "30", "0", "40", formatNumber(circle.r),
          ]);
        }
      }
    }
    yOffset += rowHeight + gap;
  }
  if (isR12) {
    const lines = [
      "0", "SECTION", "2", "HEADER",
      "9", "$ACADVER", "1", "AC1009",
      "9", "$MEASUREMENT", "70", "1",
      "9", "$EXTMIN", "10", "0", "20", "0", "30", "0",
      "9", "$EXTMAX", "10", formatNumber(drawingMaxX), "20", formatNumber(drawingMaxY), "30", "0",
      "0", "ENDSEC",
      "0", "SECTION", "2", "TABLES",
      "0", "TABLE", "2", "LTYPE", "70", "1",
      "0", "LTYPE", "2", "CONTINUOUS", "70", "0", "3", "Solid line", "72", "65", "73", "0", "40", "0",
      "0", "ENDTAB",
      "0", "TABLE", "2", "LAYER", "70", "2",
      "0", "LAYER", "2", "0", "70", "0", "62", "7", "6", "CONTINUOUS",
      "0", "LAYER", "2", "CUT", "70", "0", "62", "7", "6", "CONTINUOUS",
      "0", "ENDTAB", "0", "ENDSEC",
      "0", "SECTION", "2", "ENTITIES",
      ...entities.flat(),
      "0", "ENDSEC", "0", "EOF",
    ];
    return `${lines.join("\r\n")}\r\n`;
  }
  const lines = [
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1015",
    "9", "$INSUNITS", "70", "4",
    "9", "$MEASUREMENT", "70", "1",
    "9", "$CLAYER", "8", "CUT",
    "9", "$EXTMIN", "10", "0", "20", "0", "30", "0",
    "9", "$EXTMAX", "10", formatNumber(drawingMaxX), "20", formatNumber(drawingMaxY), "30", "0",
    "9", "$HANDSEED", "5", nextHandleValue.toString(16).toUpperCase(),
    "0", "ENDSEC",
    "0", "SECTION", "2", "TABLES",
    "0", "TABLE", "2", "LTYPE", "5", "1", "100", "AcDbSymbolTable", "70", "3",
    "0", "LTYPE", "5", "2", "330", "1", "100", "AcDbSymbolTableRecord", "100", "AcDbLinetypeTableRecord",
    "2", "BYBLOCK", "70", "0", "3", "", "72", "65", "73", "0", "40", "0",
    "0", "LTYPE", "5", "3", "330", "1", "100", "AcDbSymbolTableRecord", "100", "AcDbLinetypeTableRecord",
    "2", "BYLAYER", "70", "0", "3", "", "72", "65", "73", "0", "40", "0",
    "0", "LTYPE", "5", "4", "330", "1", "100", "AcDbSymbolTableRecord", "100", "AcDbLinetypeTableRecord",
    "2", "CONTINUOUS", "70", "0", "3", "Solid line", "72", "65", "73", "0", "40", "0",
    "0", "ENDTAB",
    "0", "TABLE", "2", "LAYER", "5", "5", "100", "AcDbSymbolTable", "70", "2",
    "0", "LAYER", "5", "6", "330", "5", "100", "AcDbSymbolTableRecord", "100", "AcDbLayerTableRecord",
    "2", "0", "70", "0", "62", "7", "6", "CONTINUOUS",
    "0", "LAYER", "5", "7", "330", "5", "100", "AcDbSymbolTableRecord", "100", "AcDbLayerTableRecord",
    "2", "CUT", "70", "0", "62", "7", "6", "CONTINUOUS", "370", "0",
    "0", "ENDTAB",
    "0", "TABLE", "2", "BLOCK_RECORD", "5", "8", "100", "AcDbSymbolTable", "70", "2",
    "0", "BLOCK_RECORD", "5", "9", "330", "8", "100", "AcDbSymbolTableRecord", "100", "AcDbBlockTableRecord",
    "2", "*Model_Space", "70", "0", "280", "1", "281", "1",
    "0", "BLOCK_RECORD", "5", "A", "330", "8", "100", "AcDbSymbolTableRecord", "100", "AcDbBlockTableRecord",
    "2", "*Paper_Space", "70", "0", "280", "1", "281", "1",
    "0", "ENDTAB", "0", "ENDSEC",
    "0", "SECTION", "2", "BLOCKS",
    "0", "BLOCK", "5", "B", "330", "9", "100", "AcDbEntity", "8", "0",
    "100", "AcDbBlockBegin", "2", "*Model_Space", "70", "0", "10", "0", "20", "0", "30", "0", "3", "*Model_Space", "1", "",
    "0", "ENDBLK", "5", "C", "330", "9", "100", "AcDbEntity", "8", "0", "100", "AcDbBlockEnd",
    "0", "BLOCK", "5", "D", "330", "A", "100", "AcDbEntity", "8", "0",
    "100", "AcDbBlockBegin", "2", "*Paper_Space", "70", "0", "10", "0", "20", "0", "30", "0", "3", "*Paper_Space", "1", "",
    "0", "ENDBLK", "5", "E", "330", "A", "100", "AcDbEntity", "8", "0", "100", "AcDbBlockEnd",
    "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES",
    ...entities.flat(),
    "0", "ENDSEC", "0", "EOF",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

function showValidationDialog(errors) {
  const list = $("#validation-dialog-errors");
  list.replaceChildren();
  for (const error of errors) {
    const item = document.createElement("li");
    item.textContent = error.text;
    list.append(item);
  }
  $("#validation-dialog").showModal();
}

function exportDxf(version) {
  const result = readValues();
  if (result.errors) {
    showValidation(result.errors);
    showValidationDialog(result.errors);
    return;
  }
  const content = generateDxf(buildPartModels(result.values), version);
  const file = new Blob([content], { type: "application/dxf;charset=utf-8" });
  const fileUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = `bobbin-templates-mm-${version.toLowerCase()}.dxf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
}

applyLanguage();
loadAddressParameters();
form.addEventListener("input", (event) => {
  lastChangedParameterKey = event.target.name || null;
  update();
});
$("#reset").addEventListener("click", () => {
  for (const parameter of PARAMS) form.elements.namedItem(parameter.key).value = BobbinDefaults[parameter.key];
  update();
});
$("#lang-toggle").addEventListener("click", () => {
  currentLang = currentLang === "ru" ? "en" : "ru";
  strings = BobbinI18n.locales[currentLang];
  applyLanguage();
  const url = new URL(window.location.href);
  if (currentLang === "en") {
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", currentLang);
  }
  window.history.replaceState(null, "", url);
  update();
});
$("#export-mode-toggle").addEventListener("click", () => {
  exportMode = exportMode === "part" ? "toolpath" : "part";
  $("#export-mode-toggle").setAttribute("aria-pressed", String(exportMode === "toolpath"));
  applyLanguage();
  update();
});
$("#export-dxf").addEventListener("change", (event) => {
  const select = event.target;
  if (!select.value) return;
  exportDxf(select.value);
  select.value = "";
});
update();
