import { CONFIG } from "./config.js";
import { createSessionCard } from "./agenda-list.js";
import { renderCalendar } from "./agenda-calendar.js";
import { localContent } from "./translations.js";
import { el, formatIsoDate, readStorage, writeStorage } from "./utils.js";

export function loadSavedIds() {
  try {
    const parsed = JSON.parse(readStorage(CONFIG.storageKeys.agenda, "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id) => typeof id === "string" && id.length > 0 && id.length < 200);
  } catch {
    return [];
  }
}

export function saveSavedIds(ids) {
  writeStorage(CONFIG.storageKeys.agenda, JSON.stringify(ids));
}

export function findConflicts(sessions) {
  const conflicts = new Map();
  for (let i = 0; i < sessions.length; i += 1) {
    for (let j = i + 1; j < sessions.length; j += 1) {
      const a = sessions[i];
      const b = sessions[j];
      if (!a.date || a.date !== b.date || a.startMinutes == null || b.startMinutes == null) continue;
      if (a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes) {
        if (!conflicts.has(a.id)) conflicts.set(a.id, []);
        if (!conflicts.has(b.id)) conflicts.set(b.id, []);
        conflicts.get(a.id).push(b);
        conflicts.get(b.id).push(a);
      }
    }
  }
  return conflicts;
}

export function renderPersonalAgenda(container, sessionsById, savedIds, options) {
  const { language, t, selectedId, onSelect, onRemove, onBack, onPrint, onToggleSave, onFilterStream, onFilterTopic, view = "list", date = "" } = options;
  if (onBack) container.append(el("button", { type: "button", class: "text-button back-button", text: t("backToProgramme"), lang: language, translate: "no", onClick: onBack }));
  container.append(el("h2", { text: t("viewingAgenda"), lang: language, translate: "no" }));
  container.append(el("p", { class: "intro", text: t("agendaIntro"), lang: language, translate: "no" }));

  const available = [];
  const missing = [];
  for (const id of savedIds) {
    const session = sessionsById.get(id);
    if (session) available.push(session);
    else missing.push(id);
  }
  available.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.startMinutes ?? 0) - (b.startMinutes ?? 0));

  const conflicts = findConflicts(available);
  if (conflicts.size) {
    const pairCount = [...conflicts.values()].reduce((total, list) => total + list.length, 0) / 2;
    container.append(el("p", {
      class: "conflict-summary",
      role: "status",
      text: pairCount === 1 ? t("conflictSummaryOne") : t("conflictSummaryMany", { count: pairCount }),
      lang: language,
      translate: "no",
    }));
  }

  if (onPrint && available.length) {
    container.append(el("button", {
      type: "button",
      class: "text-button print-agenda-button",
      text: t("printAgenda"),
      lang: language,
      translate: "no",
      onClick: onPrint,
    }));
  }

  if (!available.length && !missing.length) {
    container.append(el("div", { class: "empty-state" },
      el("p", { text: t("agendaEmpty"), lang: language, translate: "no" }),
      el("p", { text: t("agendaEmptyHint"), lang: language, translate: "no" }),
    ));
    return;
  }

  const visible = view === "calendar" && date ? available.filter((session) => session.date === date) : available;
  if (view === "calendar") {
    if (visible.length) renderCalendar(container, visible, { language, t, selectedId, onSelect });
    else container.append(el("p", { class: "empty-state", text: t("agendaNoneThisDay"), lang: language, translate: "no" }));
  } else {
    const list = el("div", { class: "session-list" });
    for (const session of visible) {
      const wrap = el("div", { class: "agenda-item" });
      wrap.append(createSessionCard(session, {
      language,
      t,
      selectedId,
      saved: true,
      showDate: true,
      onSelect,
      onToggleSave,
      onFilterStream,
      onFilterTopic,
    }));
      const others = conflicts.get(session.id) || [];
      if (others.length) {
        const titles = others.map((other) => localContent(other.title, language)).join("; ");
        wrap.append(el("p", { class: "conflict-note", lang: language, translate: "no" }, el("strong", { text: t("conflict") }), ` — ${t("conflictWith", { titles })}`));
      }
      list.append(wrap);
    }
    container.append(list);
  }

  if (missing.length) {
    const section = el("section", { class: "missing-saved" });
    for (const id of missing) {
      section.append(el("article", { class: "session-card missing-card" },
        el("div", {},
          el("h3", { text: t("unavailableTitle"), lang: language, translate: "no" }),
          el("p", { text: t("unavailableBody"), lang: language, translate: "no" }),
          el("p", { class: "missing-id", text: id }),
        ),
        el("button", { type: "button", class: "secondary-button", text: t("remove"), lang: language, translate: "no", onClick: () => onRemove(id) }),
      ));
    }
    container.append(section);
  }
}

export function fillPrintAgenda(container, sessions, { language, t }) {
  container.replaceChildren();
  container.append(
    el("p", { class: "print-kicker", text: t("congressName"), lang: language, translate: "no" }),
    el("h1", { text: t("viewingAgenda"), lang: language, translate: "no" }),
    el("p", { text: `${t("congressDates")} · ${t("location")}`, lang: language, translate: "no" }),
    el("p", { text: t("footerTime"), lang: language, translate: "no" }),
  );
  let lastDate = "";
  for (const session of sessions) {
    if (session.date !== lastDate) {
      lastDate = session.date;
      const heading = session.date
        ? formatIsoDate(session.date, language, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : t("timeUnavailable");
      container.append(el("h2", { text: heading, lang: language, translate: "no" }));
    }
    const title = localContent(session.title, language) || session.id;
    const when = session.start && session.end ? `${session.start}–${session.end}` : t("timeUnavailable");
    const topics = [session.stream, ...session.specialTopics, session.type].filter(Boolean).join(" · ");
    const row = el("article", { class: "print-session" });
    row.append(el("p", { class: "print-time", text: when }));
    row.append(el("h3", { text: title, lang: "en", translate: "yes" }));
    if (session.room) row.append(el("p", { text: session.room, lang: "en", translate: "yes" }));
    if (topics) row.append(el("p", { class: "print-meta", text: topics, lang: "en", translate: "yes" }));
    container.append(row);
  }
}
