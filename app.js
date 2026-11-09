const PARAMS = [
  { key: "CoreWidth", group: "core", min: 0.01, step: 0.1 },
  { key: "CoreHight", group: "core", min: 0.01, step: 0.1 },
  { key: "CoreLength", group: "core", min: 0.01, step: 0.1 },
  { key: "FrameWidth", group: "frame", min: 0.01, step: 0.1 },
  { key: "SheetThickness", group: "material", min: 0.01, step: 0.1 },
  { key: "ClearanceMillingCutterRadius", group: "clearances", min: 0, step: 0.1 },
  { key: "TubeExtSideWallLockHight", group: "protrusions", min: 0, step: 0.1 },
  { key: "TubeExtSideWallLockWidth", group: "protrusions", min: 0, step: 0.1 },
  { key: "TubeExtSideWallLockRadius", group: "protrusions", min: 0, step: 0.1 },
  { key: "TubeExtVerticalLockWidth", group: "protrusions", min: 0, step: 0.1 },
  { key: "TerminalSlotHeight", group: "terminals", min: 0, step: 0.1 },
  { key: "TerminalSlotWidth", group: "terminals", min: 0, step: 0.1 },
  { key: "TerminalSlotCount", group: "terminals", min: 0, step: 1 },
  { key: "TerminalSlotPitch", group: "terminals", min: 0.01, step: 0.1 },
  { key: "TerminalHoleDiameter", group: "terminals", min: 0.01, step: 0.1 },
  { key: "SideWallCornerHoleDiameter", group: "fasteners", min: 0.01, step: 0.1 },
  { key: "SideWallCornerHoleDistance", group: "fasteners", min: 0, step: 0.1 },
  { key: "SideWallCornerFilletRadius", group: "fasteners", min: 0, step: 0.1 },
];

