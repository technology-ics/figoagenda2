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
    "Maternal fetal medicine": { colour: "#1E3A6E", tint: "#E7EDF6", code: "MFM" },
    "Clinical obstetrics": { colour: "#0F5F66", tint: "#E5F3F2", code: "OBS" },
    Gynaecology: { colour: "#A11915", tint: "#F8ECEB", code: "GYN" },
    "Sexual and reproductive health and rights": { colour: "#5B4B8A", tint: "#F0ECF6", code: "SRH" },
    "Reproductive medicine": { colour: "#8A5A28", tint: "#F6F0E7", code: "REP" },
    "Women's cancer": { colour: "#8E3D62", tint: "#F7EBF1", code: "CAN" },
    Endocrinology: { colour: "#3E6240", tint: "#EAF2EB", code: "END" },
    "Cross-stream": { colour: "#5C6778", tint: "#F1F3F6", code: "CRS" },
  },

  fallbackStream: { colour: "#5C6778", tint: "#F1F3F6", code: "—" },

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
