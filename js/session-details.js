import { localContent, roleKind, roleLabel, sourceLanguage, translateSessionLanguage } from "./translations.js";
import { el, fold, formatIsoDate } from "./utils.js";
import { streamTag, fillHighlighted } from "./agenda-list.js";
import { canExport, downloadIcs, googleCalendarUrl } from "./calendar-export.js";
import { explainMatch } from "./search.js";

export function renderSessionDialog(dialog, session, options) {
  const { language, t, saved, onToggleSave, pageUrl, query = "" } = options;
  const title = localContent(session.title, language) || session.id;
  const lang = sourceLanguage(session.language);
  dialog.replaceChildren();

  const header = el("div", { class: "dialog-header" });
  header.append(el("button", {
    type: "button",
    class: "dialog-close text-button",
    text: t("close"),
    translate: "no",
    "aria-label": t("closeSession"),
    onClick: () => dialog.close(),
  }));
  const heading = el("h2", { id: "dialog-title", lang, translate: "yes" });
  fillHighlighted(heading, title, query);
  header.append(heading);
  dialog.append(header);

  const body = el("div", { class: "dialog-body" });
  body.append(whenLine(session, language, t));
  if (session.hostOrganisation) {
    const host = el("p", { class: "host-line" }, el("span", { class: "meta-label", text: t("hostOrganisation"), lang: language, translate: "no" }), document.createTextNode(" "));
    const hostName = el("span", { lang: "en", translate: "yes" });
    fillHighlighted(hostName, session.hostOrganisation, query);
    host.append(hostName);
    body.append(host);
  }
  const tags = detailTags(session, language, t);
  if (tags.childElementCount) body.append(tags);
  body.append(leadershipBlock(session, language, t, query));

  const description = localContent(session.description, language);
  if (description) {
    body.append(el("h3", { text: t("description"), lang: language, translate: "no" }));
    for (const paragraph of description.split(/\n+/)) {
      const text = paragraph.trim();
      if (!text) continue;
      const copy = el("p", { lang, translate: "yes" });
      fillHighlighted(copy, text, query);
      body.append(copy);
    }
  }

  body.append(programmeBlock(session, language, lang, t, query));
  if (session.formatNotes) body.append(el("p", { class: "hint", lang: "en", translate: "yes", text: session.formatNotes }));
  dialog.append(body);
  dialog.append(actionRow(session, { t, saved, onToggleSave, pageUrl }));
  annotateSearchTarget(dialog, session, query);
}

export function sessionPageUrl(sessionId) {
  const url = new URL(window.location.href);
  url.searchParams.set("session", sessionId);
  url.hash = "";
  return url.toString();
}

