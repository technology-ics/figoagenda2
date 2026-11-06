import { CONFIG } from "./config.js";
import { fetchProgrammeCsv, mapHeaders, parseCsv } from "./data-loader.js";
import { buildProgramme, compareSessions, orderedStreamNames, streamStyle } from "./data-model.js";
import { explainMatch } from "./search.js";
import { activeFilterCount, clearFilters, collectFilterOptions, createFilterState, sessionMatches } from "./filters.js";
import { renderCalendar } from "./agenda-calendar.js";
import { renderList } from "./agenda-list.js";
import { findConflicts, loadSavedIds, renderPersonalAgenda, saveSavedIds } from "./personal-agenda.js";
import { renderSessionDialog, sessionPageUrl } from "./session-details.js";
import { translate, translateSessionLanguage } from "./translations.js";
import { el, formatIsoDate, readStorage, writeStorage } from "./utils.js";

const state = {
  language: initialLanguage(),
  view: initialView(),
  mode: "programme",
  query: "",
  date: "all",
  filters: createFilterState(),
  sessions: [],
  savedIds: loadSavedIds(),
  selectedId: "",
  status: "loading",
  usingCache: false,
  cacheSavedAt: "",
  missingSession: false,
};

const t = (key, vars) => translate(state.language, key, vars);
let lastFocus = null;

const searchInput = () => document.querySelector("#search");
const dialog = () => document.querySelector("#session-dialog");

init();

function init() {
  document.querySelector("#preview").hidden = !CONFIG.previewNotice;
  applyTranslations();
  bindEvents();
  updateChrome();
  load();
}

function bindEvents() {
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.lang));
  });

  document.querySelector("#search-form").addEventListener("submit", (event) => event.preventDefault());
  searchInput().addEventListener("input", () => {
    state.query = searchInput().value;
    renderProgramme();
    updateChrome();
  });
  document.querySelector("#search-clear").addEventListener("click", () => {
    state.query = "";
    searchInput().value = "";
    searchInput().focus();
    renderProgramme();
    updateChrome();
  });
  document.querySelector("#refresh").addEventListener("click", () => load());
  document.querySelector("#clear-filters").addEventListener("click", () => resetFilters());
  document.querySelector("#prev-day").addEventListener("click", () => shiftDate(-1));
  document.querySelector("#next-day").addEventListener("click", () => shiftDate(1));
  document.querySelector("#view-calendar").addEventListener("click", () => setView("calendar"));
  document.querySelector("#view-list").addEventListener("click", () => setView("list"));
  document.querySelector("#agenda-toggle").addEventListener("click", () => {
    state.mode = state.mode === "agenda" ? "programme" : "agenda";
    renderProgramme();
    updateChrome();
  });

  dialog().addEventListener("close", () => {
    setSessionParam("");
    const target = state.selectedId
      ? document.querySelector(`button[data-session-id="${CSS.escape(state.selectedId)}"]`)
      : null;
    if (target) target.focus();
    else if (lastFocus instanceof HTMLElement && document.contains(lastFocus)) lastFocus.focus();
  });
  dialog().addEventListener("click", (event) => {
    if (dialog().dataset.justOpened === "true") return;
    if (event.target === dialog()) dialog().close();
  });
  dialog().addEventListener("keydown", trapFocus);
  document.addEventListener("click", (event) => {
    document.querySelectorAll("details.filter-group[open]").forEach((group) => {
      if (!group.contains(event.target)) group.open = false;
    });
  });
}

function resetFilters() {
  clearFilters(state.filters);
  state.date = "all";
  updateDateSelection();
  renderProgramme();
  updateChrome();
}

async function load() {
  const hadSessions = state.sessions.length > 0;
  state.status = hadSessions ? "refreshing" : "loading";
  state.missingSession = false;
  updateChrome();
  try {
    const csv = await fetchProgrammeCsv();
    writeCache(csv);
    applyCsv(csv, { fromCache: false });
    state.status = "ready";
  } catch {
    state.status = "error";
    if (!state.sessions.length) renderProgramme();
  }
  updateChrome();
}

