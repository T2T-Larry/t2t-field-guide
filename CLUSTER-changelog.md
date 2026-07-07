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

## Update — July 7, 2026 (fourth pass)
One visual fix:

4. **Starburst reads as scattered now, not a tidy wrapped grid.** The tilt on each loose card was only ±4° — barely more than the shared board tiles use, so a row of cards still visually lined up like a neat row with a slight lean. Now: rotation goes up to ±22°, each tile gets a small random position jitter (paint-only, doesn't affect scrolling/layout) and a touch of random size variance, and the display order itself is reshuffled every time CLUSTER opens or re-renders — so the same bucket doesn't even settle into the same arrangement twice. The underlying `sort_order` data is untouched; this is purely how the center renders.

## Update — July 7, 2026 (fifth pass)
One more visual fix, on top of the last one:

5. **Cards no longer line up in rows at all.** The previous pass widened tilt and added jitter, but the tiles were still flowing through a flex-wrap layout underneath — so no matter how much per-tile wobble was added, they were still fundamentally arranged left-to-right in rows, just with a wobble on top. Fixed properly this time: loose cards now sit on a free-positioned canvas and land at genuinely random (x, y) coordinates, not a row or a grid cell. A light collision check nudges cards away from directly overlapping their nearest neighbor where there's room to, but doesn't force any alignment — so the result reads as an actual scattered pile, not rows-with-noise. When there are enough cards to need more room than the visible area, the canvas grows taller and the view scrolls, same as before.

## Update — July 7, 2026 (sixth pass)
Three changes, all from the same message:

6. **Vertical bucket list on desktop.** Tapping ⛶ (full screen) now also flips the shelf from a row across the bottom to a column down the left side — buckets stay reachable without cutting into the starburst's width the way a bottom row does on a wide screen. Tied to the same ⛶ toggle rather than a separate control, since that's already the app's existing "this is desktop mode" signal.
7. **Buckets are smaller.** Shelf pills shrank from 92×46 down to 72×36 (100×34 in the wide/vertical layout) — they're a wayfinding aid, not the main content, and were taking up more visual weight than they earned.
8. **Manual repositioning — read and arrange before committing.** Dragging a loose card onto *empty* space in the starburst now just moves it there and remembers that position for the rest of the session — nothing is written to Supabase, it's purely a reading/arranging aid. This lets a traveler spread cards out to read them, or nudge related-feeling ones near each other to think about grouping, without that being mistaken for actually forming a cluster. **Only a direct drop onto another card** still pops the naming prompt and commits a real bucket — so proximity ("these feel related") and commitment ("this is now a named thing") stay two separate, deliberate actions instead of one.

## What it does
- Adds **CLUSTER** as a third VIEW AS option on the SHAPING card (alongside TOPIC and HEADER) — only appears when the card you're shaping is a bucket (a named header with something underneath it, at any depth). A lone card never shows it.
- Tapping CLUSTER opens a full-screen-capable view scoped to that one bucket:
  - **Center** — the bucket's own loose, uncategorized ideas, genuinely scattered (random position, tilt, and size, reshuffled every render, no row or grid alignment) — same visual language as New Additions but pushed further, since this screen is meant to read as a state of mind, not a list. Drag one card onto empty space to arrange things for yourself; drag one card directly onto another to stack-and-name a new cluster on the spot.
  - **Shelf** — the bucket's existing sub-headers, always alphabetical, plus a **+** to spawn a new one. Sits along the bottom normally; flips to a column on the left in full-screen (⛶) mode. Tap a bucket to peek inside; drag a loose idea onto it to sort in; drag one bucket onto another to nest it.
  - **⛶** toggles full-screen size (and the shelf's layout with it). **✕** closes CLUSTER and returns to the SHAPING card you opened it from.
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
9. Open CLUSTER on a bucket with several loose cards → confirm they read as a genuine scatter (no visible rows or grid lines, varied position/tilt/size), and re-opening the same bucket gives a different arrangement each time.
10. Tap ⛶ → confirm buckets move from a bottom row to a left-hand column, and toggling back returns them to the bottom.
11. Drag a loose card onto empty starburst space → confirm it stays exactly where you dropped it, and stays there through other actions (creating a bucket, sorting another card in) for the rest of the session — but resets to scattered next time you close and reopen CLUSTER on that bucket.
12. Drag one loose card directly onto another → confirm the naming popup still appears (unchanged from the earlier pass) — manual repositioning and stacking should feel like two clearly different gestures.


