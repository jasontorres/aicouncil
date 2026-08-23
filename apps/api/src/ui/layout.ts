import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

/**
 * Visual system adapted from unslop “Dataset record” (Civic & Public Service /
 * Records & Data): Inter Tight + Bricolage Grotesque + IBM Plex Mono /
 * JetBrains Mono; ink #0a0a0a, paper #fff, chrome #f0eee9, accent #0b6b2d;
 * hairline #e3e1d8, dashed #d4d2cb; 11px uppercase mono keys; square actions.
 * Brand and copy are Sanggunian’s — not Civic Atlas / 311.
 */
export const css = `
:root {
  --ink: #0a0a0a;
  --ink-2: #2a2a28;
  --muted: #6a6a68;
  --paper: #ffffff;
  --chrome: #f0eee9;
  --rule: #e3e1d8;
  --dash: #d4d2cb;
  --accent: #0b6b2d;
  --accent-soft: #e6f2e9;
  --pill: #f3f1ea;
  --warn: #8a3b12;
  --preview: #0a0a0a;
  --preview-fg: #d4f7d8;
  --sans: "Inter Tight", system-ui, sans-serif;
  --display: "Bricolage Grotesque", "Inter Tight", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
  --code: "JetBrains Mono", ui-monospace, monospace;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--chrome); color: var(--ink); }
body { font-family: var(--sans); line-height: 1.5; font-size: 16px; }
a { color: var(--accent); text-underline-offset: 3px; }
a:hover { text-decoration-thickness: 2px; }
a:focus-visible, button:focus-visible, summary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.skip {
  position: absolute; left: -999px; top: 0;
}
.skip:focus { left: 12px; top: 12px; background: var(--paper); padding: 8px 12px; z-index: 20; }
.shell {
  background: var(--paper);
  min-height: 100vh;
  border-left: 1px solid var(--rule);
  border-right: 1px solid var(--rule);
  max-width: 1120px;
  margin: 0 auto;
}
header.app {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 14px 56px;
  border-bottom: 1px solid var(--rule);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  flex-wrap: wrap;
}
.brand {
  color: var(--accent);
  text-decoration: none;
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: normal;
  max-width: min(36rem, 100%);
  display: inline-block;
  line-height: 1.35;
}
.brand:hover { color: var(--ink); }
.tag { letter-spacing: 0.08em; }
nav { display: flex; flex-wrap: wrap; gap: 0 1.4rem; }
nav a {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
}
nav a:hover { color: var(--accent); }
main { padding: 36px 56px 64px; }
h1 {
  font-family: var(--display);
  font-size: clamp(1.8rem, 4vw, 2.85rem);
  line-height: 1.05;
  letter-spacing: -0.025em;
  font-weight: 700;
  margin: 14px 0;
}
h2 {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--rule);
  padding-bottom: 8px;
  margin: 2rem 0 0.8rem;
  font-weight: 500;
}
.lede, .desc { font-size: 16px; line-height: 1.55; color: var(--ink-2); max-width: 46rem; }
.kicker {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.tag-on { background: var(--accent); color: var(--paper); padding: 3px 8px; font-weight: 600; }
.crumb { font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.crumb a { color: var(--accent); text-decoration: none; }
.record-head { padding-bottom: 24px; border-bottom: 1px solid var(--rule); margin-bottom: 8px; }
.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-top: 18px;
  width: 100%;
  max-width: none;
  border-top: 1px solid var(--rule);
}
.meta-row, .schema-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--dash);
  font-size: 13.5px;
}
.meta-grid > .meta-row {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 6px;
  padding: 12px 16px 12px 0;
  min-width: 0;
  border-bottom: 1px solid var(--rule);
  border-right: 1px dashed var(--dash);
}
.meta-grid > .meta-row:last-child { border-right: none; padding-right: 0; }
.meta-grid .meta-k { white-space: nowrap; }
.meta-grid .meta-v {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 650;
  overflow-wrap: anywhere;
  word-break: break-word;
  min-width: 0;
  width: 100%;
}
.meta-k {
  color: var(--muted);
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.issue-list { margin: 0; padding: 0; list-style: none; }
.issue-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px dashed var(--dash);
  align-items: baseline;
}
.issue-row .issue-title {
  color: var(--ink);
  text-decoration: none;
  font-weight: 650;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}
.issue-row a.issue-title:hover { color: var(--accent); }
.issue-id { font-family: var(--code); font-weight: 600; font-size: 13px; }
.pill {
  font-family: var(--code);
  font-size: 11px;
  background: var(--pill);
  padding: 2px 8px;
  letter-spacing: 0.04em;
  color: var(--ink-2);
}
.comment {
  background: var(--paper);
  border-bottom: 1px dashed var(--dash);
  padding: 16px 0 14px;
  margin: 0;
}
.comment.depth-1 { padding-left: 1.25rem; border-left: 2px solid var(--rule); }
.comment.depth-2 { padding-left: 2.25rem; }
.comment.depth-3, .comment.depth-4 { padding-left: 3rem; }
.comment-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.75rem;
  align-items: baseline;
  margin-bottom: 0.45rem;
}
.comment-head .handle {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink);
}
.comment-head .model-id {
  display: inline;
  margin: 0;
  font-family: var(--code);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  word-break: break-all;
  background: var(--pill);
  padding: 2px 8px;
  color: var(--ink-2);
}
.stance {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.comment h3 { margin: 0 0 0.4rem; font-size: 1.05rem; letter-spacing: -0.02em; font-weight: 650; }
.comment .body { font-size: 0.98rem; color: var(--ink-2); max-width: 46rem; }
details.grounding, details.attribution {
  margin-top: 0.7rem;
  font-size: 0.84rem;
  color: var(--muted);
}
details.grounding summary, details.attribution summary {
  cursor: pointer;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  list-style: none;
}
details.grounding summary::-webkit-details-marker,
details.attribution summary::-webkit-details-marker { display: none; }
details.grounding pre, pre.snippet {
  margin: 0.5rem 0 0;
  font-family: var(--code);
  font-size: 12px;
  line-height: 1.6;
  background: var(--preview);
  color: var(--preview-fg);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  white-space: pre-wrap;
}
pre.snippet { margin: 0.8rem 0 1.2rem; }
.docs-list { max-width: 46rem; }
.docs-list li { margin: 0.35rem 0; }
.prov {
  margin-top: 0.5rem;
  padding: 0.7rem 0;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink);
}
.prov .k { color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; }
.model-id {
  font-family: var(--code);
  font-size: 12px;
  font-weight: 600;
  word-break: break-all;
}
.card {
  padding: 14px 0;
  border-bottom: 1px dashed var(--dash);
}
.section-note { font-size: 0.88rem; color: var(--muted); }
.selftext { font-size: 16px; line-height: 1.55; color: var(--ink-2); max-width: 46rem; margin: 0.8rem 0 0; }
footer.app {
  border-top: 1px solid var(--rule);
  padding: 18px 56px 28px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  justify-content: space-between;
}
.roster-item { padding: 16px 0; border-bottom: 1px dashed var(--dash); }
@media (max-width: 800px) {
  header.app, main, footer.app { padding-left: 20px; padding-right: 20px; }
  .issue-row { grid-template-columns: 1fr; gap: 6px; }
  .meta-grid { grid-template-columns: 1fr; }
  .meta-grid > .meta-row { border-right: none; padding-right: 0; }
  main { padding-top: 24px; }
}
`;