function applyCsv(csv, { fromCache, savedAt }) {
  const parsed = parseCsv(csv);
  const headerInfo = mapHeaders(parsed.headers);
  const programme = buildProgramme(parsed.records, headerInfo);
  state.sessions = programme.sessions;
  state.usingCache = Boolean(fromCache);
  state.cacheSavedAt = savedAt || "";
  const dates = programmeDates();
  if (state.date !== "all" && !dates.includes(state.date)) state.date = "all";
  renderFilterOptions();
  renderDates();
  renderProgramme();
  const requested = readSessionParam();
  if (requested) openSession(requested, { fromLink: true });
}

function renderProgramme() {
  const main = document.querySelector("#programme");
  main.replaceChildren();
  const showCalendar = state.view === "calendar" && state.sessions.length > 0;
  document.body.classList.toggle("is-calendar", showCalendar);

  if (!state.sessions.length) {
    document.querySelector("#legend").hidden = true;
    const message = state.status === "error" ? t("loadError") : state.status === "loading" ? t("loading") : t("emptyProgramme");
    main.append(el("p", { class: "empty-state", text: message, lang: state.language, translate: "no" }));
    return;
  }

  if (state.mode === "agenda") {
    const saved = state.sessions.filter((session) => state.savedIds.includes(session.id));
    document.body.classList.toggle("is-calendar", state.view === "calendar" && saved.length > 0);
    renderPersonalAgenda(main, new Map(state.sessions.map((session) => [session.id, session])), state.savedIds, {
      language: state.language,
      t,
      view: state.view,
      date: state.view === "calendar" ? scopeDate() : "",
      selectedId: state.selectedId,
      onSelect: (id) => openSession(id),
      onRemove: (id) => setSaved(id, false),
      onBack: () => {
        state.mode = "programme";
        renderProgramme();
        updateChrome();
      },
    });
    if (state.view === "calendar") renderLegend(saved);
    else document.querySelector("#legend").hidden = true;
    return;
  }

  const sessions = visibleSessions();
  renderLegend();
  if (!sessions.length) {
    document.querySelector("#legend").hidden = true;
    document.body.classList.remove("is-calendar");
    main.append(el("div", { class: "empty-state" },
      el("p", { text: t("noResults"), lang: state.language, translate: "no" }),
      el("p", { text: t("noResultsHint"), lang: state.language, translate: "no" }),
    ));
    return;
  }

  const options = {
    language: state.language,
    t,
    selectedId: state.selectedId,
    savedIds: state.savedIds,
    query: state.query,
    ranked: state.view === "list" && Boolean(state.query.trim()),
    onSelect: (id) => openSession(id),
  };
  if (state.view === "calendar") renderCalendar(main, sessions, options);
  else renderList(main, sessions, options);
}

function renderLegend(sessions = state.sessions) {
  const section = document.querySelector("#legend");
  const list = document.querySelector("#legend-list");
  const show = state.view === "calendar";
  const names = orderedStreamNames(sessions);
  list.replaceChildren();
  section.hidden = !show || names.length === 0;
  for (const name of names) {
    const style = streamStyle(name);
    const swatch = el("span", { class: "swatch", text: style.code, translate: "no" });
    swatch.style.backgroundColor = style.tint || "#F7F8FA";
    swatch.style.color = style.colour;
    swatch.style.borderColor = style.colour;
    list.append(el("li", {}, swatch, el("span", { text: name, lang: "en", translate: "yes" })));
  }
}

function renderDates() {
  const container = document.querySelector("#dates");
  container.replaceChildren();
  container.append(el("button", {
    type: "button",
    class: "date-button",
    "data-date": "all",
    text: t("allDates"),
    lang: state.language,
    translate: "no",
    onClick: () => selectDate("all"),
  }));
  for (const date of programmeDates()) {
    container.append(el("button", {
      type: "button",
      class: "date-button",
      "data-date": date,
      text: formatIsoDate(date, state.language, { weekday: "short", day: "numeric", month: "short" }),
      lang: state.language,
      translate: "no",
      onClick: () => selectDate(date),
    }));
  }
  updateDateSelection();
}

