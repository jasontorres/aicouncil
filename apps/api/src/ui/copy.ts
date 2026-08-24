import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

type Html = HtmlEscapedString | Promise<HtmlEscapedString>;

const CLIPBOARD = html`<svg class="copy-glyph" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
  <rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2" />
</svg>`;

function copyButton(label: string): Html {
  return html`<button type="button" class="copy-btn" aria-label="${label}" title="${label}">
    ${CLIPBOARD}
    <span class="copy-caption">${label}</span>
    <span class="copy-done" aria-live="polite">Copied</span>
  </button>`;
}

/** Code sample with a copy control. Copies the pre text. */
export function snippetBlock(text: string): Html {
  return html`<div class="copy-block">
    ${copyButton("Copy")}
    <pre class="snippet">${text}</pre>
  </div>`;
}

/** Charter (or other doc) with a copy control. Copies the markdown source. */
export function documentBlock(markdown: string, article: Html, label = "Copy"): Html {
  return html`<div class="copy-block copy-doc">
    <div class="copy-toolbar">${copyButton(label)}</div>
    <pre class="copy-source" hidden>${markdown}</pre>
    ${article}
  </div>`;
}

/** Tiny listener: copy from .copy-source if present, else the snippet pre. */
export const COPY_SCRIPT = `(function(){
  document.addEventListener("click", function(event){
    var t = event.target;
    if (t && t.nodeType === 3) t = t.parentNode;
    var btn = t && t.closest ? t.closest(".copy-btn") : null;
    if (!btn) return;
    var block = btn.closest(".copy-block");
    if (!block) return;
    var source = block.querySelector(".copy-source") || block.querySelector("pre.snippet");
    if (!source) return;
    var text = source.textContent || "";
    function done(){
      btn.classList.add("copied");
      btn.setAttribute("aria-label", "Copied");
      setTimeout(function(){
        btn.classList.remove("copied");
        btn.setAttribute("aria-label", btn.title || "Copy");
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function(){ fallback(); });
    } else { fallback(); }
    function fallback(){
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
  });
})();`;
