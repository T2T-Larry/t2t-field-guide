# CLUSTER View — What's in this push

**File to replace:** `sea-of-ideas.js` at the root of `t2t-larry/t2t-field-guide`
**Nothing else changes.** `backpack.js`, `index.html`, `dream.html` are untouched — this build talks to them only through the existing `window.T2T` API, same as before.

## What it does
- Adds **CLUSTER** as a third VIEW AS option on the SHAPING card (alongside TOPIC and HEADER) — only appears when the card you're shaping is a bucket (a named header with something underneath it, at any depth). A lone card never shows it.
- Tapping CLUSTER opens a new full-screen view scoped to that one bucket:
  - **Center** — the bucket's own loose, uncategorized ideas, rendered wobbly and unordered (same visual language as New Additions).
  - **Bottom shelf** — the bucket's existing sub-headers, always in alphabetical order, plus a **+** button to spawn a new one.
  - Drag a loose idea from the center onto a shelf bucket to sort it in.
  - Tap **+** to name a brand-new bucket before anything's in it (Name the Baby — ADD).
  - Tap any existing bucket to rename it in place (Name the Baby — EDIT).
  - **✕** closes CLUSTER and returns to the SHAPING card you opened it from.
- Fixed a small pre-existing bug along the way: the board markup had two elements both with `id="sb-detail-overlay"` (harmless duplicate, but invalid HTML) — the second one is now `id="sb-cluster-overlay"`, which CLUSTER uses.

## What it does NOT do yet (scoped out of this pass)
- **Idea-onto-idea stacking** (dragging one loose idea directly onto another to form an *unnamed* stack, first-card-stays-header) is not implemented. Right now, forming a new bucket always means naming it first via **+**. The unnamed-stack mechanic is a separate, deeper change to how idea tiles handle drops — flagged as follow-up work, not done here.
- Story/action card **reordering** (drag-to-reposition within a bucket) is unchanged from what already existed — this push is CLUSTER only.

## To push
1. Replace `sea-of-ideas.js` in the repo with the attached file.
2. Bump the cache-busting version parameter on its `<script>` tag in every phase file that loads it (`dream.html`, etc.) — same as any deploy.
3. No Supabase schema changes needed — CLUSTER uses the existing `ideas` table (`content_type`, `cluster_id`, `text_content`, `sort_order`) exactly as it's already defined.

## Suggested test pass once it's live
1. Open any header that already has sub-headers under it (e.g. one with a few clusters formed) → SHAPING → confirm CLUSTER button appears.
2. Open a lone idea with nothing nested under it → SHAPING → confirm CLUSTER is absent.
3. Inside CLUSTER: drag a loose idea onto a bucket → confirm it disappears from center, board updates underneath.
4. Tap **+**, name a bucket → confirm it appears in correct alphabetical position.
5. Tap an existing bucket, rename it → confirm it re-sorts alphabetically.
6. Double-click a starburst card → confirm SHAPING opens on top of CLUSTER (not buried behind it), and closing it returns cleanly to CLUSTER, refreshed.
