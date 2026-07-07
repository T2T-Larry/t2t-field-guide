# CLUSTER View — What's in this push

**File to replace:** `sea-of-ideas.js` at the root of `t2t-larry/t2t-field-guide`
**Nothing else changes.** `backpack.js`, `index.html`, `dream.html` are untouched — this build talks to them only through the existing `window.T2T` API, same as before.

## Update — July 7, 2026 (third pass)
Three more changes, from continued live testing:

1. **Idea-onto-idea stacking, with a forced name.** Dropping one loose idea onto another inside CLUSTER's starburst now pops a small "HEADER:" prompt immediately. Enter a name and save → both ideas move into a brand-new bucket with that name. Cancel, or leave it blank, and nothing happens — both ideas stay exactly where they were, loose. There's no unnamed-stack state; naming is the only way a stack forms.
   - **Scoped to CLUSTER only, on purpose.** On the main storyboard, dropping one idea tile onto another already means "reorder" (the position/sort_order feature from a few builds back). Making the same drag mean "form a cluster" there too would make every reorder attempt risk popping a naming dialog by accident — so this only lives in CLUSTER's starburst, where no reorder gesture currently exists to conflict with it.
2. **Click a bucket to see what's inside it.** Tapping a shelf bucket in CLUSTER now opens the existing peek view (a small card showing everything nested under it) instead of jumping straight to rename. Renaming moved to a ✏️ button inside that peek card — reuses the same rename+move dialog that already existed elsewhere, so nothing new was built for it, and it also means the board's own HEADER view-as button gets a rename option it didn't have before, for free.
   - This avoids a real trap: making single-click *and* double-click both do something on the same pill (peek vs. rename) reintroduces exactly the click/dblclick race the main board already ran into and fixed once — solved the same way here instead of repeating the mistake.
3. **Idea capture now confirms where it landed.** Saving an idea from the main "Add an idea" screen used to just say "Saved." — no way to tell if it actually reached the header you picked. It now says "Saved to [Header Name]" with a "View it →" link that jumps straight to that board so you can see the card sitting there.

## What it does
- Adds **CLUSTER** as a third VIEW AS option on the SHAPING card (alongside TOPIC and HEADER) — only appears when the card you're shaping is a bucket (a named header with something underneath it, at any depth). A lone card never shows it.
- Tapping CLUSTER opens a full-screen-capable view scoped to that one bucket:
  - **Center** — the bucket's own loose, uncategorized ideas, wobbly and unordered (same visual language as New Additions). Drag one onto another to stack-and-name a new cluster on the spot.
  - **Bottom shelf** — the bucket's existing sub-headers, always alphabetical, plus a **+** to spawn a new one. Tap a bucket to peek inside; drag a loose idea onto it to sort in; drag one bucket onto another to nest it.
  - **⛶** toggles full-screen size. **✕** closes CLUSTER and returns to the SHAPING card you opened it from.
- Fixed a small pre-existing bug along the way: the board markup had two elements both with `id="sb-detail-overlay"` (harmless duplicate, but invalid HTML) — the second one is now `id="sb-cluster-overlay"`, which CLUSTER uses.

## What it does NOT do yet (scoped out of this pass)
- Punctuation-based auto-header-promotion (`:`/`?` at the end of a typed idea) is **still in place** — Larry and Claude discussed removing it now that stacking exists as a proper "clustering" promotion path, but haven't locked that decision yet. Flagged for a future pass, not touched here.
- Story/action card **reordering** (drag-to-reposition within a bucket) is unchanged from what already existed on the main storyboard — this push doesn't touch it.

## To push
1. Replace `sea-of-ideas.js` in the repo with the attached file.
2. Bump the cache-busting version parameter on its `<script>` tag in every phase file that loads it (`dream.html`, etc.) — same as any deploy.
3. No Supabase schema changes needed — everything here uses the existing `ideas` table (`content_type`, `cluster_id`, `text_content`, `sort_order`) exactly as it's already defined.

## Suggested test pass once it's live
1. Open any header that already has sub-headers under it → SHAPING → confirm CLUSTER button appears; a lone idea shows no CLUSTER option.
2. Inside CLUSTER: drag one loose idea onto another → confirm the naming popup appears, saving creates a new bucket holding both, canceling leaves both untouched.
3. Create a header with a long name → confirm its shelf pill stays a fixed height.
4. Drag one bucket onto another → confirm it nests.
5. Tap a bucket → confirm it opens the peek view (not a rename box); tap ✏️ inside the peek → confirm the rename/move dialog opens and saving updates the name and shelf position.
6. Tap ⛶ → confirm full-screen expansion and clean return on close.
7. From the main "Add an idea" screen, save something → confirm the status line names the destination header and "View it →" jumps to the right board with the new card visible.
8. Double-click a starburst card → confirm SHAPING opens on top of CLUSTER, and closing it returns cleanly, refreshed.


