/* ============================================================
   t2t-helper.js -- T2T Field Guide - shared T() helper.
   Oct 10 2026 (Code health card "trivial T() helper duplicated verbatim
   across 11 files"): the one-line helper T() -- how every file reaches
   backpack.js's window.T2T -- used to be re-declared inside 13 files.
   It is declared ONCE here, in the shared page-global scope, and loads
   right after supabase-js.js, i.e. before every file that calls it. It
   deliberately does not depend on backpack.js, so it is safe to call
   from any file at any time; window.T2T itself may still be filled in
   later (backpack.js merges into it), exactly as before.
   ============================================================ */
function T(){ return window.T2T; }
