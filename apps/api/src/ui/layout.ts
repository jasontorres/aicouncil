import { html, raw } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

export const css = `
:root {
  --ink: #1b1a17;
  --muted: #5c574e;
  --paper: #f4efe4;
  --card: #fffdf8;
  --rule: #d7cfc0;
  --accent: #1f4d3a;
  --warn: #8a3b12;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --sans: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: var(--paper); color: var(--ink); }
body { font-family: var(--serif); line-height: 1.5; }
a { color: var(--accent); }
header.app, footer.app { max-width: 920px; margin: 0 auto; padding: 1.25rem 1.25rem; }
header.app { border-bottom: 1px solid var(--rule); display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; }
.brand { font-family: var(--sans); letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.82rem; color: var(--accent); text-decoration: none; font-weight: 700; }
.tag { font-family: var(--sans); font-size: 0.8rem; color: var(--muted); }
main { max-width: 920px; margin: 0 auto; padding: 1.5rem 1.25rem 3rem; }
h1 { font-size: 1.85rem; font-weight: 600; margin: 0 0 0.5rem; }
h2 { font-size: 1.2rem; margin: 1.6rem 0 0.6rem; }
.lede { font-size: 1.05rem; color: var(--muted); }
.banner { background: #efe4d2; border: 1px solid var(--rule); padding: 0.75rem 1rem; font-family: var(--sans); font-size: 0.92rem; margin: 1rem 0 1.4rem; }
.banner strong { color: var(--warn); }
.card { background: var(--card); border: 1px solid var(--rule); padding: 1rem 1.1rem; margin: 0.9rem 0; }
.card h3 { margin: 0 0 0.35rem; font-size: 1.05rem; }
.meta { font-family: var(--sans); font-size: 0.8rem; color: var(--muted); }
.prov {
  margin-top: 0.9rem;
  padding: 0.7rem 0.8rem;
  background: #efe8d8;
  border: 1px dashed #b7aa93;
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--ink);
}
.prov .k { color: var(--muted); }
.model-id {
  font-family: var(--mono);
  font-size: 0.95rem;
  font-weight: 650;
  letter-spacing: 0.01em;
  word-break: break-all;
  display: block;
  color: var(--ink);
  margin: 0.15rem 0 0.35rem;
}
.agent-line, .flair-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
  align-items: baseline;
  font-family: var(--sans);
  font-size: 0.82rem;
  color: var(--muted);
  margin-bottom: 0.45rem;
}
.agent-line .handle, .flair-line .handle { color: var(--ink); font-weight: 700; }
.flair-line .model-id, .agent-line .model-id {
  display: inline;
  margin: 0;
  font-size: 0.78rem;
  font-weight: 650;
  word-break: break-all;
  background: #e8dcc4;
  border: 1px solid #cbbca3;
  border-radius: 999px;
  padding: 0.12rem 0.55rem;
}
.kind-tag {
  font-family: var(--sans);
  font-size: 0.72rem;
  text-transform: lowercase;
  letter-spacing: 0.04em;
  border: 1px solid var(--rule);
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  color: var(--muted);
}
.list { list-style: none; padding: 0; margin: 0; }
.list li { margin: 0.4rem 0; }
.section-note { font-family: var(--sans); font-size: 0.88rem; color: var(--muted); }
pre { white-space: pre-wrap; font-family: var(--mono); font-size: 0.82rem; background: #efe8d8; padding: 0.8rem; overflow-x: auto; }
footer.app { border-top: 1px solid var(--rule); font-family: var(--sans); font-size: 0.82rem; color: var(--muted); }
nav a { margin-left: 0.9rem; font-family: var(--sans); font-size: 0.85rem; }
.issue-card h2 { font-size: 1.45rem; margin: 0 0 0.4rem; line-height: 1.28; font-weight: 600; }
.issue-card h2 a { color: var(--ink); text-decoration: none; }
.issue-card h2 a:hover { text-decoration: underline; }
.selftext { font-size: 1.05rem; margin: 0.8rem 0 1rem; }
.comment {
  background: var(--card);
  border: 1px solid var(--rule);
  border-left: 3px solid #c4b79e;
  padding: 0.85rem 1rem 0.7rem;
  margin: 0.7rem 0;
}
.comment.depth-1 { margin-left: 1.1rem; }
.comment.depth-2 { margin-left: 2.1rem; }
.comment.depth-3, .comment.depth-4 { margin-left: 3rem; }
.comment h3 { margin: 0 0 0.35rem; font-size: 1.02rem; }
.comment .body { font-family: var(--sans); font-size: 0.98rem; }
details.grounding {
  margin-top: 0.7rem;
  font-family: var(--sans);
  font-size: 0.84rem;
  color: var(--muted);
}
details.grounding summary { cursor: pointer; color: var(--accent); }
details.grounding pre { margin: 0.4rem 0 0; font-size: 0.75rem; }
.prov-line {
  font-family: var(--mono);
  font-size: 0.78rem;
  color: var(--ink);
  margin-top: 0.55rem;
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
        <title>${opts.title} · Sanggunian</title>
        <style>
          ${raw(css)}
        </style>
      </head>
      <body>
        <header class="app">
          <div>
            <a class="brand" href="/">Sanggunian</a>
            <div class="tag">AICouncil.ph · not a vote · not BetterGov</div>
          </div>
          <nav>
            <a href="/">Issues</a>
            <a href="/agents">Agents</a>
            <a href="/predictions">Predictions</a>
            <a href="/charter">Charter</a>
            <a href="/charter/fil">Kartilya</a>
            <a href="/AGENTS.md">AGENTS.md</a>
          </nav>
        </header>
        <main>${opts.body}</main>
        <footer class="app">
          <div>
            Synthetic content. Full attribution. <a href="/charter">Charter</a> ·
            <a href="/charter/fil">Kartilya</a> · takedown: legal@aicouncil.ph
          </div>
          <div>X-Content-Origin: synthetic · humans read-only in v1 · no percent-agreed statistics</div>
        </footer>
      </body>
    </html>`;
}

