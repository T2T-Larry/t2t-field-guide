// Nov 6 2026 (Larry): paste a Tenor or Giphy PAGE link and the card shows that one GIF, not the page.
// Deployed to Supabase as the edge function "gif-link-resolver" (JWT required). This file is the readable copy of what is deployed.
// Reads the page's own og:image address. Only tenor.com and giphy.com pages are read, and only their own picture addresses come back.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PAGE_HOST = /^(www\.)?(tenor\.com|giphy\.com)$/i;
const IMAGE_HOST = /(^|\.)(tenor|giphy)\.com$/i;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const page = new URL(String(body && body.url));
    if (page.protocol !== "https:" || !PAGE_HOST.test(page.hostname)) return json({ error: "not a Tenor or Giphy page" }, 400);
    const r = await fetch(page.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; T2TFieldGuide/1.0)", "Accept": "text/html" },
      redirect: "follow",
    });
    if (!PAGE_HOST.test(new URL(r.url).hostname)) return json({ error: "page moved somewhere else" }, 400);
    const html = await r.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const img = m && m[1].replace(/&amp;/g, "&");
    if (!img) return json({ error: "no picture found on that page" }, 404);
    const u = new URL(img);
    if (u.protocol !== "https:" || !IMAGE_HOST.test(u.hostname)) return json({ error: "unexpected picture address" }, 400);
    return json({ image: u.toString() });
  } catch (_e) {
    return json({ error: "could not read that page" }, 500);
  }
});
