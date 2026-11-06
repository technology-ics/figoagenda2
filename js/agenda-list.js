import { localContent, roleKind, sourceLanguage, translateSessionLanguage } from "./translations.js";
import { explainMatch, highlightRanges } from "./search.js";
import { el, formatIsoDate } from "./utils.js";
import { streamStyle } from "./data-model.js";

export function renderList(container, sessions, options) {
  if (options.ranked) {
    const list = el("div", { class: "session-list" });
    for (const session of sessions) list.append(createSessionCard(session, { ...options, showDate: true }));
    container.append(list);
    return;
  }
  const groups = new Map();
  const undated = [];
  for (const session of sessions) {
    if (!session.date) {
      undated.push(session);
      continue;
    }
    if (!groups.has(session.date)) groups.set(session.date, []);
    groups.get(session.date).push(session);
  }

  for (const date of [...groups.keys()].sort()) {
    container.append(renderGroup(date, groups.get(date), options));
  }
  if (undated.length) container.append(renderGroup("", undated, options));
}

function renderGroup(date, sessions, options) {
  const { language, t } = options;
  const section = el("section", { class: "day-block" });
  const heading = date
    ? formatIsoDate(date, language, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : t("timeUnavailable");
  const dayHeading = el("h2", { class: "day-heading", text: heading, lang: language, translate: "no" });
  section.append(dayHeading);
  const list = el("div", { class: "session-list" });
  for (const session of sessions) list.append(createSessionCard(session, options));
  section.append(list);
  return section;
}

export function createSessionCard(session, options) {
  const { language, t, selectedId, onSelect } = options;
  const saved = options.saved ?? options.savedIds?.includes(session.id);
  const title = localContent(session.title, language) || session.id;
  const selected = session.id === selectedId;
  const article = el("article", {
    class: `session-card${selected ? " is-selected" : ""}`,
    "data-session-id": session.id,
  });
  article.style.borderLeftColor = streamStyle(session.stream).colour;

  const time = el("div", { class: "card-time" });
  if (session.start && session.end) {
    time.append(el("p", { class: "card-hours", text: `${session.start}–${session.end}` }));
  } else {
    time.append(el("p", { class: "card-hours", text: t("timeUnavailable") }));
  }
  if (session.room) {
    time.append(el("p", { class: "card-room", text: session.room, lang: "en", translate: "yes" }));
  }
  if (options.showDate && session.date) {
    time.append(el("p", { class: "card-day", text: formatIsoDate(session.date, language, { weekday: "short", day: "numeric", month: "short" }) }));
  }

  const body = el("div", { class: "card-body" });
  const dateLabel = session.date
    ? formatIsoDate(session.date, language, { weekday: "long", day: "numeric", month: "long" })
    : "";
  const matchText = matchSummary(session, options);
  const button = el("button", {
    type: "button",
    class: "card-title",
    "data-session-id": session.id,
    "aria-label": [title, dateLabel, session.start && session.end ? `${session.start}–${session.end}` : "", session.room, session.stream, matchText].filter(Boolean).join(". "),
    onClick: () => onSelect(session.id),
  });
  const titleNode = el("span", { lang: sourceLanguage(session.language), translate: "yes" });
  fillHighlighted(titleNode, title, options.query || "");
  button.append(titleNode);
  if (selected) button.setAttribute("aria-current", "true");
  body.append(button);

  if (session.hostOrganisation) {
    const hostName = el("span", { lang: "en", translate: "yes" });
    fillHighlighted(hostName, session.hostOrganisation, options.query || "");
    body.append(el("p", { class: "card-host" },
      el("span", { class: "meta-label", text: t("hostOrganisation"), lang: language, translate: "no" }),
      document.createTextNode(" "),
      hostName,
    ));
  }

  const tags = el("ul", { class: "tags" });
  if (session.stream) tags.append(streamTag(session.stream));
  if (session.type) tags.append(sourceTag(session.type));
  for (const topic of session.specialTopics) tags.append(sourceTag(topic, "tag-special"));
  if (session.language) tags.append(el("li", { class: "tag tag-language", text: translateSessionLanguage(session.language, language), lang: language, translate: "no" }));
  if (saved) tags.append(el("li", { class: "tag tag-saved", text: t("saved"), lang: language, translate: "no" }));
  if (tags.childElementCount) body.append(tags);
  const notes = matchNotes(session, options);
  if (notes) body.append(notes);

  article.append(time, body);
  return article;
}

export function fillHighlighted(node, text, query) {
  const source = String(text || "");
  const ranges = highlightRanges(source, query || "");
  if (!ranges.length) {
    node.append(document.createTextNode(source));
    return;
  }
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) node.append(document.createTextNode(source.slice(cursor, start)));
    node.append(el("mark", { class: "search-hit", text: source.slice(start, end) }));
    cursor = end;
  }
  if (cursor < source.length) node.append(document.createTextNode(source.slice(cursor)));
}

