import { CONFIG } from "./config.js";
import { fold, normalizeApostrophe, unique } from "./utils.js";

/**
 * Future ePoster record. Fields stay empty when the published sheet does not provide them.
 * id, number, title, stream, specialTopics, presentingAuthors, coAuthors, affiliations,
 * abstract, imageUrl, pdfUrl, schedule.
 *
 * An individual ePoster is a presentation whose type explicitly says ePoster and whose
 * session stream is one of the seven scientific streams. Scheduled ePoster-hall sessions
 * stay in the scientific programme. They are not copied into this list.
 *
 * The November 2026 preview sheet has five "ePoster display" sessions in the ePoster
 * display area (Cross-stream showcases, 09:00–17:00) and 50 child rows typed
 * "ePoster (display only)". Those rows have no presentation start or end, and the
 * session stream is Cross-stream. They are display items inside a showcase, not a
 * catalogue organised by the seven streams. This adapter does not invent a stream
 * for them, so the ePoster section stays empty until a recognised stream is published.
 */

/** The seven scientific streams, in programme order. Cross-stream is intentionally absent. */
export const SCIENTIFIC_STREAMS = Object.keys(CONFIG.streams).filter((name) => name !== "Cross-stream");

export function collectSessionEposters(session) {
  const stream = recognisedStream(session.stream);
  if (!stream || !session.presentations) return [];
  const posters = [];
  for (const presentation of session.presentations.values()) {
    if (!isEposterType(presentation.type)) continue;
    if (!presentation.title?.source?.trim()) continue;
    const { presentingAuthors, coAuthors } = authorParts(presentation.people);
    const people = [...presentingAuthors, ...coAuthors];
    posters.push({
      id: presentation.id,
      number: presentation.number || "",
      title: presentation.title,
      stream,
      specialTopics: unique(presentation.specialTopics || []),
      presentingAuthors,
      coAuthors,
      affiliations: affiliationLines(people),
      abstract: presentation.abstract?.source ? presentation.abstract : { source: "" },
      imageUrl: presentation.imageUrl || "",
      pdfUrl: presentation.pdfUrl || "",
      schedule: presentation.start && presentation.end
        ? {
          date: session.date || "",
          start: presentation.start,
          end: presentation.end,
          room: session.room || "",
        }
        : null,
    });
  }
  return posters;
}

export function sortEposters(posters) {
  return [...posters].sort((a, b) => {
    const streamCompare = streamRank(a.stream) - streamRank(b.stream);
    if (streamCompare) return streamCompare;
    if (a.number && b.number) {
      const numberCompare = a.number.localeCompare(b.number, undefined, { numeric: true });
      if (numberCompare) return numberCompare;
    }
    return (a.title.source || "").localeCompare(b.title.source || "");
  });
}

export function eposterStreams(posters) {
  const present = new Set(posters.map((poster) => poster.stream));
  return SCIENTIFIC_STREAMS.filter((name) => present.has(name));
}

/** Title, number, author and affiliation search. Session search is separate. */
export function eposterMatches(poster, query) {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = fold([
    poster.number,
    poster.title?.source,
    ...Object.values(poster.title || {}),
    poster.abstract?.source,
    ...poster.presentingAuthors.flatMap((person) => [person.name, person.affiliation, person.country]),
    ...poster.coAuthors.flatMap((person) => [person.name, person.affiliation, person.country]),
    ...poster.affiliations,
  ].filter(Boolean).join(" "));
  return tokens.every((token) => haystack.includes(token));
}

export function externalUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    /* Leave non-web values unused rather than building a broken link. */
  }
  return "";
}

function recognisedStream(stream) {
  const name = normalizeApostrophe(stream);
  return SCIENTIFIC_STREAMS.includes(name) ? name : "";
}

function isEposterType(type) {
  const value = fold(type).replace(/-/g, " ");
  return value.includes("eposter") || value.includes("e poster");
}

function streamRank(stream) {
  const index = SCIENTIFIC_STREAMS.indexOf(stream);
  return index === -1 ? 1000 : index;
}

function authorParts(people) {
  const named = (people || []).filter((person) => person.name);
  const presenting = named.filter((person) => fold(person.role).includes("presenting"));
  const speakers = named.filter((person) => {
    const role = fold(person.role);
    return role === "speaker" || role === "author";
  });
  const primary = presenting.length ? presenting : speakers.slice(0, 1);
  const chosen = primary.length ? primary : named.slice(0, 1);
  const chosenKeys = new Set(chosen.map((person) => person.key || person.name));
  const coAuthors = named.filter((person) => !chosenKeys.has(person.key || person.name));
  return { presentingAuthors: chosen, coAuthors };
}

function affiliationLines(people) {
  const lines = [];
  const seen = new Set();
  for (const person of people) {
    const line = [person.affiliation, person.country].filter(Boolean).join(", ");
    const key = fold(line);
    if (!line || seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return lines;
}
