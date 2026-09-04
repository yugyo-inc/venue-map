(function () {
  const PREVIEW_KEY = "colive-fukuoka:venue-map-published:v2";
  const params = new URLSearchParams(window.location.search);
  const audience = document.body.dataset.audience === "staff" ? "staff" : "guest";
  let data = window.VENUE_MAP_DATA;
  if (params.get("preview") === "1") {
    try {
      const preview = JSON.parse(window.localStorage.getItem(PREVIEW_KEY) || "null");
      if (preview?.[audience]) data = preview;
    } catch (error) {
      console.warn("Preview data could not be loaded.", error);
    }
  }

  const tabs = Array.from(document.querySelectorAll("[data-date]"));
  const pinLayer = document.getElementById("pin-layer");
  const destinationList = document.getElementById("destination-list");
  const mapTitle = document.getElementById("map-title");
  const mapSubtitle = document.getElementById("map-subtitle");
  const dateStamp = document.getElementById("date-stamp");
  const notice = document.getElementById("notice-text");
  const routeHalo = document.getElementById("route-halo");
  const routePath = document.getElementById("route-path");
  const stage = document.getElementById("map-stage");
  const frame = document.getElementById("map-frame");
  const zoomStatus = document.getElementById("zoom-status");
  let activeDate = document.body.dataset.defaultDate || "sep30";
  let zoom = 1;
  let arrangeFrame = 0;

  const esc = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const rectFrom = (left, top, width, height) => ({ left, top, right: left + width, bottom: top + height, width, height });

  function page() {
    const pages = data[audience] || data.guest;
    return pages[activeDate] || pages.sep30;
  }

  function routePathFrom(points) {
    return points.map((point, index) => `${index ? "L" : "M"} ${point[0]} ${point[1]}`).join(" ");
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
      return {
        element,
        label,
        leader: element.querySelector(".label-leader"),
        x: element.offsetLeft,
        y: element.offsetTop,
        width: label.offsetWidth,
        height: label.offsetHeight,
        preferred: element.dataset.side || "right"
      };
    }).filter((entry) => entry.width && entry.height).sort((a, b) => (b.width * b.height) - (a.width * a.height));

    const placed = [];
    entries.forEach((entry) => {
      const { x, y, width, height, preferred } = entry;
      const horizontal = [-82, -42, 0, 42, 82];
      const candidates = [];
      ["right", "left"].forEach((side) => {
        horizontal.forEach((shift) => {
          candidates.push({
            side,
            left: side === "right" ? x + 20 : x - width - 20,
            top: y - height / 2 + shift
          });
        });
      });
      [-70, 0, 70].forEach((shift) => {
        candidates.push({ side: "top", left: x - width / 2 + shift, top: y - height - 24 });
        candidates.push({ side: "bottom", left: x - width / 2 + shift, top: y + 18 });
      });

      let best = null;
      candidates.forEach((candidate) => {
        const rect = rectFrom(candidate.left, candidate.top, width, height);
        const overflow = Math.max(0, -rect.left) + Math.max(0, -rect.top) + Math.max(0, rect.right - stageWidth) + Math.max(0, rect.bottom - stageHeight);
        const labelCollision = placed.reduce((sum, other) => sum + overlapArea(rect, other), 0);
        const pinCollision = obstacles.reduce((sum, obstacle) => sum + overlapArea(rect, obstacle), 0);
        const sidePenalty = candidate.side === preferred ? 0 : candidate.side === (preferred === "left" ? "right" : "left") ? 800 : 420;
        const distance = Math.hypot((rect.left + width / 2) - x, (rect.top + height / 2) - y);
        const score = overflow * 20000 + labelCollision * 150 + pinCollision * 220 + sidePenalty + distance;
        if (!best || score < best.score) best = { ...candidate, score };
      });

      const left = clamp(best.left, 6, Math.max(6, stageWidth - width - 6));
      const top = clamp(best.top, 6, Math.max(6, stageHeight - height - 6));
      const rect = rectFrom(left, top, width, height);
      placed.push(rect);

      const localX = left - x;
      const localY = top - y;
      entry.label.style.setProperty("--label-x", `${localX}px`);
      entry.label.style.setProperty("--label-y", `${localY}px`);
      entry.label.classList.toggle("label-left", best.side === "left");
      entry.label.classList.toggle("label-right", best.side !== "left");

      const endX = clamp(x, rect.left, rect.right) - x;
      const endY = clamp(y, rect.top, rect.bottom) - y;
      const length = Math.max(10, Math.hypot(endX, endY));
      const angle = Math.atan2(endY, endX) * 180 / Math.PI;
      entry.leader.style.setProperty("--leader-length", `${length}px`);
      entry.leader.style.setProperty("--leader-angle", `${angle}deg`);
    });
  }

  function render() {
    const current = page();
    mapTitle.textContent = current.title;
    mapSubtitle.textContent = current.subtitle;
    dateStamp.textContent = current.date;
    notice.textContent = current.notice;
    const route = routePathFrom(current.route);
    routeHalo.setAttribute("d", route);
    routePath.setAttribute("d", route);

    const mapPins = current.pins.filter((pin) => !pin.listOnly);
    const numbers = new Map(mapPins.map((pin, index) => [pin.key, index + 1]));
    pinLayer.innerHTML = mapPins.map((pin) => `
      <button class="map-pin pin-${esc(pin.kind)} ${pin.tbc ? "is-tbc" : ""}" style="left:${pin.x / data.meta.width * 100}%;top:${pin.y / data.meta.height * 100}%" data-key="${esc(pin.key)}" data-side="${esc(pin.side || "right")}" aria-label="${esc(pin.label)}. ${esc(pin.detail)}">
        <span class="label-leader" aria-hidden="true"></span>
        <span class="pin-dot"><span>${numbers.get(pin.key)}</span></span>
        <span class="pin-label"><strong>${esc(pin.label)}</strong><small>${esc(pin.detail)}</small></span>
      </button>`).join("");

    destinationList.innerHTML = current.pins.map((pin) => `
      <li><button class="destination-card ${pin.tbc ? "is-tbc" : ""}" data-key="${esc(pin.key)}">
        <span class="destination-index">${pin.listOnly ? "—" : numbers.get(pin.key)}</span>
        <span><strong>${esc(pin.label)}</strong><small>${esc(pin.detail)}</small></span>
        ${pin.tbc ? '<span class="tbc-chip">TBC</span>' : ""}
      </button></li>`).join("");

    destinationList.querySelectorAll("[data-key]").forEach((card) => {
      card.addEventListener("click", () => {
        const key = card.dataset.key;
        document.querySelectorAll("[data-key]").forEach((item) => item.classList.toggle("is-active", item.dataset.key === key));
        pinLayer.querySelector(`[data-key="${key}"]`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      });
    });
    scheduleArrange();
  }

  function setDate(nextDate) {
    activeDate = nextDate;
    tabs.forEach((tab) => {
      const selected = tab.dataset.date === activeDate;
      tab.classList.toggle("is-selected", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });
    render();
  }

  function setZoom(nextZoom) {
    zoom = clamp(nextZoom, 1, 2);
    stage.style.width = `${zoom * 100}%`;
    zoomStatus.textContent = `${Math.round(zoom * 100)}%`;
    if (zoom === 1) frame.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    scheduleArrange();
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setDate(tab.dataset.date)));
  document.getElementById("zoom-in").addEventListener("click", () => setZoom(zoom + .25));
  document.getElementById("zoom-out").addEventListener("click", () => setZoom(zoom - .25));
  document.getElementById("zoom-reset").addEventListener("click", () => setZoom(1));
  document.getElementById("print-map").addEventListener("click", () => window.print());
  window.addEventListener("resize", scheduleArrange, { passive: true });
  window.addEventListener("beforeprint", autoArrangeLabels);
  document.getElementById("floor-map").addEventListener("load", scheduleArrange);
  setDate(activeDate);
})();