function matchSummary(session, options) {
  if (!options.query?.trim() || !options.t) return "";
  return explainMatch(session, options.query).hits.map((hit) => describeHit(hit, options.t)).join(". ");
}

function matchNotes(session, options) {
  if (!options.query?.trim() || !options.t) return null;
  const { hits } = explainMatch(session, options.query);
  if (!hits.length) return null;
  const list = el("ul", { class: "match-notes" });
  for (const hit of hits) list.append(renderHit(session, hit, options));
  return list;
}

function renderHit(session, hit, options) {
  const item = el("li");
  if (hit.kind === "person") {
    item.append(matchLine(personMatchLabel(hit.role, options.t), hit.name, options.query, { names: true }));
    if (hit.activityTitle) {
      const when = hit.activityStart && hit.activityEnd ? `${hit.activityStart}–${hit.activityEnd}` : hit.activityStart || "";
      const detail = [when, hit.activityTitle].filter(Boolean).join(" · ");
      item.append(matchLine(options.t("presentation"), detail, options.query, { lang: sourceLanguage(session.language) }));
    }
    return item;
  }
  if (hit.kind === "activity") {
    const when = hit.start && hit.end ? `${hit.start}–${hit.end}` : hit.start || "";
    const detail = [when, hit.text].filter(Boolean).join(" · ");
    item.append(matchLine(options.t("matchedPresentation"), detail, options.query, { lang: "en" }));
    return item;
  }
  const label = fieldMatchLabel(hit.kind, options.t);
  if (label && hit.text) {
    item.append(matchLine(label, hit.text, options.query, { lang: hit.kind === "description" ? sourceLanguage(session.language) : "en" }));
  }
  return item;
}

function matchLine(label, value, query, { names = false, lang = "en" } = {}) {
  const line = el("p", { class: "match-line" });
  line.append(el("span", { class: "match-label", text: `${label}:` }), document.createTextNode(" "));
  const detail = el("span", { class: "match-detail" });
  if (names) detail.setAttribute("translate", "no");
  else {
    detail.lang = lang;
    detail.setAttribute("translate", "yes");
  }
  fillHighlighted(detail, value, query);
  line.append(detail);
  return line;
}

function personMatchLabel(role, t) {
  const kind = roleKind(role);
  if (kind === "chair") return t("matchedChair");
  if (kind === "moderator") return t("matchedModerator");
  if (kind === "panelist") return t("matchedPanelist");
  if (kind === "speaker") return t("matchedSpeaker");
  return t("matchedPerson");
}

function fieldMatchLabel(kind, t) {
  if (kind === "host") return t("matchedHost");
  if (kind === "room") return t("matchedRoom");
  if (kind === "stream") return t("matchedStream");
  if (kind === "topic") return t("matchedTopic");
  if (kind === "type") return t("matchedType");
  if (kind === "subtopic") return t("matchedSubtopic");
  if (kind === "description") return t("matchedDescription");
  return "";
}

function describeHit(hit, t) {
  if (hit.kind === "person") {
    const parts = [`${personMatchLabel(hit.role, t)}: ${hit.name}`];
    if (hit.activityTitle) {
      const when = hit.activityStart && hit.activityEnd ? `${hit.activityStart}–${hit.activityEnd}` : "";
      parts.push(`${t("presentation")}: ${[when, hit.activityTitle].filter(Boolean).join(" ")}`);
    }
    return parts.join(". ");
  }
  if (hit.kind === "activity") {
    const when = hit.start && hit.end ? `${hit.start}–${hit.end}` : "";
    return `${t("matchedPresentation")}: ${[when, hit.text].filter(Boolean).join(" ")}`;
  }
  const label = fieldMatchLabel(hit.kind, t);
  return label && hit.text ? `${label}: ${hit.text}` : "";
}

export function streamTag(stream) {
  const style = streamStyle(stream);
  const item = el("li", { class: "tag tag-stream" });
  item.style.backgroundColor = style.tint || "#F7F8FA";
  item.style.color = style.colour;
  item.style.borderColor = style.colour;
  item.append(
    el("span", { class: "tag-code", text: style.code, translate: "no" }),
    el("span", { text: stream, lang: "en", translate: "yes" }),
  );
  return item;
}

function sourceTag(text, className = "") {
  return el("li", { class: `tag ${className}`.trim(), text, lang: "en", translate: "yes" });
}