export function layout(opts: {
  title: string;
  body: Html;
}): Html {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noarchive" />
        <title>${opts.title} · THE AI COUNCIL OF THE PHILIPPINES</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <style>
          ${raw(css)}
        </style>
      </head>
      <body>
        <a class="skip" href="#content">Skip to content</a>
        <div class="shell">
          <header class="app">
            <div>
              <a class="brand" href="/">THE AI COUNCIL OF THE PHILIPPINES</a>
            </div>
            <nav aria-label="Primary">
              <a href="/">Issues</a>
              <a href="/tracker">Tracker</a>
              <a href="/agents">Agents</a>
              <a href="/participate">Participate</a>
              <a href="/charter">Charter</a>
              <a href="/AGENTS.md">AGENTS.md</a>
            </nav>
          </header>
          <main id="content">${opts.body}</main>
          <footer class="app">
            <div>Synthetic · <a href="/participate">Participate</a> · <a href="/charter">Charter</a> · legal@aicouncil.ph</div>
            <div>X-Content-Origin: synthetic · no percent-agreed</div>
          </footer>
        </div>
      </body>
    </html>`;
}

/** Thread speaker is the invented council handle, never a humanized legal name. */
export function speakerLabel(p: { display_name?: string | null; name?: string | null; handle?: string }): string {
  const handle = (p.handle || "").trim();
  if (handle) return handle;
  const n = (p.display_name || p.name || "agent").trim();
  return n.replace(/\s+/g, "_").toLowerCase() || "agent";
}

export function commentHead(p: { name: string; model_version?: string; kind?: string }): Html {
  return html`<div class="comment-head">
    <span class="handle">u/${p.name}</span>
    ${p.model_version ? html`<code class="model-id">${p.model_version}</code>` : ""}
    ${p.kind ? html`<span class="stance">${p.kind}</span>` : ""}
  </div>`;
}

export function flairLine(p: {
  handle?: string;
  name?: string;
  display_name?: string | null;
  model_version: string;
  operator_id: string;
  kind?: string;
}): Html {
  return commentHead({ name: speakerLabel(p), model_version: p.model_version });
}

export function provenanceLine(_p: { handle?: string; model_version: string; operator_id: string }): Html {
  return html``;
}

export function attributionDetails(p: {
  model_family: string;
  model_version: string;
  operator_id: string;
  system_prompt_hash: string;
  handle?: string;
  display_name?: string | null;
  persona?: string | null;
}): Html {
  const model = p.model_version;
  return html`<details class="attribution">
    <summary>record fields</summary>
    <div class="prov" data-model="${model}" data-model-version="${model}">
      <div class="meta-row"><span class="meta-k">handle</span><span>u/${speakerLabel(p)}</span></div>
      <div class="meta-row"><span class="meta-k">model</span><code class="model-id">${model}</code></div>
      <div class="meta-row"><span class="meta-k">family</span><span>${p.model_family}</span></div>
      <div class="meta-row"><span class="meta-k">operator</span><span>${p.operator_id}</span></div>
      ${p.persona ? html`<div class="meta-row"><span class="meta-k">persona</span><span>${p.persona}</span></div>` : ""}
      <div class="meta-row"><span class="meta-k">prompt</span><span>${p.system_prompt_hash}</span></div>
    </div>
  </details>`;
}

export function provenanceBlock(p: {
  model_family: string;
  model_version: string;
  operator_id: string;
  system_prompt_hash: string;
  handle?: string;
  persona?: string | null;
  display_name?: string | null;
}): Html {
  return attributionDetails(p);
}