function whenLine(session, language, t) {
  const line = el("p", { class: "when-line" });
  const parts = [];
  if (session.date) {
    parts.push(el("span", {
      text: formatIsoDate(session.date, language, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      lang: language,
      translate: "no",
    }));
  }
  if (session.start && session.end) {
    parts.push(el("span", { text: `${session.start}–${session.end}` }));
    parts.push(el("span", { class: "when-zone", text: t("montrealTime"), lang: language, translate: "no" }));
  }
  if (session.room) parts.push(el("span", { text: session.room, lang: "en", translate: "yes" }));
  parts.forEach((part, index) => {
    if (index) line.append(document.createTextNode(" · "));
    line.append(part);
  });
  return line;
}

function detailTags(session, language, t) {
  const tags = el("ul", { class: "tags detail-tags" });
  if (session.stream) tags.append(streamTag(session.stream));
  for (const topic of session.specialTopics) tags.append(el("li", { class: "tag tag-special", text: topic, lang: "en", translate: "yes" }));
  if (session.type) tags.append(el("li", { class: "tag", text: session.type, lang: "en", translate: "yes" }));
  if (session.format) tags.append(el("li", { class: "tag", text: session.format, lang: "en", translate: "yes" }));
  if (session.subtopic) tags.append(el("li", { class: "tag tag-subtopic", text: session.subtopic, lang: "en", translate: "yes" }));
  if (session.language) tags.append(el("li", { class: "tag tag-language", text: translateSessionLanguage(session.language, language), lang: language, translate: "no" }));
  if (session.duration) tags.append(el("li", { class: "tag", text: formatDuration(session.duration, t), lang: language, translate: "no" }));
  return tags;
}

function actionRow(session, { t, saved, onToggleSave, pageUrl }) {
  const row = el("div", { class: "dialog-actions dialog-footer" });
  row.append(el("button", {
    type: "button",
    class: saved ? "secondary-button" : "primary-button",
    text: saved ? t("removeAgenda") : t("addAgenda"),
    translate: "no",
    onClick: () => onToggleSave(session.id),
  }));

  if (canExport(session)) {
    const menu = el("details", { class: "calendar-menu" });
    const summary = el("summary", { class: "secondary-button", text: t("addCalendar"), translate: "no" });
    const choices = el("div", { class: "calendar-choices" });
    choices.append(el("a", {
      href: googleCalendarUrl(session, pageUrl),
      target: "_blank",
      rel: "noopener noreferrer",
      text: t("googleCalendar"),
      translate: "no",
    }));
    choices.append(el("button", {
      type: "button",
      text: t("downloadIcs"),
      translate: "no",
      onClick: () => downloadIcs(session, pageUrl),
    }));
    menu.append(summary, choices);
    row.append(menu);
  } else {
    row.append(el("p", { class: "hint", text: t("noTimeForCalendar"), translate: "no" }));
  }

  row.append(el("button", {
    type: "button",
    class: "text-button",
    text: t("copyLink"),
    translate: "no",
    onClick: (event) => copyLink(pageUrl, event.currentTarget, t),
  }));
  return row;
}

async function copyLink(pageUrl, button, t) {
  try {
    await navigator.clipboard.writeText(pageUrl);
    const original = button.textContent;
    button.textContent = t("linkCopied");
    window.setTimeout(() => {
      button.textContent = original;
    }, 2000);
  } catch {
    const field = el("input", { class: "link-fallback", readonly: "readonly", value: pageUrl, "aria-label": t("copyLink") });
    button.after(field);
    field.focus();
    field.select();
  }
}

function leadershipBlock(session, language, t, query) {
  const { chairs, moderators } = collectLeadership(session);
  if (!chairs.length && !moderators.length) return document.createDocumentFragment();
  const section = el("section", { class: `leadership${chairs.length && moderators.length ? " has-both" : ""}` });
  if (chairs.length) section.append(leaderGroup(chairs, t("roleChair"), t("roleChairs"), language, query));
  if (moderators.length) section.append(leaderGroup(moderators, t("roleModerator"), t("roleModerators"), language, query));
  return section;
}

function leaderGroup(people, singular, plural, language, query) {
  const group = el("div", { class: "leader-group" });
  group.append(el("h3", { text: people.length > 1 ? plural : singular, lang: language, translate: "no" }));
  const list = el("ul", { class: "leaders" });
  for (const person of people) {
    const item = el("li", { class: "leader" });
    const name = el("span", { class: "person-name", translate: "no" });
    fillHighlighted(name, person.name, query);
    item.append(name);
    const affiliation = formatAffiliation(person);
    if (affiliation) item.append(el("span", { class: "person-aff", text: affiliation, lang: "en", translate: "yes" }));
    list.append(item);
  }
  group.append(list);
  return group;
}

function collectLeadership(session) {
  const chairs = [];
  const moderators = [];
  const seen = new Set();
  const add = (person) => {
    const kind = roleKind(person.role);
    if (kind !== "chair" && kind !== "moderator") return;
    const key = `${kind}|${fold(person.name)}`;
    if (seen.has(key)) return;
    seen.add(key);
    (kind === "chair" ? chairs : moderators).push(person);
  };
  for (const person of session.people || []) add(person);
  for (const item of session.agenda || []) {
    for (const person of item.people || []) add(person);
  }
  return { chairs, moderators };
}

function programmeBlock(session, language, contentLang, t, query) {
  const fragment = document.createDocumentFragment();
  const timed = [];
  const untimed = [];
  for (const item of session.agenda || []) {
    if (item.startMinutes == null && !item.start) untimed.push(item);
    else timed.push(item);
  }
  timed.sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0) || (a.order ?? 999) - (b.order ?? 999));
  if (timed.length) fragment.append(el("h3", { text: t("runningOrder"), lang: language, translate: "no" }), activityList(timed, language, contentLang, query, true));
  if (untimed.length) fragment.append(el("h3", { text: t("untimedHeading"), lang: language, translate: "no" }), activityList(untimed, language, contentLang, query, false));
  return fragment;
}

