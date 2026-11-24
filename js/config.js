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
   * One stream colour mapping for calendar tiles, list tags and session details.
   * `colour` is the solid background. `text` is the foreground on that background.
   * `code` is kept for internal identification and is not shown in the interface.
   *
   * Every solid stream background uses white text. Measured contrast:
   * maternal fetal medicine 7.10, clinical obstetrics 6.31, gynaecology 6.45,
   * sexual and reproductive health and rights 5.49, women's cancer 6.73,
   * endocrinology 5.71.
   *
   * Reproductive medicine was #A66A2C. White text on that ochre is 4.45:1, under
   * WCAG 2.2 AA for normal text (4.5:1). It is darkened to #A5672C, one step in
   * red and three in green, which keeps the ochre and reaches 4.59:1 with white.
   *
   * Cross-stream, and any name that is not one of the seven streams, uses the
   * neutral fallback. The sheet's own stream value is used. Plenaries and ePoster
   * halls are not reclassified.
   */
  streams: {
    "Maternal fetal medicine": { colour: "#355B80", text: "#FFFFFF", tint: "#E4EAF2", code: "MFM" },
    "Clinical obstetrics": { colour: "#A43E3A", text: "#FFFFFF", tint: "#F6E8E7", code: "OBS" },
    Gynaecology: { colour: "#6C5487", text: "#FFFFFF", tint: "#EDE8F2", code: "GYN" },
    "Sexual and reproductive health and rights": { colour: "#267568", text: "#FFFFFF", tint: "#E3F1EE", code: "SRH" },
    "Reproductive medicine": { colour: "#A5672C", text: "#FFFFFF", tint: "#F8F1E6", code: "REP" },
    "Women's cancer": { colour: "#933E66", text: "#FFFFFF", tint: "#F6E8EF", code: "CAN" },
    Endocrinology: { colour: "#626B36", text: "#FFFFFF", tint: "#EEEFE4", code: "END" },
    "Cross-stream": { colour: "#4E5968", text: "#FFFFFF", tint: "#E8EAED", code: "CRS" },
  },

  fallbackStream: { colour: "#4E5968", text: "#FFFFFF", tint: "#E8EAED", code: "—" },

  /**
   * Special topics found in the published sheet. Dark text on a soft fill.
   * These are separate from scientific streams. Unknown future topics use fallbackTopic.
   *
   * Pain was #3E4654, close to the neutral Cross-stream colour. #B45328 was tested
   * and sits too near reproductive medicine (about 27 RGB units; the closest
   * existing pair in this palette is about 43). Pain uses a deeper burnt copper,
   * #9A3412, which stays in that family and clears the ochre, the deep red and anaemia.
   */
  topicColours: {
    Obesity: { colour: "#6E4C08", tint: "#F6E6C0" },
    Anaemia: { colour: "#7A3A32", tint: "#F6D8D1" },
    "FemTech: digital health and AI": { colour: "#1A4F6E", tint: "#D7E7F3" },
    Pain: { colour: "#9A3412", tint: "#F8E6DC" },
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

/** Optional columns for a later speaker-profile or ePoster release. Absence is not a data error. */
export const OPTIONAL_HEADER_ALIASES = {
  speakerId: ["speaker id", "person id", "participant id"],
  biography: ["biography", "bio", "speaker biography"],
  headshotUrl: ["headshot url", "headshot", "photo url", "photo"],
  posterImageUrl: ["poster image url", "eposter image url", "poster image"],
  posterPdfUrl: ["poster pdf url", "eposter pdf url", "poster pdf"],
  presentationAbstract: ["presentation abstract", "eposter abstract", "abstract"],
  presentationSpecialTopics: ["presentation special topics", "eposter special topics"],
};

/** Language suffixes recognised on translated scientific columns, for example "Session Title (fr)". */
export const TRANSLATION_SUFFIXES = {
  fr: ["(fr)", "[fr]", "- fr"],
  es: ["(es)", "[es]", "- es"],
  "en-GB": ["(en)", "(en-gb)", "[en]"],
};
