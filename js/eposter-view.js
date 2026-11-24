import { streamTag, topicTag, fillHighlighted } from "./agenda-list.js";
import { eposterStreams, externalUrl } from "./eposter.js";
import { streamStyle } from "./data-model.js";
import { localContent, sourceLanguage } from "./translations.js";
import { el, formatIsoDate } from "./utils.js";

export function renderEposterSection(container, posters, catalogue, options) {
  const { language, t, query, stream, onSelect, onStream, selectedId } = options;
  const section = el("section", { class: "eposter-section", "aria-labelledby": "eposter-heading" });

  if (!catalogue.length) {
    section.classList.add("empty-state", "eposter-empty");
    section.append(
      el("h2", { id: "eposter-heading", text: t("eposterPresentations"), lang: language, translate: "no" }),
      el("p", { text: t("eposterComingSoon"), lang: language, translate: "no" }),
      el("p", { text: t("eposterComingSoonHint"), lang: language, translate: "no" }),
    );
    container.append(section);
    return;
  }

  section.append(el("h2", { id: "eposter-heading", text: t("eposterPresentations"), lang: language, translate: "no" }));
  section.append(streamBar(catalogue, stream, { language, t, onStream }));

  if (!posters.length) {
    section.append(el("p", { class: "empty-state", text: t("noEposterMatches"), lang: language, translate: "no" }));
    container.append(section);
    return;
  }

  const list = el("div", { class: "eposter-list" });
  for (const poster of posters) list.append(eposterCard(poster, { language, t, query, selectedId, onSelect }));
  section.append(list);
  container.append(section);
}

export function renderEposterDialog(dialog, poster, options) {
  const { language, t, query = "" } = options;
  const title = localContent(poster.title, language) || poster.number || poster.id;
  dialog.dataset.kind = "eposter";
  dialog.replaceChildren();

  const header = el("div", { class: "dialog-header" });
  header.append(el("button", {
    type: "button",
    class: "dialog-close text-button",
    text: t("close"),
    translate: "no",
    "aria-label": t("closeEposter"),
    onClick: () => dialog.close(),
  }));
  const heading = el("h2", { id: "dialog-title", lang: "en", translate: "yes", tabindex: "-1" });
  fillHighlighted(heading, title, query);
  header.append(heading);
  if (options.onPrevious || options.onNext) header.append(stepNav(t, options));
  dialog.append(header);

  const body = el("div", { class: "dialog-body" });
  if (poster.number) {
    body.append(el("p", { class: "eposter-number", text: t("eposterNumber", { number: poster.number }), lang: language, translate: "no" }));
  }
  const when = scheduleLine(poster, language, t);
  if (when) body.append(when);

  const tags = el("ul", { class: "tags detail-tags" });
  if (poster.stream) tags.append(streamTag(poster.stream, filterAction(t, options.onFilterStream, poster.stream)));
  for (const topic of poster.specialTopics) tags.append(topicTag(topic));
  if (tags.childElementCount) body.append(tags);

  appendPeople(body, poster.presentingAuthors, poster.presentingAuthors.length > 1 ? t("presentingAuthors") : t("presentingAuthor"), language);
  appendPeople(body, poster.coAuthors, poster.coAuthors.length > 1 ? t("coAuthors") : t("coAuthor"), language);
  if (poster.affiliations.length) {
    body.append(el("h3", { text: t("affiliations"), lang: language, translate: "no" }));
    const list = el("ul", { class: "plain-list" });
    for (const line of poster.affiliations) list.append(el("li", { text: line, lang: "en", translate: "yes" }));
    body.append(list);
  }

  const abstract = localContent(poster.abstract, language);
  if (abstract) {
    body.append(el("h3", { text: t("abstract"), lang: language, translate: "no" }));
    for (const paragraph of abstract.split(/\n+/)) {
      const text = paragraph.trim();
      if (!text) continue;
      const copy = el("p", { lang: "en", translate: "yes" });
      fillHighlighted(copy, text, query);
      body.append(copy);
    }
  }

  const links = linkRow(poster, language, t);
  if (links) body.append(links);
  dialog.append(body);
}

function streamBar(catalogue, selected, { language, t, onStream }) {
  const bar = el("div", { class: "eposter-tools", role: "group", "aria-label": t("filterStream") });
  bar.append(streamButton(t("allStreams"), selected === "all", () => onStream("all"), language));
  for (const name of eposterStreams(catalogue)) {
    bar.append(streamButton(name, selected === name, () => onStream(name), "en", true));
  }
  return bar;
}

