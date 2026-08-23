/**
 * Human-facing voice for thesis, mechanism, and reply bodies.
 * Citations belong in legal_basis. The Context Pack is an ingest rule, not a character.
 */

export type VoiceHit = { span: string; reason: string };

const PACK_TALK =
  /\b((the|this|a|our)\s+(context\s+)?pack|context pack|in the pack|pack (has|is|contains|supplies|shows|says|is silent))\b/i;

const SOURCE_ID_SLUG =
  /\b(oq-[a-z0-9-]+|open-q-[a-z0-9-]+|news-[a-z0-9-]+-[a-f0-9]{4,}|j-[a-z0-9-]{3,}|c-(no|not)-[a-z0-9-]+|nep-2027-[a-z0-9-]+)\b/i;

const SCHEMA_TALK =
  /\b(legal_basis|source_id|thesis_en|body_en|no_filed_bill_covers_this|trusted_source_ids|pack_pin|pending_verification)\b/;

const FILIPINO =
  /\b(ang|mga|hindi|dapat|habang|huwag|tinatanggap|pinupuna|sumasang-ayon|imbakan|panukala|sa ilalim ng|dapat ipasa|oo sa)\b/i;

const PERSONA =
  /\b(as an ai|as a (public[- ]hospital |qc )?social worker|i run ward|i write promissory|i see families|i witness this)\b/i;

const META_SELF =
  /\b(this position|my position|this record (does not|cannot|has no)|this chamber's record)\b/i;

const RULES: { re: RegExp; reason: string }[] = [
  {
    re: PACK_TALK,
    reason: "Do not mention the Context Pack in text humans read. Cite the statute, bill, agency, or news outlet instead.",
  },
  {
    re: SOURCE_ID_SLUG,
    reason: "Do not paste source_id slugs into thesis, mechanism, or body. Put them only in legal_basis.",
  },
  {
    re: SCHEMA_TALK,
    reason: "Do not name schema fields in the comment. Humans read the argument, not the form.",
  },
  {
    re: FILIPINO,
    reason: "Write thesis, mechanism, and body in English for now.",
  },
  {
    re: PERSONA,
    reason: "Do not narrate yourself. State the decision and how it would work.",
  },
  {
    re: META_SELF,
    reason: "Do not talk about 'this Position' or 'this record'. Answer the question.",
  },
];

export function findHumanVoiceViolation(text: string): VoiceHit | null {
  const value = text.trim();
  if (!value) return null;
  for (const rule of RULES) {
    const m = value.match(rule.re);
    if (m) return { span: m[0], reason: rule.reason };
  }
  return null;
}

export function findHumanVoiceViolationIn(fields: Record<string, string>): VoiceHit | null {
  for (const [name, value] of Object.entries(fields)) {
    const hit = findHumanVoiceViolation(value);
    if (hit) return { ...hit, reason: `${name}: ${hit.reason}` };
  }
  return null;
}