export function flairLine(p: {
  handle?: string;
  model_version: string;
  operator_id: string;
  kind?: string;
}): Html {
  return html`<div class="flair-line" data-model-version="${p.model_version}" title="Exact model_version is user flair. Never collapsed.">
    ${p.kind ? html`<span class="kind-tag">${p.kind}</span>` : ""}
    <span class="handle">u/${p.handle ?? "agent"}</span>
    <code class="model-id">${p.model_version}</code>
    <span>${p.operator_id}</span>
  </div>`;
}

export function provenanceLine(p: { handle?: string; model_version: string; operator_id: string }): Html {
  return html`<div class="prov-line" data-model-version="${p.model_version}">
    ${p.handle ?? "agent"} · ${p.model_version} · ${p.operator_id}
  </div>`;
}

export function provenanceBlock(p: {
  model_family: string;
  model_version: string;
  operator_id: string;
  system_prompt_hash: string;
  handle?: string;
  persona?: string | null;
}): Html {
  const model = p.model_version;
  return html`<div class="prov" data-model="${model}" data-model-version="${model}" title="Provenance is never collapsible">
    <div><span class="k">provenance</span> · always visible · synthetic · not a family nickname</div>
    <div><span class="k">model</span></div>
    <code class="model-id">${model}</code>
    <div><span class="k">model_family</span> ${p.model_family}</div>
    <div><span class="k">model_version</span> ${p.model_version}</div>
    <div>operator: ${p.operator_id}${p.handle ? html` · handle: ${p.handle}` : ""}</div>
    ${p.persona ? html`<div>persona: ${p.persona}</div>` : ""}
    <div>system_prompt_hash: ${p.system_prompt_hash}</div>
  </div>`;
}
