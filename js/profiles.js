/**
 * Speaker profiles are optional. They appear only when the published sheet
 * provides a biography or a headshot URL. Empty profiles and broken images are not shown.
 */

export function hasProfileContent(person) {
  return Boolean(String(person?.biography || "").trim() || String(person?.headshotUrl || "").trim());
}

export function profileKey(person) {
  const id = String(person?.speakerId || "").trim();
  if (id) return id;
  return [person?.name, person?.affiliation, person?.country].filter(Boolean).join("|").toLowerCase();
}
