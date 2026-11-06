/**
 * Central settings for the FIGO Montréal 2027 scientific programme.
 * Change the published CSV, languages, preview notice and stream colours here.
 */

export const CONFIG = {
  csvUrl:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHRFgoJ7XnXEHWr2QxXizcrZ3QrhxyT0_0ayPBEAop9AOR5VtvSlacJZQ8IyQiVhHg77XNYIdsXm1x/pub?gid=2006492705&single=true&output=csv",

  defaultLanguage: "en-GB",
  languages: [
    { id: "en-GB", label: "English" },
    { id: "fr", label: "Français" },
    { id: "es", label: "Español" },
  ],

  timeZone: "America/Montreal",
  congressStart: "2027-10-31",
  congressEnd: "2027-11-05",

  /** Set to false when the published sheet contains the approved programme. */
  previewNotice: true,

  /** Vertical scale of the calendar. 1.4px per minute keeps a 60-minute session readable. */
  pixelsPerMinute: 1.4,

  storageKeys: {
    language: "figo2027.language",
    view: "figo2027.viewChoice",
    agenda: "figo2027.agenda",
    cache: "figo2027.csvCache",
  },

  weekAtAGlanceUrl: "https://congress.figo.org/week-at-a-glance/",

  /**
   * Muted stream colours for accents and small tags. Tints are calendar and tag backgrounds.
   * Codes are shown as text so stream identity is not conveyed by colour alone.
   * Cross-stream is included because the published sheet uses it as well as the seven streams.
   */
  streams: {
    "Maternal fetal medicine": { colour: "#16356F", tint: "#DCE6F5", code: "MFM" },
    "Clinical obstetrics": { colour: "#0C5C64", tint: "#D7EFEC", code: "OBS" },
    Gynaecology: { colour: "#A11915", tint: "#F6E4E2", code: "GYN" },
    "Sexual and reproductive health and rights": { colour: "#534484", tint: "#E6E0F4", code: "SRH" },
    "Reproductive medicine": { colour: "#7A4E22", tint: "#F3E6D4", code: "REP" },
    "Women's cancer": { colour: "#8A345C", tint: "#F6E3EC", code: "CAN" },
    Endocrinology: { colour: "#345638", tint: "#DEEADF", code: "END" },
    "Cross-stream": { colour: "#4E5968", tint: "#E6E8EC", code: "CRS" },
  },

  fallbackStream: { colour: "#4E5968", tint: "#E6E8EC", code: "—" },

  /**
   * Special topics found in the published sheet. Soft fills with dark text.
   * These are separate from scientific streams. Unknown future topics use fallbackTopic.
   */
  topicColours: {
    Obesity: { colour: "#6E4C08", tint: "#F6E6C0" },
    Anaemia: { colour: "#7A3A32", tint: "#F6D8D1" },
    "FemTech: digital health and AI": { colour: "#1A4F6E", tint: "#D7E7F3" },
    Pain: { colour: "#3E4654", tint: "#E4E1DA" },
    "Advocacy and health systems strengthening": { colour: "#2C4A32", tint: "#D9E6D2" },
  },

  fallbackTopic: { colour: "#3E4654", tint: "#E7E2DA" },

  /** Preferred room order. Rooms not listed are shown afterwards, alphabetically. */
  roomOrder: [
    "Plenary hall",
    "Parallel room A",
    "Parallel room B",
    "Parallel room C",
    "Parallel room D",
    "Parallel room E",
    "Parallel room F",
    "Skills lab room 1",
    "Skills lab room 2",
    "Workshop room 1",
    "Workshop room 2",
    "Workshop room 3",
    "Workshop room 4",
    "Workshop room 5",
    "Workshop room 6",
    "ePoster display area",
  ],
};

export const HEADER_ALIASES = {
  sessionNumber: ["session number"],
  sessionId: ["session id"],
  sessionTitle: ["session title"],
  sessionType: ["session type"],
  sessionFormat: ["session format"],
  sessionFormatNotes: ["session format notes"],
  stream: ["stream"],
  subtopic: ["subtopic", "sub topic"],
  specialTopics: ["special topics", "special topic"],
  sessionLanguage: ["session language"],
  sessionDescription: ["session description"],
  date: ["date"],
  sessionStart: ["session start"],
  sessionEnd: ["session end"],
  sessionDuration: ["session duration (min)", "session duration"],
  room: ["room"],
  parallelBlock: ["parallel block"],
  timeZone: ["event time zone", "time zone", "timezone"],
  presentationNumber: ["presentation number"],
  presentationId: ["presentation id"],
  presentationTitle: ["presentation title"],
  presentationType: ["presentation type"],
  presentationOrder: ["presentation order"],
  presentationTopic: ["presentation topic"],
  presentationLength: ["presentation length"],
  presentationStart: ["presentation start"],
  presentationEnd: ["presentation end"],
  segmentNumber: ["segment number"],
  segmentId: ["segment id"],
  segmentType: ["segment type"],
  segmentTitle: ["segment title"],
  agendaStart: ["agenda start"],
  agendaEnd: ["agenda end"],
  agendaDuration: ["agenda duration (min)", "agenda duration"],
  personalTitle: ["personal title"],
  firstName: ["first name"],
  lastName: ["last name"],
  role: ["role"],
  affiliation: ["author affiliation name", "affiliation", "author affiliation"],
  affiliationCountry: ["affiliation country"],
  notes: ["notes"],
  hostOrganisation: [
    "host organisation",
    "host organization",
    "hosting organisation",
    "hosting organization",
    "host",
  ],
};

/** Optional columns for a later speaker-profile release. Absence is not a data error. */
export const OPTIONAL_HEADER_ALIASES = {
  speakerId: ["speaker id", "person id", "participant id"],
  biography: ["biography", "bio", "speaker biography"],
  headshotUrl: ["headshot url", "headshot", "photo url", "photo"],
};

/** Language suffixes recognised on translated scientific columns, for example "Session Title (fr)". */
export const TRANSLATION_SUFFIXES = {
  fr: ["(fr)", "[fr]", "- fr"],
  es: ["(es)", "[es]", "- es"],
  "en-GB": ["(en)", "(en-gb)", "[en]"],
};