function renderFilterOptions() {
  const openGroups = new Set([...document.querySelectorAll("details.filter-group[open]")].map((group) => group.dataset.group));
  const container = document.querySelector("#filters");
  container.replaceChildren();
  const options = collectFilterOptions(state.sessions, state.language);
  const rooms = [...new Set(state.sessions.map((session) => session.room).filter(Boolean))].sort((a, b) => roomRank(a) - roomRank(b) || a.localeCompare(b, state.language));
  const groups = [
    ["streams", "filterStream", orderedStreamNames(state.sessions)],
    ["types", "filterType", options.types],
    ["specials", "filterSpecial", options.specials],
    ["rooms", "filterRoom", rooms],
    ["languages", "filterLanguage", options.languages],
  ];

  for (const [name, labelKey, values] of groups) {
    if (!values.length) continue;
    container.append(checkboxFilter(name, labelKey, values));
    if (openGroups.has(name)) {
      const again = container.querySelector(`[data-group="${name}"]`);
      if (again) again.open = true;
    }
  }
  container.append(dateFilter());
  if (openGroups.has("date")) {
    const again = container.querySelector('[data-group="date"]');
    if (again) again.open = true;
  }
}

function checkboxFilter(name, labelKey, values) {
  const group = el("details", { class: "filter-group", "data-group": name });
  const summary = el("summary");
  summary.append(
    el("span", { class: "filter-label", "data-i18n": labelKey, text: t(labelKey) }),
    el("span", { class: "filter-selected", "data-filter-count": name }),
  );
  group.append(summary, filterChoices(name, values, `desk-${name}`));
  return group;
}

function dateFilter() {
  const group = el("details", { class: "filter-group", "data-group": "date" });
  const summary = el("summary");
  summary.append(
    el("span", { class: "filter-label", "data-i18n": "date", text: t("date") }),
    el("span", { class: "filter-selected", "data-filter-count": "date" }),
  );
  const list = el("div", { class: "filter-options" });
  const choices = [["all", t("allDates")], ...programmeDates().map((date) => [date, formatIsoDate(date, state.language, { weekday: "short", day: "numeric", month: "short" })])];
  choices.forEach(([value, label], index) => {
    const id = `filter-date-${index}`;
    const input = el("input", { type: "radio", name: "programme-date", id, value });
    const selected = state.view === "calendar" ? scopeDate() : state.date;
    input.checked = selected === value;
    input.addEventListener("change", () => {
      if (input.checked) selectDate(value);
    });
    list.append(el("label", { for: id }, input, el("span", { text: label, lang: state.language, translate: "no" })));
  });
  group.append(summary, list);
  return group;
}

function filterChoices(name, values, idPrefix, className = "filter-options") {
  const list = el("div", { class: className });
  values.forEach((value, index) => {
    const id = `${idPrefix}-${index}`;
    const input = el("input", { type: "checkbox", id, value, "data-filter-name": name });
    input.checked = state.filters[name]?.has(value);
    input.addEventListener("change", () => {
      if (input.checked) state.filters[name].add(value);
      else state.filters[name].delete(value);
      renderProgramme();
      updateChrome();
    });
    const labelText = name === "languages" ? translateSessionLanguage(value, state.language) : value;
    const text = el("span", { text: labelText });
    if (name === "languages") {
      text.lang = state.language;
      text.setAttribute("translate", "no");
    } else {
      text.lang = "en";
      text.setAttribute("translate", "yes");
    }
    list.append(el("label", { for: id }, input, text));
  });
  return list;
}

function scopeDate() {
  if (state.view === "calendar" && state.date === "all") return programmeDates()[0] || "";
  return state.date;
}

function matchingSessions() {
  return state.sessions.filter((session) => sessionMatches(session, {
    query: state.query,
    filters: state.filters,
    date: state.view === "calendar" ? scopeDate() : state.date,
  }));
}

function visibleSessions() {
  const sessions = matchingSessions();
  if (state.mode === "programme" && state.view === "list" && state.query.trim()) {
    return [...sessions].sort((a, b) => {
      const rank = explainMatch(a, state.query).rank - explainMatch(b, state.query).rank;
      return rank || compareSessions(a, b);
    });
  }
  return sessions;
}