function streamButton(label, pressed, onClick, language, withColour = false) {
  const button = el("button", {
    type: "button",
    class: "eposter-stream-button",
    "aria-pressed": pressed ? "true" : "false",
    lang: language,
    translate: language === "en" ? "yes" : "no",
    onClick,
  });
  if (withColour) {
    const dot = el("span", { class: "stream-dot", "aria-hidden": "true" });
    dot.style.backgroundColor = streamStyle(label).colour;
    button.append(dot);
  }
  button.append(el("span", { text: label }));
  return button;
}

function eposterCard(poster, { language, t, query, selectedId, onSelect }) {
  const title = localContent(poster.title, language) || poster.number || poster.id;
  const authors = [...poster.presentingAuthors, ...poster.coAuthors].map((person) => person.name).filter(Boolean);
  const button = el("button", {
    type: "button",
    class: `eposter-card${poster.id === selectedId ? " is-selected" : ""}`,
    "data-eposter-id": poster.id,
    "aria-label": [title, poster.stream, authors.join(", ")].filter(Boolean).join(". "),
    onClick: () => onSelect(poster.id),
  });
  if (poster.id === selectedId) button.setAttribute("aria-current", "true");
  button.style.borderLeftColor = streamStyle(poster.stream).colour;
  const heading = el("span", { class: "eposter-title", lang: sourceLanguage(), translate: "yes" });
  fillHighlighted(heading, title, query);
  button.append(heading);
  if (authors.length) {
    button.append(el("span", { class: "eposter-authors", text: authors.join(", "), lang: "en", translate: "yes" }));
  }
  const stream = el("span", { class: "eposter-stream" });
  const dot = el("span", { class: "stream-dot", "aria-hidden": "true" });
  dot.style.backgroundColor = streamStyle(poster.stream).colour;
  stream.append(dot, el("span", { text: poster.stream, lang: "en", translate: "yes" }));
  button.append(stream);
  return button;
}

function stepNav(t, { onPrevious, onNext, hasPrevious, hasNext }) {
  const nav = el("div", { class: "session-nav" });
  nav.append(el("button", {
    type: "button",
    class: "text-button",
    text: t("previousEposter"),
    translate: "no",
    disabled: !hasPrevious,
    onClick: onPrevious,
  }));
  nav.append(el("button", {
    type: "button",
    class: "text-button",
    text: t("nextEposter"),
    translate: "no",
    disabled: !hasNext,
    onClick: onNext,
  }));
  return nav;
}

function filterAction(t, handler, name) {
  if (!handler) return null;
  return { label: t("filterBy", { name }), onClick: () => handler(name) };
}

function scheduleLine(poster, language, t) {
  const schedule = poster.schedule;
  if (!schedule?.start || !schedule?.end) return null;
  const line = el("p", { class: "when-line" });
  const parts = [];
  if (schedule.date) {
    parts.push(el("span", {
      text: formatIsoDate(schedule.date, language, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      lang: language,
      translate: "no",
    }));
  }
  parts.push(el("span", { text: `${schedule.start}–${schedule.end}` }));
  parts.push(el("span", { class: "when-zone", text: t("montrealTime"), lang: language, translate: "no" }));
  if (schedule.room) parts.push(el("span", { text: schedule.room, lang: "en", translate: "yes" }));
  parts.forEach((part, index) => {
    if (index) line.append(document.createTextNode(" · "));
    line.append(part);
  });
  return line;
}

function appendPeople(body, people, label, language) {
  if (!people.length) return;
  body.append(el("h3", { text: label, lang: language, translate: "no" }));
  const list = el("ul", { class: "plain-list" });
  for (const person of people) {
    list.append(el("li", { class: "person-name", text: person.name, lang: "en", translate: "yes" }));
  }
  body.append(list);
}

function linkRow(poster, language, t) {
  const image = externalUrl(poster.imageUrl);
  const pdf = externalUrl(poster.pdfUrl);
  if (!image && !pdf) return null;
  const row = el("p", { class: "eposter-links" });
  if (image) {
    row.append(el("a", {
      class: "text-link",
      href: image,
      target: "_blank",
      rel: "noopener noreferrer",
      text: t("viewPoster"),
      lang: language,
      translate: "no",
    }));
  }
  if (pdf) {
    row.append(el("a", {
      class: "text-link",
      href: pdf,
      target: "_blank",
      rel: "noopener noreferrer",
      text: t("downloadPoster"),
      lang: language,
      translate: "no",
    }));
  }
  return row;
}