function activityList(items, language, contentLang, query, showTime) {
  const list = el("ol", { class: "agenda" });
  for (const item of items) {
    const title = localContent(item.title, language);
    const titleNode = el("p", { class: "agenda-title", lang: contentLang, translate: "yes" });
    if (title) fillHighlighted(titleNode, title, query);
    const timeLabel = activityTime(item);
    const row = el("li", {
      class: `agenda-item-row${showTime && timeLabel ? " has-time" : ""}`,
      "data-activity-id": item.id || "",
    },
      showTime && timeLabel ? el("p", { class: "agenda-time", text: timeLabel }) : null,
      item.type && fold(item.type) !== fold(title) ? el("p", { class: "agenda-type", text: item.type, lang: "en", translate: "yes" }) : null,
      title ? titleNode : null,
      item.people?.length ? activityPeople(item.people, language, query) : null,
    );
    list.append(row);
  }
  return list;
}

function activityTime(item) {
  if (item.start && item.end) return `${item.start}–${item.end}`;
  return item.start || item.end || "";
}

function annotateSearchTarget(dialog, session, query) {
  const hit = explainMatch(session, query).hits[0];
  if (!hit) return;
  let target = null;
  if (hit.kind === "person") {
    const name = fold(hit.name);
    const leader = roleKind(hit.role) === "chair" || roleKind(hit.role) === "moderator";
    if (leader) {
      target = [...dialog.querySelectorAll(".leader .person-name")].find((node) => fold(node.textContent) === name);
    }
    if (!target && hit.activityTitle) {
      target = [...dialog.querySelectorAll(".agenda-item-row")].find((row) => fold(row.querySelector(".agenda-title")?.textContent) === fold(hit.activityTitle));
    }
    if (!target) {
      target = [...dialog.querySelectorAll(".person-name")].find((node) => fold(node.textContent) === name);
    }
  } else if (hit.kind === "activity") {
    target = [...dialog.querySelectorAll(".agenda-title")].find((node) => fold(node.textContent) === fold(hit.text));
  } else if (hit.kind === "description") {
    target = [...dialog.querySelectorAll(".dialog-body > p")].find((node) => node.querySelector("mark.search-hit") && !node.classList.contains("when-line") && !node.classList.contains("host-line"));
  } else if (hit.kind === "host") {
    target = dialog.querySelector(".host-line");
  } else if (hit.kind === "room") {
    target = dialog.querySelector(".when-line");
  } else if (hit.kind === "stream" || hit.kind === "topic" || hit.kind === "type" || hit.kind === "subtopic") {
    target = [...dialog.querySelectorAll(".detail-tags .tag")].find((node) => fold(node.textContent).includes(fold(hit.text)));
  }
  target?.setAttribute("data-search-target", "true");
}

function activityPeople(people, language, query) {
  const groups = new Map();
  for (const person of people) {
    const key = fold(person.role) || "participant";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(person);
  }
  const wrap = el("div", { class: "activity-people" });
  for (const list of groups.values()) {
    const line = el("p", { class: "agenda-person" });
    const label = roleLabel(list[0].role, list.length, language);
    if (label) line.append(el("span", { class: "person-role", text: `${label}:`, lang: language, translate: "no" }), document.createTextNode(" "));
    list.forEach((person, index) => {
      if (index) line.append(document.createTextNode(", "));
      const name = el("span", { class: "person-name", translate: "no" });
      fillHighlighted(name, person.name, query);
      line.append(name);
      const affiliation = formatAffiliation(person);
      if (affiliation) line.append(document.createTextNode(" "), el("span", { class: "person-aff", text: affiliation, lang: "en", translate: "yes" }));
    });
    wrap.append(line);
  }
  return wrap;
}

function formatAffiliation(person) {
  if (person.affiliation && person.country && !fold(person.affiliation).includes(fold(person.country))) {
    return `${person.affiliation} · ${person.country}`;
  }
  return person.affiliation || person.country || "";
}

function formatDuration(minutes, t) {
  if (minutes < 60) return t("minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? t("hours", { hours, minutes: rest }) : t("hoursOnly", { hours });
}