function programmeDates() {
  return [...new Set(state.sessions.map((session) => session.date).filter(Boolean))].sort();
}

function selectDate(date) {
  state.date = date;
  state.mode = "programme";
  updateDateSelection();
  renderProgramme();
  updateChrome();
}

function shiftDate(step) {
  const dates = state.view === "calendar" ? programmeDates() : ["all", ...programmeDates()];
  const current = state.view === "calendar" ? scopeDate() : state.date;
  const index = dates.indexOf(current);
  const next = dates[index + step];
  if (next) selectDate(next);
}

function setView(view) {
  state.view = view;
  writeStorage(CONFIG.storageKeys.view, view);
  renderProgramme();
  updateChrome();
}

function setLanguage(language) {
  if (!CONFIG.languages.some((item) => item.id === language)) return;
  state.language = language;
  writeStorage(CONFIG.storageKeys.language, language);
  applyTranslations();
  renderDates();
  renderFilterOptions();
  renderProgramme();
  const current = dialog();
  if (current.open && state.selectedId) {
    refreshDialog(state.selectedId);
    revealSearchHit();
  }
  updateChrome();
}

function revealSearchHit() {
  if (!state.query.trim() || !dialog().open) return;
  window.requestAnimationFrame(() => {
    const scroller = dialog().querySelector(".dialog-body");
    const hit = dialog().querySelector("[data-search-target]");
    if (!scroller || !hit) return;
    const top = hit.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 48;
    scroller.scrollTop = Math.max(0, top);
  });
}

