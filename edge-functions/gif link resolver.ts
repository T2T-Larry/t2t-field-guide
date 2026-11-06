// Nov 6 2026 (Larry): paste a Tenor or Giphy PAGE link and the card shows that one GIF, not the page.
// Deployed to Supabase as the edge function "gif-link-resolver" (JWT required). Reads the page's own og:image address.
// Only tenor.com and giphy.com pages are read, and only their own picture addresses come back.
// Source of truth is the deployed function; this file is the readable copy.
const PAGE_HOST = /^(www\.)?(tenor\.com|giphy\.com)$/i;
const IMAGE_HOST = /(^|\.)(tenor|giphy)\.com$/i;
// ... (see the deployed function for the full handler: fetch page -> og:image -> check host -> return {image})
