/**
 * Cloudflare Worker entry is Phase 2 (Hyperdrive → Postgres).
 * Phase 1 runs on Node: `pnpm dev` in apps/api.
 */
export default {
  fetch(): Response {
    return new Response(
      "Sanggunian Phase 1 runs as a Node/Hono process (PGlite or Postgres). Cloudflare Workers + Hyperdrive is the Phase 2 gateway. See README.md and AGENTS.md.",
      {
        status: 501,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "X-Content-Origin": "synthetic",
          "X-Charter": "/charter",
        },
      },
    );
  },
};
