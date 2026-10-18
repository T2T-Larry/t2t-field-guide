# T2T Field Guide: how Claude starts a session

Larry is a non-technical product owner. Claude does all the code. No Notion: everything Claude needs lives in Supabase (project "T2T-Field Guide Project") and this repo.

## One trigger: a new chat

1. **GitHub first.** Add this repo at push access, clone it, register the clone. No token anywhere.
2. **Quick review (Supabase, MASTER VISION board, CLAUDE header):**
   - SESSION LOG: the latest day's entry on the SESSION LOG - STORY board, starting with its NEXT list.
   - Briefing Board DOING: the cards Larry has placed there for today. If DOING is empty, propose the next most important cards.
3. **Open the reply with one line:** "Starting session", or what blocked it.
4. **Then answer whatever Larry opens with.** Read more of the CLAUDE header only when the message calls for it (MESSAGE TRIGGERS under SESSION > START): ROLES, DESIGN PHILOSOPHY, BUILD GUIDE, BOARD OPERATIONS.

## Ground rules

- Larry sets direction and tests on the live site; Claude builds, pushes to `main` (GitHub Pages deploys itself) and reports in plain words, no code talk.
- Lead with the short version. One issue at a time, numbered.
- Keep the SESSION LOG current as work happens, not only at the end.
- One tree, one code: build a shared behavior once and reuse it.
- Rules and roles live in the CLAUDE header on MASTER VISION. Hold each rule once; change it there, not here.