function openSession(id, { fromLink = false } = {}) {
  const session = state.sessions.find((item) => item.id === id);
  if (!session) {
    state.missingSession = true;
    updateChrome();
    return;
  }
  state.missingSession = false;
  state.selectedId = id;
  lastFocus = document.activeElement;
  if (state.mode !== "agenda" && state.view === "calendar" && session.date && scopeDate() !== session.date) {
    state.date = session.date;
    updateDateSelection();
    renderProgramme();
  } else if (state.mode !== "agenda" && state.date !== "all" && session.date && state.date !== session.date) {
    state.date = session.date;
    updateDateSelection();
    renderProgramme();
  } else {
    markSelected();
  }
  refreshDialog(id);
  const current = dialog();
  if (!current.open) current.showModal();
  current.dataset.justOpened = "true";
  window.setTimeout(() => {
    delete current.dataset.justOpened;
  }, 250);
  current.querySelector(".dialog-close")?.focus();
  revealSearchHit();
  setSessionParam(id);
  if (fromLink) {
    document.querySelector(`[data-session-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function refreshDialog(id) {
  const session = state.sessions.find((item) => item.id === id);
  if (!session) return;
  renderSessionDialog(dialog(), session, {
    language: state.language,
    t,
    saved: state.savedIds.includes(id),
    pageUrl: sessionPageUrl(id),
    query: state.query,
    onToggleSave: () => setSaved(id, !state.savedIds.includes(id)),
  });
}

function setSaved(id, shouldSave) {
  if (shouldSave && !state.savedIds.includes(id)) state.savedIds = [...state.savedIds, id];
  if (!shouldSave) state.savedIds = state.savedIds.filter((item) => item !== id);
  saveSavedIds(state.savedIds);
  if (state.mode === "agenda" || state.view === "list") renderProgramme();
  if (dialog().open && state.selectedId === id) {
    refreshDialog(id);
    dialog().querySelector(".dialog-close")?.focus();
  }
  updateChrome();
}

function markSelected() {
  document.querySelectorAll("[data-session-id]").forEach((node) => {
    const selected = node.dataset.sessionId === state.selectedId;
    node.classList.toggle("is-selected", selected);
    if (node.matches("button")) {
      if (selected) node.setAttribute("aria-current", "true");
      else node.removeAttribute("aria-current");
    }
  });
}

function updateChrome() {
  applyTranslations();
  updateDateSelection();
  updateViewButtons();
  updateAgendaButton();
  updateFilterCounts();
  renderActiveFilters();
  updateStatusLine();
  updateCacheOffer();
  document.querySelector("#search-clear").hidden = !state.query;
  document.querySelector("#refresh").disabled = state.status === "loading";
}

function updateStatusLine() {
  const status = document.querySelector("#status");
  if (state.status === "loading") {
    status.textContent = t("loading");
    return;
  }
  if (state.status === "refreshing") {
    status.textContent = t("refreshing");
    return;
  }
  if (state.status === "error" && !state.sessions.length) {
    status.textContent = t("loadError");
    return;
  }
  if (state.missingSession) {
    status.textContent = t("missingSession");
    return;
  }
  if (state.mode === "agenda") {
    const savedSessions = state.sessions.filter((session) => state.savedIds.includes(session.id));
    const conflicts = findConflicts(savedSessions);
    const pairCount = [...conflicts.values()].reduce((total, list) => total + list.length, 0) / 2;
    const label = state.savedIds.length === 1
      ? t("personalAgendaLabelOne")
      : t("personalAgendaLabel", { count: state.savedIds.length });
    const conflictText = pairCount === 1 ? t("conflictSummaryOne") : t("conflictSummaryMany", { count: pairCount });
    status.textContent = pairCount ? `${label}. ${conflictText}` : label;
    return;
  }
  if (!state.sessions.length) {
    status.textContent = t("emptyProgramme");
    return;
  }
  const count = visibleSessions().length;
  let text = count === 1 ? t("sessionCountOne") : t("sessionCountMany", { count });
  if (state.usingCache) text += `. ${t("usingCache", { time: formatCacheTime(state.cacheSavedAt) })}`;
  if (state.status === "error") text += `. ${t("loadError")}`;
  status.textContent = text;
}

function updateCacheOffer() {
  const box = document.querySelector("#cache-offer");
  box.replaceChildren();
  if (state.status !== "error") {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.append(el("p", { text: t("loadError") }));
  box.append(el("button", { type: "button", class: "primary-button", text: t("retry"), onClick: () => load() }));
  if (!state.sessions.length) {
    const cache = readCache();
    if (cache) {
      box.append(el("button", {
        type: "button",
        class: "secondary-button",
        text: t("showCache"),
        onClick: () => {
          applyCsv(cache.csv, { fromCache: true, savedAt: cache.savedAt });
          state.status = "ready";
          updateChrome();
        },
      }));
    }
  }
}

function updateDateSelection() {
  const calendar = state.view === "calendar";
  const current = calendar ? scopeDate() : state.date;
  document.querySelectorAll("#dates button").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.date === current ? "true" : "false");
    if (button.dataset.date === "all") button.hidden = calendar;
  });
  const dates = calendar ? programmeDates() : ["all", ...programmeDates()];
  const index = dates.indexOf(current);
  document.querySelector("#prev-day").disabled = index <= 0;
  document.querySelector("#next-day").disabled = index === -1 || index >= dates.length - 1;
  document.querySelectorAll('#filters input[name="programme-date"]').forEach((input) => {
    input.checked = input.value === (calendar ? current : state.date);
  });
}

function updateViewButtons() {
  document.querySelector("#view-calendar").setAttribute("aria-pressed", state.view === "calendar" ? "true" : "false");
  document.querySelector("#view-list").setAttribute("aria-pressed", state.view === "list" ? "true" : "false");
}

function updateAgendaButton() {
  const button = document.querySelector("#agenda-toggle");
  const badge = document.querySelector("#agenda-count");
  badge.hidden = state.savedIds.length === 0;
  badge.textContent = String(state.savedIds.length);
  button.setAttribute("aria-pressed", state.mode === "agenda" ? "true" : "false");
  const label = state.savedIds.length === 1
    ? t("personalAgendaLabelOne")
    : t("personalAgendaLabel", { count: state.savedIds.length });
  button.setAttribute("aria-label", label);
}

function updateFilterCounts() {
  for (const [name, group] of Object.entries(state.filters)) {
    document.querySelectorAll(`[data-filter-count="${name}"]`).forEach((node) => {
      node.textContent = group.size ? ` (${group.size})` : "";
    });
    document.querySelectorAll(`[data-group="${name}"]`).forEach((node) => {
      node.classList.toggle("is-active", group.size > 0);
    });
  }
  syncFilterInputs();
  const dateCount = document.querySelector('[data-filter-count="date"]');
  const dateActive = state.date !== "all";
  if (dateCount) {
    dateCount.textContent = dateActive
      ? ` · ${formatIsoDate(state.date, state.language, { weekday: "short", day: "numeric", month: "short" })}`
      : "";
  }
  document.querySelector('[data-group="date"]')?.classList.toggle("is-active", dateActive);
  const total = activeFilterCount(state.filters);
  document.querySelector("#clear-filters").hidden = total === 0 && !dateActive;
}

function syncFilterInputs() {
  document.querySelectorAll("input[data-filter-name]").forEach((input) => {
    const group = state.filters[input.dataset.filterName];
    if (group) input.checked = group.has(input.value);
  });
}

function renderActiveFilters() {
  const list = document.querySelector("#active-filters");
  list.replaceChildren();
  const chips = [];
  for (const [name, group] of Object.entries(state.filters)) {
    for (const value of group) chips.push({ name, value });
  }
  list.hidden = chips.length === 0 && state.date === "all";
  for (const chip of chips) {
    list.append(el("li", {},
      el("span", {
        text: chip.name === "languages" ? translateSessionLanguage(chip.value, state.language) : chip.value,
        lang: chip.name === "languages" ? undefined : "en",
        translate: chip.name === "languages" ? undefined : "yes",
      }),
      el("button", {
        type: "button",
        class: "chip-remove",
        text: "×",
        "aria-label": t("removeFilter", { value: chip.value }),
        onClick: () => {
          state.filters[chip.name].delete(chip.value);
          renderProgramme();
          updateChrome();
        },
      }),
    ));
  }
  if (state.date !== "all") {
    const label = formatIsoDate(state.date, state.language, { weekday: "short", day: "numeric", month: "short" });
    list.append(el("li", {},
      el("span", { text: label }),
      el("button", {
        type: "button",
        class: "chip-remove",
        text: "×",
        "aria-label": t("removeFilter", { value: label }),
        onClick: () => selectDate("all"),
      }),
    ));
  }
}

function applyTranslations() {
  document.documentElement.lang = "en-GB";
  document.title = t("documentTitle");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
    if (node.id === "lang-hint" && state.language === "en-GB") {
      node.lang = "en-GB";
      node.setAttribute("translate", "yes");
    } else {
      node.lang = state.language;
      node.setAttribute("translate", "no");
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.lang === state.language ? "true" : "false");
  });
  for (const selector of [".site-header", ".programme-toolbar", ".site-footer", "#status", "#cache-offer", ".filter-bar"]) {
    const node = document.querySelector(selector);
    if (!node) continue;
    node.lang = state.language;
    node.setAttribute("translate", "no");
  }
}

function trapFocus(event) {
  if (event.key !== "Tab") return;
  const focusable = [...dialog().querySelectorAll("button, a[href], input, select, textarea")].filter((node) => !node.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setSessionParam(id) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("session", id);
  else url.searchParams.delete("session");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function readSessionParam() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("session")) return params.get("session");
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("session=")) return decodeURIComponent(hash.slice("session=".length));
  return "";
}

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONFIG.storageKeys.cache) || "null");
    if (!parsed?.csv || !parsed.savedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(csv) {
  try {
    localStorage.setItem(CONFIG.storageKeys.cache, JSON.stringify({ csv, savedAt: new Date().toISOString() }));
  } catch {
    /* A full browser store should not block the live programme. */
  }
}

function formatCacheTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(state.language, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function roomRank(room) {
  const index = CONFIG.roomOrder.indexOf(room);
  return index === -1 ? 1000 : index;
}

function initialLanguage() {
  const saved = readStorage(CONFIG.storageKeys.language, "");
  return CONFIG.languages.some((language) => language.id === saved) ? saved : CONFIG.defaultLanguage;
}

function initialView() {
  if (window.matchMedia("(max-width: 720px)").matches) return "list";
  const saved = readStorage(CONFIG.storageKeys.view, "");
  if (saved === "calendar" || saved === "list") return saved;
  return "list";
}
