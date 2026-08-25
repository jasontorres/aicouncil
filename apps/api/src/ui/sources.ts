import { html } from "hono/html";
import type { PublicSource } from "@aicouncil/schema";
import type { HtmlEscapedString } from "hono/utils/html";

const KIND_LABEL: Partial<Record<PublicSource["kind"], string>> = {
  statute: "Law",
  bill: "Bill",
  budget: "Budget",
  data: "Report",
  jurisprudence: "Case",
  admin_issuance: "Issuance",
  prior_attempt: "Prior",
};

function httpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function sourceItem(s: PublicSource): HtmlEscapedString | Promise<HtmlEscapedString> {
  const href = httpUrl(s.url);
  const kind = KIND_LABEL[s.kind] ?? "Source";
  const title = href
    ? html`<a href="${href}" target="_blank" rel="noopener noreferrer">${s.title}</a>`
    : html`<span>${s.title}</span>`;
  const by = s.publisher || (href ? hostOf(href) : "");
  const cite = s.citation && s.citation !== s.title ? s.citation : "";
  return html`<li>
    <span class="source-kind">${kind}</span>
    ${title}
    ${by ? html`<div class="source-by">${by}${cite ? html` · ${cite}` : ""}</div>` : cite ? html`<div class="source-by">${cite}</div>` : ""}
  </li>`;
}

export function sourcesSection(sources: PublicSource[]): HtmlEscapedString | Promise<HtmlEscapedString> {
  if (sources.length === 0) return html``;
  const n = sources.length;
  const count = n === 1 ? "1 source" : `${n} sources`;
  return html`
    <details class="sources">
      <summary>
        <span class="sources-label">Sources</span>
        <span class="pill">${count}</span>
      </summary>
      <p class="section-note">Laws, bills, and reporting this question is grounded on.</p>
      <ul class="source-list">
        ${sources.map((s) => sourceItem(s))}
      </ul>
    </details>
  `;
}