const LEGACY_KEYS = {
  ClearanceMillingCutter: "ClearanceMillingCutterRadius",
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
let focusedParameterKey = null;
let hoveredParameterKey = null;
let lastChangedParameterKey = null;
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
  $("#export-dxf").textContent = t("header.export");
  $("#parameters-heading").textContent = t("params.heading");
  $("#reset").textContent = t("params.reset");
  $("#share-note").textContent = t("params.shareNote");
  $("#drawings-heading").textContent = t("drawings.heading");
  partTabs.setAttribute("aria-label", t("drawings.tabsLabel"));
  $("#lang-toggle").textContent = t("lang.toggle");
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
  if (values.TubeSlotWidth >= values.TubeLength || values.TubeSlotWidth <= 2 * values.ClearanceMillingCutterRadius) {
    errors.push({ keys: ["ClearanceMillingCutterRadius", "CoreLength"], text: t("error.slotVsCutter") });
  }
  if (values.ClearanceMillingCutterRadius + values.TubeExtSideWallLockRadius > values.TubeExtSideWallLockHight) {
    errors.push({ keys: ["TubeExtSideWallLockHight", "TubeExtSideWallLockRadius", "ClearanceMillingCutterRadius"], text: t("error.lockRadiusTooBig") });
  }
  if (3 * values.ClearanceMillingCutterRadius > values.TubeExtSideWallLockWidth) {
    errors.push({ keys: ["TubeExtSideWallLockWidth", "ClearanceMillingCutterRadius"], text: t("error.lockWidthTooSmall") });
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
    farthestBoltHole >= sideWallWidth / 2
  ) {
    errors.push({ keys: ["TerminalSlotCount", "TerminalSlotPitch"], text: t("error.rowsTooWide") });
  }
  let cornerHoleConflict = false;
  for (const xSign of [-1, 1]) {
    for (const ySign of [-1, 1]) {
      const x = xSign * cornerHoleX;
      const y = ySign * cornerHoleY;
      const openingDx = Math.max(Math.abs(x) - (values.TubeStackThickness / 2 + values.SheetThickness), 0);
      const openingDy = Math.max(Math.abs(y) - tubeH / 2, 0);
      if (Math.hypot(openingDx, openingDy) <= values.SideWallCornerHoleDiameter / 2) {
        cornerHoleConflict = true;
        break;
      }
      for (const yBoltSign of [-1, 1]) {
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
  return [
    BobbinPartTemplates.sidewall(values, formatDimension, strings),
    BobbinPartTemplates.horizontal(values, formatDimension, strings),
    BobbinPartTemplates.vertical(values, formatDimension, strings),
  ];
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

function renderDimension(svg, dimension, bounds) {
  const lineColor = "#1d6171";
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
    const arrowSize = 1.7;
    const px = -uy * arrowSize * 0.48;
    const py = ux * arrowSize * 0.48;
    const group = svgElement("g", dimensionAttributes);
    group.append(
      svgElement("line", { x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 0.35 }),
      svgElement("path", {
        d: `M ${start[0]} ${start[1]} L ${start[0] + ux * arrowSize + px} ${start[1] + uy * arrowSize + py} L ${start[0] + ux * arrowSize - px} ${start[1] + uy * arrowSize - py} Z`,
        fill: lineColor,
      }),
      svgElement("text", {
        x: end[0] + 1.5,
        y: end[1] - 1.5,
        fill: lineColor,
        "font-size": 3.5,
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
    const offset = dimension.internal ? 0 : (dimension.y < 0 ? 3 : -3);
    textPoint = [(start[0] + end[0]) / 2, y + offset];
  } else {
    start = screenPoint(dimension.x, dimension.from, bounds);
    end = screenPoint(dimension.x, dimension.to, bounds);
    const offset = dimension.internal ? 0 : 4;
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
  const arrowSize = dimension.arrowSize || 1.7;
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
        "stroke-width": 0.35,
      }),
      svgElement("line", {
        x1: end[0] + ux * arrowSize,
        y1: end[1] + uy * arrowSize,
        x2: end[0] + ux * extension.after,
        y2: end[1] + uy * extension.after,
        stroke: lineColor,
        "stroke-width": 0.35,
      }),
    );
  } else {
    group.append(
      svgElement("line", { x1: start[0], y1: start[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 0.35 }),
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
    }));
  }
  if (dimension.axis === "x") {
    const extensionY = dimension.extensionFromY ?? dimension.y + (dimension.extensionOffset ?? (dimension.internal ? 0 : (dimension.y < 0 ? 2 : -2)));
    const e1 = screenPoint(dimension.from, extensionY, bounds);
    const e2 = screenPoint(dimension.to, extensionY, bounds);
    group.append(
      svgElement("line", { x1: e1[0], y1: e1[1], x2: start[0], y2: start[1], stroke: lineColor, "stroke-width": 0.25 }),
      svgElement("line", { x1: e2[0], y1: e2[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 0.25 }),
    );
  } else {
    const e1 = screenPoint(dimension.extensionFromX1 ?? dimension.x + (dimension.internal ? 0 : -2), dimension.from, bounds);
    const e2 = screenPoint(dimension.extensionFromX2 ?? dimension.x + (dimension.internal ? 0 : -2), dimension.to, bounds);
    group.append(
      svgElement("line", { x1: e1[0], y1: e1[1], x2: start[0], y2: start[1], stroke: lineColor, "stroke-width": 0.25 }),
      svgElement("line", { x1: e2[0], y1: e2[1], x2: end[0], y2: end[1], stroke: lineColor, "stroke-width": 0.25 }),
    );
  }
  group.append(svgElement("text", {
    x: textPoint[0],
    y: textPoint[1],
    fill: lineColor,
    "font-size": 3.5,
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
  const b = geometry.viewBounds;
  const width = b.maxX - b.minX;
  const height = b.maxY - b.minY;
  const svg = svgElement("svg", {
    xmlns: SVG_NS,
    viewBox: `0 0 ${formatNumber(width)} ${formatNumber(height)}`,
    role: "img",
    "aria-label": t("drawing.ariaLabel", { title: model.title }),
    preserveAspectRatio: "xMidYMid meet",
  });
  svg.append(svgElement("rect", { x: 0, y: 0, width, height, fill: "#fff" }));
  const parts = svgElement("g", {
    fill: "#e9edf0",
    stroke: "#25394a",
    "stroke-width": 0.35,
    "stroke-linejoin": "round",
    "stroke-linecap": "round",
  });
  for (const [index, contour] of geometry.contours.entries()) {
    const path = pathFromPoints(contour.map(([x, y]) => screenPoint(x, y, b)));
    parts.append(svgElement("path", { d: path, fill: index === 0 ? "#e9edf0" : "#fff" }));
  }
  for (const circle of geometry.circles) {
    const [cx, cy] = screenPoint(circle.x, circle.y, b);
    parts.append(svgElement("circle", { cx, cy, r: circle.r, fill: "#fff" }));
  }
  svg.append(parts);
  for (const reference of geometry.referenceContours || []) {
    const path = pathFromPoints(reference.points.map(([x, y]) => screenPoint(x, y, b)));
    svg.append(svgElement("path", {
      d: path,
      fill: "none",
      stroke: reference.stroke,
      "stroke-width": 0.45,
      "stroke-dasharray": "2 1.2",
    }));
  }
  for (const dimension of model.dimensions) renderDimension(svg, dimension, b);
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
    header.append(title, quantity);
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
  $("#export-dxf").disabled = Boolean(errors.length);
  $("#export-dxf").setAttribute("aria-disabled", String(Boolean(errors.length)));
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

function addDxfPolyline(points, handle, ownerHandle) {
  const entries = [
    "0", "LWPOLYLINE", "5", handle, "330", ownerHandle,
    "100", "AcDbEntity", "8", "CUT",
    "100", "AcDbPolyline", "90", String(points.length), "70", "1",
  ];
  for (const [x, y] of points) entries.push("10", formatNumber(x), "20", formatNumber(y));
  return entries;
}

function generateDxf(models) {
  const gap = 8;
  const entities = [];
  let yOffset = 0;
  let drawingMaxX = 0;
  let drawingMaxY = 0;
  let nextHandle = 15;
  for (const model of models) {
    const { geometry } = model;
    const points = [...geometry.contours];
    for (const circle of geometry.circles) {
      points.push([
        [circle.x - circle.r, circle.y - circle.r],
        [circle.x + circle.r, circle.y + circle.r],
      ]);
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
      for (const contour of geometry.contours) {
        entities.push(addDxfPolyline(
          contour.map(([x, y]) => [x + dx, y + yOffset - minY]),
          (nextHandle++).toString(16).toUpperCase(),
          "9",
        ));
      }
      for (const circle of geometry.circles) {
        entities.push([
          "0", "CIRCLE", "5", (nextHandle++).toString(16).toUpperCase(), "330", "9",
          "100", "AcDbEntity", "8", "CUT",
          "100", "AcDbCircle",
          "10", formatNumber(circle.x + dx),
          "20", formatNumber(circle.y + yOffset - minY),
          "30", "0", "40", formatNumber(circle.r),
        ]);
      }
    }
    yOffset += rowHeight + gap;
  }
  const lines = [
    "0", "SECTION", "2", "HEADER",
    "9", "$ACADVER", "1", "AC1015",
    "9", "$INSUNITS", "70", "4",
    "9", "$MEASUREMENT", "70", "1",
    "9", "$CLAYER", "8", "CUT",
    "9", "$EXTMIN", "10", "0", "20", "0", "30", "0",
    "9", "$EXTMAX", "10", formatNumber(drawingMaxX), "20", formatNumber(drawingMaxY), "30", "0",
    "9", "$HANDSEED", "5", nextHandle.toString(16).toUpperCase(),
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
    "2", "CUT", "70", "0", "62", "7", "6", "CONTINUOUS",
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

function exportDxf() {
  const result = readValues();
  if (result.errors) {
    showValidation(result.errors);
    return;
  }
  const content = generateDxf(buildPartModels(result.values));
  const file = new Blob([content], { type: "application/dxf;charset=utf-8" });
  const fileUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = "bobbin-templates-mm.dxf";
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
$("#export-dxf").addEventListener("click", exportDxf);
update();
