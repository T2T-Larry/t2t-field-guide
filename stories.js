/* stories.js — Sept 3 2026
   Shared reading format for passive Library/Field Guide passages (see FG
   Current Status: "Field Guide/Library story content -> Supabase, not
   static pages"). A story is a row in public.stories -- eyebrow, page
   title, body text, an optional picture, an optional phase, a category
   (Library shelf), and a flow order for when more than one story shares
   a phase/category. This file is the one place that knows how to turn a
   story row into the existing .reader-wrap look every plain passage on
   the site already uses.

   Usage: give a screen this shell --
     <div class="sc card" id="s-my-screen">
       <div class="reader-wrap"><div class="reader-body"></div></div>
       <div class="bar2">...</div>
     </div>
   then register it once, alongside the other registerPageNum calls:
     T.registerScreenActivate('s-my-screen', function(){
       return T2TStories.renderStory('s-my-screen','my-slug');
     });
   nav() calls the registered function every time the screen is shown,
   and (Sept 3 2026, backpack.js) waits for it if it returns a promise --
   this one does, so the travel spinner covers the fetch.

   Trusted-content note: body_text/eyebrow/page_title are written by
   Larry (via Claude) directly into Supabase, the same way page copy is
   written directly into HTML today -- not traveler input -- so a small
   amount of inline HTML (line breaks, a colored <span>) is allowed
   through as-is, matching what today's hand-built passages already do.
*/
(function(){
  var _cache = {};

  function renderInto(container, story){
    var wrap = container.querySelector('.reader-wrap');
    if (!wrap) return;
    var body = wrap.querySelector('.reader-body');
    if (!body) return;
    var html = '';
    if (story.eyebrow) {
      html += '<div class="reader-eyebrow">'+story.eyebrow+'</div>';
    }
    html += '<div class="reader-line bold" style="font-size:26px">'+story.page_title+'</div>';
    html += '<div style="width:60px;height:0.5px;background:#C9A87C;margin:0 auto"></div>';
    if (story.image_url) {
      html += '<img src="'+story.image_url+'" alt="" style="max-width:100%;border-radius:8px;margin:14px 0">';
    }
    html += '<div class="reader-line small" style="line-height:1.9">'+story.body_text+'</div>';
    body.innerHTML = html;
  }

  function renderMissing(container, slug){
    var wrap = container.querySelector('.reader-wrap');
    var body = wrap && wrap.querySelector('.reader-body');
    if (body) {
      body.innerHTML = '<div class="reader-line small" style="color:#a33">This passage ('+slug+') could not be loaded.</div>';
    }
    console.warn('[stories.js] story not found or fetch failed:', slug);
  }

  async function renderStory(screenId, slug){
    var container = document.getElementById(screenId);
    if (!container) return;
    if (_cache[slug]) { renderInto(container, _cache[slug]); return; }
    var sb = window.T2T && window.T2T.sb;
    if (!sb) { renderMissing(container, slug); return; }
    try {
      var res = await sb.from('stories').select('*').eq('slug', slug).single();
      if (res.error || !res.data) { renderMissing(container, slug); return; }
      _cache[slug] = res.data;
      renderInto(container, res.data);
    } catch(e) {
      console.warn('[stories.js] renderStory failed:', slug, e);
      renderMissing(container, slug);
    }
  }

  window.T2TStories = { renderStory: renderStory };
})();
