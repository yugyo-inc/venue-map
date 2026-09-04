(function () {
  const USER_HASH = "410768e9d2f9e65ebde6b9cf8e26a4f4a3d5f5bcad5d7b00668a8dc1ce151696";
  const PASS_HASH = "decb5495b9f3024b48a1e7ada7d2a9cd994fce9c2011efda46dba3727413a0d7";
  const AUTH_KEY = "colive-fukuoka:venue-map-auth:v2";
  const DRAFT_KEY = "colive-fukuoka:venue-map-draft:v2";
  const CUSTOM_ITEMS_KEY = "colive-fukuoka:venue-map-custom-items:v2";
  const ORDER_KEY = "colive-fukuoka:venue-map-order:v2";
  const PUBLISHED_KEY = "colive-fukuoka:venue-map-published:v2";
  const VIEWS = ["guest", "staff"];
  const DATES = ["sep30", "oct1", "oct2"];
  const EDITABLE_FIELDS = ["label", "detail", "kind"];
  const data = window.VENUE_MAP_DATA;
  const body = document.body;
  const loginGate = document.getElementById("login-gate");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const editorApp = document.getElementById("editor-app");
  const toast = document.getElementById("toast");
  const tabs = Array.from(document.querySelectorAll("[data-date]"));
  const viewButtons = Array.from(document.querySelectorAll("[data-view-switch]"));
  const pinLayer = document.getElementById("pin-layer");
  const routeHalo = document.getElementById("route-halo");
  const routePath = document.getElementById("route-path");
  const destinationList = document.getElementById("destination-list");
  const mapTitle = document.getElementById("map-title");
  const mapSubtitle = document.getElementById("map-subtitle");
  const dateStamp = document.getElementById("date-stamp");
  const notice = document.getElementById("notice-text");
  const zoomStatus = document.getElementById("zoom-status");
  const stage = document.getElementById("map-stage");
  const frame = document.getElementById("map-frame");
  const editToggle = document.getElementById("edit-toggle");
  const flipLabel = document.getElementById("flip-label");
  const deleteItem = document.getElementById("delete-item");
  const editItemButton = document.getElementById("edit-item");
  const restoreItems = document.getElementById("restore-items");
  const confirmDialog = document.getElementById("confirm-dialog");
  const confirmTitle = document.getElementById("confirm-title");
  const confirmText = document.getElementById("confirm-text");
  const confirmScope = document.getElementById("confirm-scope");
  const confirmAccept = document.getElementById("confirm-accept");
  const itemDialogTitle = document.getElementById("item-dialog-title");
  const itemScopeField = document.getElementById("item-scope-field");
  const itemSubmit = document.getElementById("item-submit");
  const itemStep = document.getElementById("item-step");
  const editorSelection = document.getElementById("editor-selection");
  const editorCoordinates = document.getElementById("editor-coordinates");
  const audienceTitle = document.getElementById("audience-title");
  const saveIndicator = document.getElementById("save-indicator");
  const publishDialog = document.getElementById("publish-dialog");
  const addItemDialog = document.getElementById("add-item-dialog");
  const addItemForm = document.getElementById("add-item-form");
  const addItemContext = document.getElementById("add-item-context");
  let view = body.dataset.view || "guest";
  let activeDate = body.dataset.defaultDate || "sep30";
  let editing = true;
  let selectedKey = "";
  let zoom = 1;
  let overrides = loadDraft();
  let customItems = loadCustomItems();
  let orderOverrides = loadOrder();
  let itemDialogMode = "add";
  let editingKey = "";
  let pendingConfirm = null;
  let arrangeFrame = 0;
  let toastTimer = 0;
  let failedAttempts = 0;
  let lockedUntil = 0;

  const esc = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const selectorKey = (value) => window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  const rectFrom = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });
  const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  async function hashText(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function showEditor() {
    loginGate.hidden = true;
    editorApp.hidden = false;
    body.classList.add("is-editor", "is-editing");
    setView(view);
    setDate(activeDate);
    window.requestAnimationFrame(scheduleArrange);
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (Date.now() < lockedUntil) {
      loginError.textContent = "Too many attempts. Wait 30 seconds and try again.";
      return;
    }
    const submit = loginForm.querySelector("button[type=submit]");
    submit.disabled = true;
    loginError.textContent = "Checking access…";
    const id = document.getElementById("login-id").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const [idHash, passHash] = await Promise.all([hashText(id), hashText(password)]);
    submit.disabled = false;
    if (idHash === USER_HASH && passHash === PASS_HASH) {
      failedAttempts = 0;
      window.sessionStorage.setItem(AUTH_KEY, "allowed");
      loginForm.reset();
      loginError.textContent = "";
      showEditor();
      return;
    }
    failedAttempts += 1;
    if (failedAttempts >= 5) {
      lockedUntil = Date.now() + 30000;
      failedAttempts = 0;
      loginError.textContent = "Too many attempts. Wait 30 seconds and try again.";
    } else {
      loginError.textContent = "ID or password is incorrect.";
    }
  });

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function loadDraft() {
    try {
      return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function loadCustomItems() {
    try {
      return JSON.parse(window.localStorage.getItem(CUSTOM_ITEMS_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function loadOrder() {
    try {
      return JSON.parse(window.localStorage.getItem(ORDER_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function persistDraft(message = "Draft saved") {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(overrides));
      window.localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(customItems));
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(orderOverrides));
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      saveIndicator.textContent = `${message} · ${now}`;
      saveIndicator.classList.add("is-saved");
      return true;
    } catch (error) {
      saveIndicator.textContent = "Browser storage unavailable · download before closing";
      saveIndicator.classList.remove("is-saved");
      return false;
    }
  }

  function markDirty() {
    saveIndicator.textContent = "Saving draft…";
    saveIndicator.classList.remove("is-saved");
  }

  function currentPage() {
    return data[view][activeDate];
  }

  function customScope(viewName = view, dateName = activeDate, create = false) {
    if (create) {
      customItems[viewName] ||= {};
      customItems[viewName][dateName] ||= [];
    }
    return customItems[viewName]?.[dateName] || [];
  }

  function overrideScope(viewName = view, dateName = activeDate, create = false) {
    if (create) {
      overrides[viewName] ||= {};
      overrides[viewName][dateName] ||= {};
    }
    return overrides[viewName]?.[dateName] || {};
  }

  function orderScope(viewName = view, dateName = activeDate) {
    return orderOverrides[viewName]?.[dateName] || [];
  }

  function setOrderScope(viewName, dateName, keys) {
    orderOverrides[viewName] ||= {};
    orderOverrides[viewName][dateName] = keys;
  }

  function basePins(viewName = view, dateName = activeDate) {
    return [...data[viewName][dateName].pins, ...customScope(viewName, dateName)];
  }

  function applyContentOverride(pin, adjustment) {
    const merged = { ...pin };
    let edited = false;
    EDITABLE_FIELDS.forEach((field) => {
      if (typeof adjustment[field] !== "string") return;
      if (adjustment[field] !== (pin[field] ?? "")) edited = true;
      merged[field] = adjustment[field];
    });
    if (typeof adjustment.tbc === "boolean") {
      if (adjustment.tbc !== Boolean(pin.tbc)) edited = true;
      if (adjustment.tbc) merged.tbc = true;
      else delete merged.tbc;
    }
    if (Number.isFinite(adjustment.x)) merged.x = adjustment.x;
    if (Number.isFinite(adjustment.y)) merged.y = adjustment.y;
    if (adjustment.side) merged.side = adjustment.side;
    if (edited && !pin.custom) merged.edited = true;
    if (adjustment.deleted) merged.deleted = true;
    return merged;
  }

  function effectivePins(viewName = view, dateName = activeDate) {
    const scope = overrideScope(viewName, dateName);
    const pins = basePins(viewName, dateName)
      .map((pin) => applyContentOverride(pin, scope[pin.key] || {}))
      .filter((pin) => !pin.deleted);
    const order = orderScope(viewName, dateName);
    if (!order.length) return pins;
    const rank = new Map(order.map((key, index) => [key, index]));
    const ranked = pins.filter((pin) => rank.has(pin.key)).sort((a, b) => rank.get(a.key) - rank.get(b.key));
    const unranked = pins.filter((pin) => !rank.has(pin.key));
    return [...ranked, ...unranked];
  }

  function removedBasePins(viewName = view, dateName = activeDate) {
    const scope = overrideScope(viewName, dateName);
    return data[viewName][dateName].pins.filter((pin) => scope[pin.key]?.deleted);
  }

  function currentPins() {
    return effectivePins();
  }

  function getPin(key) {
    return currentPins().find((pin) => pin.key === key);
  }

  function effectiveRoute(viewName = view, dateName = activeDate) {
    const original = data[viewName][dateName];
    const scope = overrideScope(viewName, dateName);
    const points = [];
    original.route.forEach((point) => {
      const linkedPin = original.pins.find((pin) => !pin.listOnly && pin.x === point[0] && pin.y === point[1]);
      if (!linkedPin) {
        points.push(point);
        return;
      }
      const adjustment = scope[linkedPin.key] || {};
      if (adjustment.deleted) return;
      points.push([Number.isFinite(adjustment.x) ? adjustment.x : linkedPin.x, Number.isFinite(adjustment.y) ? adjustment.y : linkedPin.y]);
    });
    return points;
  }

  function resolvedPin(pin, viewName = view, dateName = activeDate) {
    const adjustment = overrideScope(viewName, dateName)[pin.key] || {};
    return {
      x: Number.isFinite(adjustment.x) ? adjustment.x : pin.x,
      y: Number.isFinite(adjustment.y) ? adjustment.y : pin.y,
      side: adjustment.side || pin.side || "right"
    };
  }

  function setPinOverride(key, patch, save = true) {
    const scope = overrideScope(view, activeDate, true);
    scope[key] = { ...(scope[key] || {}), ...patch };
    markDirty();
    if (save) persistDraft();
  }

  function pathFrom(points) {
    return points.map((point, index) => `${index ? "L" : "M"} ${point[0]} ${point[1]}`).join(" ");
  }

  function renderRoute() {
    const route = pathFrom(effectiveRoute());
    routeHalo.setAttribute("d", route);
    routePath.setAttribute("d", route);
  }

  function scheduleArrange() {
    window.cancelAnimationFrame(arrangeFrame);
    arrangeFrame = window.requestAnimationFrame(autoArrangeLabels);
  }

  function autoArrangeLabels() {
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    if (!stageWidth || !stageHeight) return;
    const pinElements = Array.from(pinLayer.querySelectorAll(".map-pin"));
    const obstacles = pinElements.map((element) => rectFrom(element.offsetLeft - 20, element.offsetTop - 42, 40, 48));
    const entries = pinElements.map((element) => {
      const label = element.querySelector(".pin-label");
      return { element, label, leader: element.querySelector(".label-leader"), x: element.offsetLeft, y: element.offsetTop, width: label.offsetWidth, height: label.offsetHeight, preferred: element.dataset.side || "right" };
    }).filter((entry) => entry.width && entry.height).sort((a, b) => b.width * b.height - a.width * a.height);
    const placed = [];

    entries.forEach((entry) => {
      const { x, y, width, height, preferred } = entry;
      const candidates = [];
      ["right", "left"].forEach((side) => {
        [-100, -60, -24, 12, 52, 92].forEach((shift) => candidates.push({ side, left: side === "right" ? x + 20 : x - width - 20, top: y - height / 2 + shift }));
      });
      [-90, -45, 0, 45, 90].forEach((shift) => {
        candidates.push({ side: "top", left: x - width / 2 + shift, top: y - height - 24 });
        candidates.push({ side: "bottom", left: x - width / 2 + shift, top: y + 18 });
      });
      let best = null;
      candidates.forEach((candidate) => {
        const rect = rectFrom(candidate.left, candidate.top, width, height);
        const overflow = Math.max(0, -rect.left) + Math.max(0, -rect.top) + Math.max(0, rect.right - stageWidth) + Math.max(0, rect.bottom - stageHeight);
        const labelCollision = placed.reduce((sum, other) => sum + overlapArea(rect, other), 0);
        const pinCollision = obstacles.reduce((sum, obstacle) => sum + overlapArea(rect, obstacle), 0);
        const sidePenalty = candidate.side === preferred ? 0 : candidate.side === (preferred === "left" ? "right" : "left") ? 900 : 460;
        const distance = Math.hypot(rect.left + width / 2 - x, rect.top + height / 2 - y);
        const score = overflow * 25000 + labelCollision * 180 + pinCollision * 240 + sidePenalty + distance;
        if (!best || score < best.score) best = { ...candidate, score };
      });
      const left = clamp(best.left, 6, Math.max(6, stageWidth - width - 6));
      const top = clamp(best.top, 6, Math.max(6, stageHeight - height - 6));
      const rect = rectFrom(left, top, width, height);
      placed.push(rect);
      entry.label.style.setProperty("--label-x", `${left - x}px`);
      entry.label.style.setProperty("--label-y", `${top - y}px`);
      const endX = clamp(x, rect.left, rect.right) - x;
      const endY = clamp(y, rect.top, rect.bottom) - y;
      entry.leader.style.setProperty("--leader-length", `${Math.max(10, Math.hypot(endX, endY))}px`);
      entry.leader.style.setProperty("--leader-angle", `${Math.atan2(endY, endX) * 180 / Math.PI}deg`);
    });
  }

  function updateEditorSelection(message = "") {
    const pin = getPin(selectedKey);
    const canAdjust = Boolean(pin && !pin.listOnly);
    flipLabel.disabled = !canAdjust;
    deleteItem.disabled = !pin;
    editItemButton.disabled = !pin;
    restoreItems.disabled = removedBasePins().length === 0;
    if (message) editorSelection.textContent = message;
    else if (pin) editorSelection.textContent = pin.label;
    else editorSelection.textContent = editing ? "Select an item to drag, edit, reorder or delete it." : "Position editing is paused.";
    if (canAdjust) {
      const position = resolvedPin(pin);
      editorCoordinates.textContent = `x ${Math.round(position.x)} · y ${Math.round(position.y)} · preference ${position.side}`;
    } else editorCoordinates.textContent = "No pin selected";
  }

  function selectDestination(key) {
    selectedKey = key;
    document.querySelectorAll("[data-key]").forEach((item) => item.classList.toggle("is-active", item.dataset.key === key));
    destinationList.querySelector(`[data-key="${selectorKey(key)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    updateEditorSelection();
  }

  function positionPinElement(key) {
    const pin = getPin(key);
    const element = pinLayer.querySelector(`[data-key="${selectorKey(key)}"]`);
    if (!pin || !element) return;
    const position = resolvedPin(pin);
    element.style.left = `${position.x / data.meta.width * 100}%`;
    element.style.top = `${position.y / data.meta.height * 100}%`;
    element.dataset.side = position.side;
    renderRoute();
    scheduleArrange();
    updateEditorSelection();
  }

  function coordinatesFromPointer(event) {
    const bounds = stage.getBoundingClientRect();
    return {
      x: Math.round(clamp((event.clientX - bounds.left) / bounds.width, 0, 1) * data.meta.width),
      y: Math.round(clamp((event.clientY - bounds.top) / bounds.height, 0, 1) * data.meta.height)
    };
  }

  function bindPinEvents() {
    pinLayer.querySelectorAll(".map-pin").forEach((pinElement) => {
      pinElement.addEventListener("click", () => selectDestination(pinElement.dataset.key));
      pinElement.addEventListener("pointerdown", (event) => {
        if (!editing) return;
        event.preventDefault();
        const key = pinElement.dataset.key;
        selectDestination(key);
        pinElement.classList.add("is-dragging");
        pinElement.setPointerCapture(event.pointerId);
        const move = (moveEvent) => {
          setPinOverride(key, coordinatesFromPointer(moveEvent), false);
          positionPinElement(key);
        };
        const end = (endEvent) => {
          pinElement.classList.remove("is-dragging");
          if (pinElement.hasPointerCapture(endEvent.pointerId)) pinElement.releasePointerCapture(endEvent.pointerId);
          pinElement.removeEventListener("pointermove", move);
          pinElement.removeEventListener("pointerup", end);
          pinElement.removeEventListener("pointercancel", end);
          persistDraft();
          updateEditorSelection("Position saved. Labels were re-arranged automatically.");
        };
        pinElement.addEventListener("pointermove", move);
        pinElement.addEventListener("pointerup", end);
        pinElement.addEventListener("pointercancel", end);
      });
    });
  }

  function render() {
    const page = currentPage();
    mapTitle.textContent = page.title;
    mapSubtitle.textContent = page.subtitle;
    dateStamp.textContent = page.date;
    notice.textContent = page.notice;
    renderRoute();
    const pagePins = currentPins();
    const mapPins = pagePins.filter((pin) => !pin.listOnly);
    const numbers = new Map(mapPins.map((pin, index) => [pin.key, index + 1]));
    pinLayer.innerHTML = mapPins.map((pin) => {
      const position = resolvedPin(pin);
      return `<button class="map-pin pin-${esc(pin.kind)} ${pin.tbc ? "is-tbc" : ""} ${pin.key === selectedKey ? "is-active" : ""}" style="left:${position.x / data.meta.width * 100}%;top:${position.y / data.meta.height * 100}%" data-key="${esc(pin.key)}" data-side="${esc(position.side)}" aria-label="${esc(pin.label)}. ${esc(pin.detail)}">
        <span class="label-leader" aria-hidden="true"></span><span class="pin-dot"><span>${numbers.get(pin.key)}</span></span><span class="pin-label"><strong>${esc(pin.label)}</strong><small>${esc(pin.detail)}</small></span>
      </button>`;
    }).join("");
    destinationList.innerHTML = pagePins.map((pin, index) => {
      const chip = pin.custom ? '<span class="custom-chip">ADDED</span>' : pin.edited ? '<span class="edited-chip">EDITED</span>' : pin.tbc ? '<span class="tbc-chip">TBC</span>' : "";
      return `<li class="destination-row"><button class="destination-card ${pin.tbc ? "is-tbc" : ""} ${pin.key === selectedKey ? "is-active" : ""}" data-key="${esc(pin.key)}"><span class="destination-index">${pin.listOnly ? "—" : numbers.get(pin.key)}</span><span><strong>${esc(pin.label)}</strong><small>${esc(pin.detail)}</small></span>${chip}</button>
        <div class="item-tools" data-item="${esc(pin.key)}">
          <div class="item-tools-row"><button class="item-tool" type="button" data-act="up" title="Move up" aria-label="Move ${esc(pin.label)} up" ${index === 0 ? "disabled" : ""}>▲</button><button class="item-tool" type="button" data-act="down" title="Move down" aria-label="Move ${esc(pin.label)} down" ${index === pagePins.length - 1 ? "disabled" : ""}>▼</button></div>
          <div class="item-tools-row"><button class="item-tool is-edit" type="button" data-act="edit" title="Edit item" aria-label="Edit ${esc(pin.label)}">EDIT</button><button class="item-tool is-delete" type="button" data-act="delete" title="Delete item" aria-label="Delete ${esc(pin.label)}">✕</button></div>
        </div></li>`;
    }).join("");
    bindPinEvents();
    destinationList.querySelectorAll(".destination-card").forEach((card) => card.addEventListener("click", () => selectDestination(card.dataset.key)));
    destinationList.querySelectorAll(".item-tools [data-act]").forEach((button) => button.addEventListener("click", () => {
      const key = button.closest(".item-tools").dataset.item;
      const action = button.dataset.act;
      if (action === "up") moveItem(key, -1);
      else if (action === "down") moveItem(key, 1);
      else if (action === "edit") openEditItemDialog(key);
      else if (action === "delete") requestDeleteItem(key);
    }));
    updateEditorSelection();
    scheduleArrange();
  }

  function setDate(nextDate) {
    activeDate = nextDate;
    selectedKey = "";
    tabs.forEach((tab) => {
      const selected = tab.dataset.date === activeDate;
      tab.classList.toggle("is-selected", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });
    render();
  }

  function setView(nextView) {
    view = nextView;
    body.dataset.view = view;
    selectedKey = "";
    viewButtons.forEach((button) => {
      const selected = button.dataset.viewSwitch === view;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    audienceTitle.textContent = view === "staff" ? "STAFF MAP" : "GUEST MAP";
    render();
  }

  function setZoom(nextZoom) {
    zoom = clamp(nextZoom, 1, 2);
    stage.style.width = `${zoom * 100}%`;
    zoomStatus.textContent = `${Math.round(zoom * 100)}%`;
    if (zoom === 1) frame.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    scheduleArrange();
  }

  function setEditing(nextEditing) {
    editing = nextEditing;
    body.classList.toggle("is-editing", editing);
    editToggle.textContent = editing ? "Finish adjusting" : "Start adjusting";
    updateEditorSelection();
  }

  function flipSelectedLabel() {
    const pin = getPin(selectedKey);
    if (!pin || pin.listOnly) return;
    const position = resolvedPin(pin);
    setPinOverride(selectedKey, { side: position.side === "left" ? "right" : "left" });
    positionPinElement(selectedKey);
    showToast("Label preference changed. Collision avoidance remains active.");
  }

  function resetCurrentDate() {
    askConfirm({
      title: "RESET THIS DATE",
      text: `Reset all saved ${currentPage().date} ${view === "staff" ? "Staff" : "Guest"} adjustments? Positions, edits, order changes, removed items and added items for this date will return to the original data.`,
      accept: "Reset date",
      onAccept: () => {
        if (overrides[view]) delete overrides[view][activeDate];
        if (customItems[view]) delete customItems[view][activeDate];
        if (orderOverrides[view]) delete orderOverrides[view][activeDate];
        persistDraft("Date reset");
        selectedKey = "";
        render();
        showToast("Date reset to the original data.");
      }
    });
  }

  function askConfirm({ title, text, accept = "Confirm", scopeOptions = null, onAccept }) {
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmAccept.textContent = accept;
    confirmScope.hidden = !scopeOptions;
    if (scopeOptions) {
      confirmScope.innerHTML = scopeOptions.map((option, index) => `<label class="dialog-radio"><input type="radio" name="confirm-scope" value="${esc(option.value)}" ${index === 0 ? "checked" : ""}> ${esc(option.label)}</label>`).join("");
    } else confirmScope.innerHTML = "";
    pendingConfirm = onAccept;
    confirmDialog.showModal();
  }

  function confirmScopeValue() {
    return confirmScope.querySelector("input:checked")?.value || "";
  }

  function setItemDialogMode(mode) {
    itemDialogMode = mode;
    const isEdit = mode === "edit";
    itemDialogTitle.textContent = isEdit ? "EDIT MAP ITEM" : "ADD MAP ITEM";
    itemSubmit.textContent = isEdit ? "Save changes" : "Add item";
    itemScopeField.hidden = isEdit;
    itemStep.textContent = isEdit
      ? "Changes apply to this map and date. Position is kept; drag the pin if it needs to move."
      : "The new pin appears near the centre of the map. Drag it to the exact venue position; its callout will reflow automatically.";
  }

  function openAddItemDialog() {
    addItemForm.reset();
    editingKey = "";
    setItemDialogMode("add");
    addItemContext.textContent = `Adding to ${view === "staff" ? "Staff Map" : "Guest Map"} · ${currentPage().date}. Choose a wider scope below if the same item applies elsewhere.`;
    addItemDialog.showModal();
    window.setTimeout(() => document.getElementById("item-name").focus(), 0);
  }

  function openEditItemDialog(key) {
    const pin = getPin(key);
    if (!pin) return;
    selectDestination(key);
    addItemForm.reset();
    editingKey = key;
    setItemDialogMode("edit");
    addItemForm.elements.label.value = pin.label || "";
    addItemForm.elements.detail.value = pin.detail || "";
    addItemForm.elements.kind.value = pin.kind || "service";
    addItemForm.elements.tbc.checked = Boolean(pin.tbc);
    addItemContext.textContent = `Editing “${pin.label}” on ${view === "staff" ? "Staff Map" : "Guest Map"} · ${currentPage().date}.${pin.custom ? "" : " The original data stays untouched; use Reset this date to undo."}`;
    addItemDialog.showModal();
    window.setTimeout(() => document.getElementById("item-name").focus(), 0);
  }

  function saveItemEdit(formData) {
    const pin = getPin(editingKey);
    if (!pin) return;
    const label = String(formData.get("label") || "").trim();
    if (!label) return;
    const detail = String(formData.get("detail") || "").trim() || "Location detail to be confirmed";
    const kind = String(formData.get("kind") || pin.kind || "service");
    const tbc = Boolean(formData.get("tbc"));
    setPinOverride(editingKey, { label, detail, kind, tbc }, false);
    persistDraft("Item updated");
    addItemDialog.close();
    selectedKey = editingKey;
    render();
    showToast(`${label} updated.`);
  }

  function moveItem(key, delta) {
    const pins = currentPins();
    const index = pins.findIndex((pin) => pin.key === key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= pins.length) return;
    const keys = pins.map((pin) => pin.key);
    [keys[index], keys[target]] = [keys[target], keys[index]];
    setOrderScope(view, activeDate, keys);
    selectedKey = key;
    markDirty();
    persistDraft("Order saved");
    render();
    destinationList.querySelector(`[data-key="${selectorKey(key)}"]`)?.scrollIntoView({ block: "nearest" });
  }

  function requestDeleteItem(key) {
    const pin = getPin(key);
    if (!pin) return;
    selectDestination(key);
    if (pin.custom) {
      let occurrences = 0;
      VIEWS.forEach((viewName) => DATES.forEach((dateName) => {
        occurrences += customScope(viewName, dateName).filter((item) => item.key === key).length;
      }));
      askConfirm({
        title: "DELETE ADDED ITEM",
        text: `Delete “${pin.label}”${occurrences > 1 ? ` from all ${occurrences} maps where it was added` : ""}? This cannot be undone.`,
        accept: "Delete item",
        onAccept: () => deleteItemNow(key, false)
      });
      return;
    }
    const otherDates = DATES.filter((dateName) => dateName !== activeDate && data[view][dateName].pins.some((item) => item.key === key));
    askConfirm({
      title: "REMOVE ITEM",
      text: `Remove “${pin.label}” from the ${view === "staff" ? "Staff" : "Guest"} Map? It will disappear from the map, the list, the PPTX and the published data. Use “Restore removed” or “Reset this date” to bring it back.`,
      accept: "Remove item",
      scopeOptions: otherDates.length ? [
        { value: "date", label: `${currentPage().date} only` },
        { value: "all", label: `All dates of the ${view === "staff" ? "Staff" : "Guest"} Map where it appears (${otherDates.length + 1})` }
      ] : null,
      onAccept: () => deleteItemNow(key, confirmScopeValue() === "all")
    });
  }

  function deleteItemNow(key, allDates) {
    const pin = getPin(key);
    if (!pin) return;
    const deletedLabel = pin.label;
    if (pin.custom) {
      VIEWS.forEach((viewName) => DATES.forEach((dateName) => {
        if (customItems[viewName]?.[dateName]) customItems[viewName][dateName] = customItems[viewName][dateName].filter((item) => item.key !== key);
        if (overrides[viewName]?.[dateName]) delete overrides[viewName][dateName][key];
        if (orderOverrides[viewName]?.[dateName]) orderOverrides[viewName][dateName] = orderOverrides[viewName][dateName].filter((item) => item !== key);
      }));
    } else {
      (allDates ? DATES : [activeDate]).forEach((dateName) => {
        if (!data[view][dateName].pins.some((item) => item.key === key)) return;
        const scope = overrideScope(view, dateName, true);
        scope[key] = { ...(scope[key] || {}), deleted: true };
      });
    }
    selectedKey = "";
    markDirty();
    persistDraft("Item deleted");
    render();
    showToast(`${deletedLabel} ${pin.custom ? "deleted" : "removed"}.`);
  }

  function restoreRemovedItems() {
    const removed = removedBasePins();
    if (!removed.length) return;
    const scope = overrideScope(view, activeDate, true);
    removed.forEach((pin) => { delete scope[pin.key].deleted; });
    markDirty();
    persistDraft("Items restored");
    render();
    showToast(`${removed.length} item${removed.length > 1 ? "s" : ""} restored.`);
  }

  function viewportMapPosition() {
    const stageWidth = stage.clientWidth || 1;
    const stageHeight = stage.clientHeight || 1;
    const centreX = frame.scrollLeft + frame.clientWidth / 2;
    const centreY = frame.scrollTop + frame.clientHeight / 2;
    return {
      x: Math.round(clamp(centreX / stageWidth * data.meta.width, 80, data.meta.width - 80)),
      y: Math.round(clamp(centreY / stageHeight * data.meta.height, 80, data.meta.height - 80))
    };
  }

  function targetScopes(scope) {
    const dates = ["sep30", "oct1", "oct2"];
    if (scope === "both-date") return [["guest", activeDate], ["staff", activeDate]];
    if (scope === "audience-all") return dates.map((dateName) => [view, dateName]);
    if (scope === "all") return ["guest", "staff"].flatMap((viewName) => dates.map((dateName) => [viewName, dateName]));
    return [[view, activeDate]];
  }

  function addCustomMapItem(event) {
    event.preventDefault();
    const formData = new FormData(addItemForm);
    if (itemDialogMode === "edit") {
      saveItemEdit(formData);
      return;
    }
    const label = String(formData.get("label") || "").trim();
    if (!label) return;
    const detail = String(formData.get("detail") || "").trim() || "Location detail to be confirmed";
    const kind = String(formData.get("kind") || "service");
    const scope = String(formData.get("scope") || "current");
    const position = viewportMapPosition();
    const idPart = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `custom-${idPart}`;
    const item = { key, x: position.x, y: position.y, label, detail, kind, side: "right", custom: true };
    if (formData.get("tbc")) item.tbc = true;
    targetScopes(scope).forEach(([viewName, dateName]) => customScope(viewName, dateName, true).push({ ...item }));
    persistDraft("Item added");
    addItemDialog.close();
    selectedKey = key;
    setEditing(true);
    render();
    showToast(`${label} added. Drag its pin to the exact position.`);
  }

  function mergedMapData() {
    const merged = JSON.parse(JSON.stringify(data));
    VIEWS.forEach((viewName) => {
      Object.keys(data[viewName]).forEach((dateName) => {
        const mergedPage = merged[viewName][dateName];
        mergedPage.route = effectiveRoute(viewName, dateName).map((point) => [...point]);
        mergedPage.pins = effectivePins(viewName, dateName).map((pin) => {
          const output = { ...pin };
          delete output.edited;
          delete output.deleted;
          return output;
        });
      });
    });
    return merged;
  }

  function downloadBlob(content, type, filename) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function confirmedSnapshot() {
    try {
      return JSON.parse(window.localStorage.getItem(PUBLISHED_KEY) || "null") || mergedMapData();
    } catch (error) {
      return mergedMapData();
    }
  }

  function confirmVersion() {
    persistDraft();
    const snapshot = mergedMapData();
    window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify(snapshot));
    publishDialog.showModal();
    showToast("Version confirmed. Public preview now uses this snapshot.");
  }

  function downloadPublicData() {
    const snapshot = confirmedSnapshot();
    const publicData = { meta: snapshot.meta, guest: snapshot.guest, staff: snapshot.staff };
    downloadBlob(`window.VENUE_MAP_DATA = ${JSON.stringify(publicData, null, 2)};\n`, "text/javascript;charset=utf-8", "map-data.js");
    showToast("Map data downloaded (Guest + Staff). Replace /assets/map-data.js on the server.");
  }

  async function imageAsDataUrl(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Floor map image could not be loaded.");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function pptxLabelLayout(page, mapBox) {
    const pins = page.pins.filter((pin) => !pin.listOnly);
    const sx = mapBox.w / data.meta.width;
    const sy = mapBox.h / data.meta.height;
    const obstacles = pins.map((pin) => rectFrom(mapBox.x + pin.x * sx - .16, mapBox.y + pin.y * sy - .16, .32, .32));
    const entries = pins.map((pin, index) => {
      const width = clamp(pin.label.length * .075 + .65, 1.35, 2.65);
      const height = pin.label.length > 28 ? .72 : .54;
      return { pin, index: index + 1, x: mapBox.x + pin.x * sx, y: mapBox.y + pin.y * sy, width, height };
    }).sort((a, b) => b.width * b.height - a.width * a.height);
    const placed = [];
    const result = [];
    entries.forEach((entry) => {
      const candidates = [];
      ["right", "left"].forEach((side) => [-1.05, -.55, 0, .55, 1.05].forEach((shift) => candidates.push({ side, left: side === "right" ? entry.x + .22 : entry.x - entry.width - .22, top: entry.y - entry.height / 2 + shift })));
      [-1, -.5, 0, .5, 1].forEach((shift) => {
        candidates.push({ side: "top", left: entry.x - entry.width / 2 + shift, top: entry.y - entry.height - .24 });
        candidates.push({ side: "bottom", left: entry.x - entry.width / 2 + shift, top: entry.y + .2 });
      });
      let best = null;
      candidates.forEach((candidate) => {
        const rect = rectFrom(candidate.left, candidate.top, entry.width, entry.height);
        const overflow = Math.max(0, mapBox.x - rect.left) + Math.max(0, mapBox.y - rect.top) + Math.max(0, rect.right - (mapBox.x + mapBox.w)) + Math.max(0, rect.bottom - (mapBox.y + mapBox.h));
        const labelCollision = placed.reduce((sum, other) => sum + overlapArea(rect, other), 0);
        const pinCollision = obstacles.reduce((sum, obstacle) => sum + overlapArea(rect, obstacle), 0);
        const sidePenalty = candidate.side === (entry.pin.side || "right") ? 0 : 1.8;
        const score = overflow * 100000 + labelCollision * 12000 + pinCollision * 18000 + sidePenalty + Math.hypot(rect.left + entry.width / 2 - entry.x, rect.top + entry.height / 2 - entry.y);
        if (!best || score < best.score) best = { ...candidate, score };
      });
      const left = clamp(best.left, mapBox.x + .03, mapBox.x + mapBox.w - entry.width - .03);
      const top = clamp(best.top, mapBox.y + .03, mapBox.y + mapBox.h - entry.height - .03);
      const rect = rectFrom(left, top, entry.width, entry.height);
      placed.push(rect);
      result.push({ ...entry, rect });
    });
    return result;
  }

  async function downloadPptx(trigger) {
    if (typeof PptxGenJS === "undefined") {
      showToast("PPTX generator is unavailable. Check that the vendor file was uploaded.");
      return;
    }
    trigger.disabled = true;
    const originalText = trigger.textContent;
    trigger.textContent = "Building PPTX…";
    try {
      const snapshot = mergedMapData();
      const floorMapData = await imageAsDataUrl("../assets/luigans-floor-map.png");
      const markData = await imageAsDataUrl("../assets/colive-fukuoka-mark.png");
      const pptx = new PptxGenJS();
      pptx.defineLayout({ name: "A3_LANDSCAPE", width: 16.535, height: 11.693 });
      pptx.layout = "A3_LANDSCAPE";
      pptx.author = "Colive Fukuoka";
      pptx.company = "Yugyo Inc.";
      pptx.subject = "THE LUIGANS venue maps";
      pptx.title = "Colive Fukuoka 2026 Venue Maps";
      pptx.lang = "en-US";
      pptx.theme = { headFontFace: "Arial Narrow", bodyFontFace: "Arial", lang: "en-US" };
      const colors = { indigo: "1F296A", blue: "0069A0", orange: "EB6100", green: "00AF84", paper: "F5F7FC", line: "D9DEF0", muted: "667085", white: "FFFFFF" };
      const kindColor = { access: colors.orange, destination: colors.green, staff: colors.indigo, service: colors.blue, muted: "7B8191" };
      const mapBox = { x: .55, y: 1.55, w: 11.35, h: 8.03 };
      const shape = pptx.ShapeType;

      ["guest", "staff"].forEach((audience) => {
        ["sep30", "oct1", "oct2"].forEach((dateKey) => {
          const page = snapshot[audience][dateKey];
          const slide = pptx.addSlide();
          slide.background = { color: colors.paper };
          slide.addShape(shape.rect, { x: 0, y: 0, w: 16.535, h: 1.14, line: { color: colors.indigo, transparency: 100 }, fill: { color: colors.indigo } });
          slide.addImage({ data: markData, x: .55, y: .17, w: .45, h: .54 });
          slide.addText(audience === "staff" ? "STAFF MAP" : "GUEST MAP", { x: 1.15, y: .16, w: 2.3, h: .34, fontFace: "Arial Narrow", fontSize: 38, bold: true, color: colors.white, margin: 0, breakLine: false, fit: "shrink" });
          slide.addText(`${page.date}  ·  ${page.title}`, { x: 3.55, y: .26, w: 8.7, h: .28, fontFace: "Arial", fontSize: 18, bold: true, color: colors.white, margin: 0, align: "right", fit: "shrink" });
          slide.addText("COLIVE FUKUOKA 2026", { x: 13.1, y: .27, w: 2.85, h: .24, fontFace: "Arial", fontSize: 16, bold: true, color: "CDE9F1", margin: 0, align: "right" });
          slide.addShape(shape.roundRect, { x: mapBox.x - .04, y: mapBox.y - .04, w: mapBox.w + .08, h: mapBox.h + .08, rectRadius: .06, line: { color: colors.line, width: 1 }, fill: { color: colors.white } });
          slide.addImage({ data: floorMapData, ...mapBox });
          const layout = pptxLabelLayout(page, mapBox);
          layout.forEach((entry) => {
            const rect = entry.rect;
            const endX = clamp(entry.x, rect.left, rect.right);
            const endY = clamp(entry.y, rect.top, rect.bottom);
            const deltaX = endX - entry.x;
            const deltaY = endY - entry.y;
            slide.addShape(shape.line, {
              x: Math.min(entry.x, endX),
              y: Math.min(entry.y, endY),
              w: Math.max(.001, Math.abs(deltaX)),
              h: Math.max(.001, Math.abs(deltaY)),
              flipV: deltaX * deltaY < 0,
              line: { color: "7E86AD", width: 1.2, transparency: 20 }
            });
          });
          layout.forEach((entry) => {
            const rect = entry.rect;
            const color = kindColor[entry.pin.kind] || colors.blue;
            slide.addShape(shape.roundRect, { x: rect.left, y: rect.top, w: rect.width, h: rect.height, rectRadius: .04, line: { color, width: 1 }, fill: { color: colors.white, transparency: 4 }, shadow: { type: "outer", color: "3A4774", blur: 1, angle: 45, distance: 1, opacity: .16 } });
            slide.addText(entry.pin.label, { x: rect.left + .1, y: rect.top + .06, w: rect.width - .2, h: rect.height - .12, fontFace: "Arial", fontSize: 16, bold: true, color: colors.indigo, margin: 0, valign: "mid", fit: "shrink", breakLine: false });
            slide.addShape(shape.ellipse, { x: entry.x - .15, y: entry.y - .15, w: .3, h: .3, line: { color: colors.white, width: 1.2 }, fill: { color } });
            slide.addText(String(entry.index), { x: entry.x - .15, y: entry.y - .118, w: .3, h: .18, fontFace: "Arial", fontSize: 11, bold: true, color: colors.white, margin: 0, align: "center", valign: "mid" });
          });
          slide.addShape(shape.roundRect, { x: 12.25, y: 1.55, w: 3.72, h: 2.28, rectRadius: .08, line: { color: colors.indigo, transparency: 100 }, fill: { color: colors.indigo } });
          slide.addText(audience === "staff" ? "OPERATIONAL PRIORITY" : "START HERE", { x: 12.55, y: 1.85, w: 3.1, h: .26, fontFace: "Arial", fontSize: 16, bold: true, color: "C6F5E8", margin: 0, charSpacing: 1.2 });
          slide.addText(page.notice, { x: 12.55, y: 2.28, w: 3.08, h: 1.08, fontFace: "Arial", fontSize: 18, color: colors.white, margin: 0, breakLine: false, fit: "shrink", valign: "mid" });
          const listOnly = page.pins.filter((pin) => pin.listOnly);
          slide.addText("ADDITIONAL GUIDANCE", { x: 12.25, y: 4.25, w: 3.72, h: .32, fontFace: "Arial Narrow", fontSize: 28, bold: true, color: colors.indigo, margin: 0 });
          slide.addShape(shape.line, { x: 12.25, y: 4.72, w: 3.72, h: 0, line: { color: colors.orange, width: 2 } });
          const guidance = listOnly.length ? listOnly.map((pin) => ({ text: `${pin.label}\n${pin.detail}`, options: { bullet: { indent: 18 }, breakLine: true } })) : [{ text: "Follow the numbered labels and on-site event signs.", options: { bullet: { indent: 18 }, breakLine: true } }];
          slide.addText(guidance, { x: 12.35, y: 5.05, w: 3.45, h: 2.6, fontFace: "Arial", fontSize: 16, color: colors.muted, margin: 0, breakLine: false, valign: "top", fit: "shrink", paraSpaceAfterPt: 14 });
          slide.addText("Guide route", { x: 12.35, y: 8.2, w: 1.1, h: .25, fontFace: "Arial", fontSize: 16, color: colors.muted, margin: 0 });
          slide.addShape(shape.line, { x: 13.58, y: 8.34, w: 1.35, h: 0, line: { color: colors.orange, transparency: 65, width: 2, dash: "dash" } });
          slide.addText("Programme", { x: 12.35, y: 8.72, w: 1.25, h: .25, fontFace: "Arial", fontSize: 16, color: colors.muted, margin: 0 });
          slide.addShape(shape.ellipse, { x: 13.72, y: 8.72, w: .24, h: .24, line: { color: colors.white }, fill: { color: colors.green } });
          slide.addText("THE LUIGANS Spa & Resort · Uminonakamichi, Fukuoka", { x: .55, y: 10.55, w: 8.5, h: .25, fontFace: "Arial", fontSize: 16, color: colors.muted, margin: 0 });
          slide.addText(audience === "staff" ? "INTERNAL · DO NOT DISTRIBUTE" : "PUBLIC VENUE MAP", { x: 11.75, y: 10.55, w: 4.2, h: .25, fontFace: "Arial", fontSize: 16, bold: true, color: audience === "staff" ? colors.orange : colors.green, margin: 0, align: "right" });
          if (slide.addNotes) slide.addNotes(`[Sources]\n- Colive Fukuoka operations materials, 1 Sep 2026\n- THE LUIGANS first-floor plan supplied with the venue-map package`);
        });
      });
      await pptx.writeFile({ fileName: "Colive-Fukuoka-2026-Venue-Maps.pptx" });
      showToast("PPTX downloaded with all Guest and Staff maps.");
    } catch (error) {
      console.error(error);
      showToast("PPTX could not be created. Open this editor through the web server and try again.");
    } finally {
      trigger.disabled = false;
      trigger.textContent = originalText;
    }
  }

  function nudgeSelectedPin(event) {
    if (!editing || !selectedKey || event.target.closest?.("input, button, dialog")) return false;
    const pin = getPin(selectedKey);
    if (!pin || pin.listOnly) return false;
    const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!deltas[event.key]) return false;
    event.preventDefault();
    const step = event.shiftKey ? 20 : 4;
    const position = resolvedPin(pin);
    setPinOverride(selectedKey, { x: clamp(position.x + deltas[event.key][0] * step, 0, data.meta.width), y: clamp(position.y + deltas[event.key][1] * step, 0, data.meta.height) });
    positionPinElement(selectedKey);
    return true;
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setDate(tab.dataset.date)));
  viewButtons.forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewSwitch)));
  editToggle.addEventListener("click", () => setEditing(!editing));
  flipLabel.addEventListener("click", flipSelectedLabel);
  deleteItem.addEventListener("click", () => { if (selectedKey) requestDeleteItem(selectedKey); });
  editItemButton.addEventListener("click", () => { if (selectedKey) openEditItemDialog(selectedKey); });
  restoreItems.addEventListener("click", restoreRemovedItems);
  confirmAccept.addEventListener("click", () => {
    const action = pendingConfirm;
    pendingConfirm = null;
    confirmDialog.close();
    if (typeof action === "function") action();
  });
  document.getElementById("confirm-cancel").addEventListener("click", () => { pendingConfirm = null; confirmDialog.close(); });
  confirmDialog.addEventListener("close", () => { pendingConfirm = null; });
  document.getElementById("add-map-item").addEventListener("click", openAddItemDialog);
  document.getElementById("cancel-add-item").addEventListener("click", () => addItemDialog.close());
  addItemForm.addEventListener("submit", addCustomMapItem);
  document.getElementById("reset-date").addEventListener("click", resetCurrentDate);
  document.getElementById("save-draft").addEventListener("click", () => { persistDraft(); showToast("Draft saved in this browser."); });
  document.getElementById("auto-arrange").addEventListener("click", () => { autoArrangeLabels(); showToast("Labels re-arranged to minimize overlap."); });
  document.getElementById("preview-public").addEventListener("click", () => {
    window.localStorage.setItem(PUBLISHED_KEY, JSON.stringify(mergedMapData()));
    window.open(view === "staff" ? "../staff/index.html?preview=1" : "../index.html?preview=1", "_blank", "noopener");
  });
  document.getElementById("confirm-version").addEventListener("click", confirmVersion);
  document.getElementById("download-public-data").addEventListener("click", downloadPublicData);
  document.getElementById("close-dialog").addEventListener("click", () => publishDialog.close());
  document.getElementById("download-pptx").addEventListener("click", (event) => downloadPptx(event.currentTarget));
  document.getElementById("dialog-download-pptx").addEventListener("click", (event) => downloadPptx(event.currentTarget));
  document.getElementById("sign-out").addEventListener("click", () => { window.sessionStorage.removeItem(AUTH_KEY); window.location.reload(); });
  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom + .25));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom - .25));
  document.getElementById("zoom-reset").addEventListener("click", () => setZoom(1));
  document.getElementById("print-map").addEventListener("click", () => window.print());
  document.addEventListener("keydown", (event) => {
    if (nudgeSelectedPin(event)) return;
    if (event.key === "+" || event.key === "=") setZoom(zoom + .25);
    if (event.key === "-") setZoom(zoom - .25);
    if (event.key === "0") setZoom(1);
  });
  window.addEventListener("resize", scheduleArrange, { passive: true });
  window.addEventListener("beforeprint", autoArrangeLabels);
  document.getElementById("floor-map").addEventListener("load", scheduleArrange);

  if (window.VENUE_EDIT_AUTH_MODE === "server" || window.sessionStorage.getItem(AUTH_KEY) === "allowed") showEditor();
})();
