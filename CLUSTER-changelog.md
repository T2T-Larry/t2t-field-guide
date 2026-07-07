# CLUSTER View — What's in this push

**File to replace:** `sea-of-ideas.js` at the root of `t2t-larry/t2t-field-guide`
**Nothing else changes.** `backpack.js`, `index.html`, `dream.html` are untouched — this build talks to them only through the existing `window.T2T` API, same as before.

## Update — July 7, 2026 (second pass)
Three fixes on top of the first CLUSTER build, from live testing:

1. **Long header names no longer crush the starburst.** Bucket pills on the shelf were sizing to their text — a long name made the pill tall, which stretched the whole shelf row taller and squeezed the starburst area down to almost nothing. Pills are now a fixed height (2 lines max, clipped) no matter how long the name is. Full name still shows on hover via the title tooltip.
2. **Dragging one bucket onto another now actually nests it.** This was a real bug, not just a size issue — the shelf's drop handler explicitly ignored anything dragged from another header (`if(raw.indexOf('header:')===0) return;`), so a header-onto-header drop silently did nothing. Bucket pills are now draggable themselves, and the drop handler routes to either "sort an idea in" or "nest this bucket under that one" depending on what was dropped. Dragging your long header onto "Headers" will now actually move it there — it keeps its name and everything nested under it, and shows up as a subber the next time you open CLUSTER on "Headers".
3. **Full-screen toggle**, matching the storyboard's own ⛶ button. A new ⛶ button sits next to ✕ in the CLUSTER topbar — toggles the same expanded-width mode the storyboard uses (`fg-root.sb-wide`), plus CLUSTER's own larger card and tile sizing on top of that. Leaving CLUSTER restores whatever width the storyboard itself was already set to, so it doesn't leave the widget stuck wide (or narrow) behind you.

## What it does
- Adds **CLUSTER** as a third VIEW AS option on the SHAPING card (alongside TOPIC and HEADER) — only appears when the card you're shaping is a bucket (a named header with something underneath it, at any depth). A lone card never shows it.
- Tapping CLUSTER opens a new full-screen-capable view scoped to that one bucket:
  - **Center** — the bucket's own loose, uncategorized ideas, rendered wobbly and unordered (same visual language as New Additions).
  - **Bottom shelf** — the bucket's existing sub-headers, always in alphabetical order, plus a **+** button to spawn a new one.
  - Drag a loose idea from the center onto a shelf bucket to sort it in.
  - Drag one shelf bucket onto another to nest it there.
  - Tap **+** to name a brand-new bucket before anything's in it (Name the Baby — ADD).
  - Tap any existing bucket to rename it in place (Name the Baby — EDIT).
  - **⛶** toggles full-screen size. **✕** closes CLUSTER and returns to the SHAPING card you opened it from.
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
6. Create a header with a long name → confirm its shelf pill stays a fixed height and doesn't squeeze the starburst.
7. Drag one bucket onto another → confirm it nests (disappears from this shelf, reappears if you open CLUSTER on the target bucket).
8. Tap ⛶ → confirm the whole view expands, tiles get larger, and toggling back / closing CLUSTER returns the widget to its prior width.
9. Double-click a starburst card → confirm SHAPING opens on top of CLUSTER (not buried behind it), and closing it returns cleanly to CLUSTER, refreshed.

