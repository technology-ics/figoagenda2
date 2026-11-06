import { fold } from "./utils.js";

export function searchTokens(query) {
  return fold(query).split(/\s+/).filter(Boolean);
}

/** Accent-insensitive, case-insensitive search across the prepared session text. */
export function matchesQuery(session, query) {
  const tokens = searchTokens(query);
  if (!tokens.length) return true;
  return tokens.every((token) => session.searchText.includes(token));
}

/** Character ranges in the original text that correspond to the query tokens. */
export function highlightRanges(text, query) {
  const tokens = searchTokens(query);
  const source = String(text || "");
  if (!tokens.length || !source) return [];
  const map = [];
  let folded = "";
  for (let index = 0; index < source.length; index += 1) {
    const piece = fold(source[index]);
    for (let offset = 0; offset < piece.length; offset += 1) {
      folded += piece[offset];
      map.push(index);
    }
  }
  const ranges = [];
  for (const token of tokens) {
    let from = 0;
    while (from < folded.length) {
      const at = folded.indexOf(token, from);
      if (at === -1) break;
      ranges.push([map[at], map[at + token.length - 1] + 1]);
      from = at + Math.max(token.length, 1);
    }
  }
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const range of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

export function excerptAround(text, query) {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  const ranges = highlightRanges(source, query);
  if (!ranges.length) return source.slice(0, 160);
  const start = Math.max(0, ranges[0][0] - 48);
  const end = Math.min(source.length, ranges[0][1] + 90);
  const slice = source.slice(start, end).trim();
  return `${start ? "…" : ""}${slice}${end < source.length ? "…" : ""}`;
}

function hasAll(text, tokens) {
  const folded = fold(text);
  return tokens.every((token) => folded.includes(token));
}

function hasPhrase(text, query) {
  const phrase = fold(query).trim();
  return Boolean(phrase) && fold(text).includes(phrase);
}

function hitPriority(hit) {
  if (hit.kind === "title" && hit.exact) return 1;
  if (hit.kind === "person" && hit.exact) return 2;
  if (hit.kind === "activity") return hit.partial ? 4 : 3;
  if (hit.kind === "title" || hit.kind === "person") return 4;
  if (hit.kind === "host" || hit.kind === "room") return 5;
  if (hit.kind === "stream" || hit.kind === "topic" || hit.kind === "type" || hit.kind === "subtopic") return 6;
  if (hit.kind === "description") return 7;
  return 8;
}

/**
 * Explain why a session matched, and rank it.
 * 1 exact title, 2 exact participant name, 3 presentation title,
 * 4 partial title or participant, 5 host or room, 6 stream, topic, type or subtopic,
 * 7 description.
 * Returned hits are the matches worth showing under the session title.
 * An exact title match is highlighted on the title itself, so it is not repeated.
 */
export function explainMatch(session, query) {
  const tokens = searchTokens(query);
  if (!tokens.length) return { rank: 0, hits: [] };
  const hits = [];
  const title = session.title?.source || "";
  const titleExact = fold(title) === fold(query).trim();
  if (hasAll(title, tokens)) hits.push({ kind: "title", exact: titleExact, text: title });

  const seenPeople = new Set();
  const addPerson = (person, activity) => {
    if (!person?.name) return;
    const blob = `${person.name} ${person.affiliation || ""} ${person.country || ""}`;
    if (!hasAll(blob, tokens)) return;
    const key = `${fold(person.name)}|${fold(person.role)}`;
    const exactName = hasPhrase(person.name, query) && (
      tokens.length > 1
      || fold(person.name) === fold(query).trim()
      || fold(person.lastName) === fold(query).trim()
      || fold(person.firstName) === fold(query).trim()
    );
    if (seenPeople.has(key)) {
      const existing = hits.find((hit) => hit.kind === "person" && fold(hit.name) === fold(person.name) && fold(hit.role) === fold(person.role));
      if (existing && !existing.activityTitle && activity?.title?.source) {
        existing.activityTitle = activity.title.source;
        existing.activityStart = activity.start || "";
        existing.activityEnd = activity.end || "";
      }
      return;
    }
    seenPeople.add(key);
    hits.push({
      kind: "person",
      exact: exactName,
      role: person.role || "",
      name: person.name,
      activityTitle: activity?.title?.source || "",
      activityStart: activity?.start || "",
      activityEnd: activity?.end || "",
    });
  };
  for (const person of session.people || []) addPerson(person, null);
  for (const item of session.agenda || []) {
    for (const person of item.people || []) addPerson(person, item);
  }

  const seenTitles = new Set();
  for (const item of session.agenda || []) {
    const itemTitle = item.title?.source || "";
    if (!itemTitle || !hasAll(itemTitle, tokens) || seenTitles.has(fold(itemTitle))) continue;
    seenTitles.add(fold(itemTitle));
    hits.push({
      kind: "activity",
      exact: hasPhrase(itemTitle, query),
      text: itemTitle,
      start: item.start || "",
      end: item.end || "",
      type: item.type || "",
    });
  }

  if (session.hostOrganisation && hasAll(session.hostOrganisation, tokens)) {
    hits.push({ kind: "host", text: session.hostOrganisation });
  }
  if (session.room && hasAll(session.room, tokens)) hits.push({ kind: "room", text: session.room });
  if (session.stream && hasAll(session.stream, tokens)) hits.push({ kind: "stream", text: session.stream });
  if (session.type && hasAll(session.type, tokens)) hits.push({ kind: "type", text: session.type });
  if (session.subtopic && hasAll(session.subtopic, tokens)) hits.push({ kind: "subtopic", text: session.subtopic });
  for (const topic of session.specialTopics || []) {
    if (hasAll(topic, tokens)) hits.push({ kind: "topic", text: topic });
  }
  const description = session.description?.source || "";
  if (description && hasAll(description, tokens)) {
    hits.push({ kind: "description", text: excerptAround(description, query) });
  }

  // Tokens can match different people or presentations in one session.
  // Explain those partial contributions when no single field contains the whole query.
  if (!hits.length) {
    const seenPartial = new Set();
    const addPartialPerson = (person, activity) => {
      if (!person?.name) return;
      const blob = `${person.name} ${person.affiliation || ""} ${person.country || ""}`;
      if (!tokens.some((token) => fold(blob).includes(token))) return;
      const key = `${fold(person.name)}|${fold(person.role)}`;
      if (seenPartial.has(key)) {
        const existing = hits.find((hit) => hit.kind === "person" && fold(hit.name) === fold(person.name) && fold(hit.role) === fold(person.role));
        if (existing && !existing.activityTitle && activity?.title?.source) {
          existing.activityTitle = activity.title.source;
          existing.activityStart = activity.start || "";
          existing.activityEnd = activity.end || "";
        }
        return;
      }
      seenPartial.add(key);
      hits.push({
        kind: "person",
        exact: false,
        role: person.role || "",
        name: person.name,
        activityTitle: activity?.title?.source || "",
        activityStart: activity?.start || "",
        activityEnd: activity?.end || "",
      });
    };
    for (const person of session.people || []) addPartialPerson(person, null);
    for (const item of session.agenda || []) {
      for (const person of item.people || []) addPartialPerson(person, item);
      const itemTitle = item.title?.source || "";
      if (itemTitle && tokens.some((token) => fold(itemTitle).includes(token)) && !seenPartial.has(fold(itemTitle))) {
        seenPartial.add(fold(itemTitle));
        hits.push({
          kind: "activity",
          exact: false,
          partial: true,
          text: itemTitle,
          start: item.start || "",
          end: item.end || "",
          type: item.type || "",
        });
      }
    }
    if (!hits.length && description && tokens.some((token) => fold(description).includes(token))) {
      hits.push({ kind: "description", text: excerptAround(description, query) });
    }
  }

  const ranked = hits.map((hit) => ({ ...hit, priority: hitPriority(hit) }));
  const rank = ranked.reduce((best, hit) => Math.min(best, hit.priority), 8);
  const display = ranked
    .filter((hit) => hit.priority === rank && hit.kind !== "title")
    .sort((a, b) => String(a.start || a.activityStart || "").localeCompare(String(b.start || b.activityStart || "")) || String(a.name || a.text || "").localeCompare(String(b.name || b.text || "")))
    .slice(0, 3);
  return { rank, hits: display };
}
