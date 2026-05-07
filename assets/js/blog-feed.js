/* ===========================================================================
   blog-feed.js — Shared utilities for the Blogger feed integration
   ---------------------------------------------------------------------------
   Used by:
     - assets/js/blog-home.js   (home-page grid)
     - assets/js/blog-reader.js (reader page)

   No build step. No dependencies. Loaded as a regular <script>.

   CRITICAL: Blogger's ?alt=json endpoint does NOT send CORS headers, so a
   browser fetch() from another origin will silently fail. We MUST use the
   ?alt=json-in-script + ?callback=NAME pattern (JSONP) so the response is
   loaded as JavaScript that calls back into our page.
   =========================================================================== */

(function () {
  'use strict';

  // ---------------- Config ----------------
  // Public Blogger blog. Set Settings → Site feed → Allow Blog Feed → Full,
  // otherwise only the first paragraph of each post is exposed in the feed.
  const BLOGGER_URL = 'mulgundmultispecialityclinic.blogspot.com';

  // Shown when an entry has no <author> in the feed.
  const DEFAULT_AUTHOR = 'Mulgund Multispeciality Clinic';

  // Hard cap on how long we wait for the JSONP response before showing an
  // error. 8s is enough on slow rural mobile networks but short enough to
  // not feel broken.
  const FETCH_TIMEOUT_MS = 8000;

  // ---------------- Public namespace ----------------
  window.MMC_BLOG = {
    BLOGGER_URL: BLOGGER_URL,
    DEFAULT_AUTHOR: DEFAULT_AUTHOR,
    fetchPosts: fetchPosts,         // (max, onSuccess, onError)
    extractPostId: extractPostId,   // (entry.id.$t) -> "12345" | null
    formatDate: formatDate,         // (iso, lang) -> "5 May 2026"
    formatDateLong: formatDateLong, // (iso, lang) -> "5 May, 2026"
    escapeHtml: escapeHtml,         // (str)   -> safe-for-innerHTML string
    summarize: summarize            // (html, n) -> plain-text excerpt
  };

  // ---------------- HTML escape ----------------
  // Use this on EVERY user-derived value before inserting via innerHTML.
  // Even though the Blogger account is the user's own, escape prevents a
  // compromised post from running JS in the site context.
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ---------------- HTML → plain text (collapsed) ----------------
  function plainText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = String(html || '');
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  // ---------------- Excerpt (clip on word boundary) ----------------
  function summarize(html, maxChars) {
    const text = plainText(html);
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars).replace(/\s+\S*$/, '') + '…';
  }

  // ---------------- Extract numeric post ID ----------------
  // Blogger entry IDs look like:
  //   tag:blogger.com,1999:blog-1234567890.post-987654321
  // We need just "987654321" for clean reader URLs (?id=987654321).
  function extractPostId(idString) {
    const m = String(idString || '').match(/post-(\d+)/);
    return m ? m[1] : null;
  }

  // ---------------- Date formatters ----------------
  // Indian locale (en-IN / kn-IN) for both languages.
  function formatDate(iso, lang) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const locale = (lang === 'kn') ? 'kn-IN' : 'en-IN';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  }
  function formatDateLong(iso, lang) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const locale = (lang === 'kn') ? 'kn-IN' : 'en-IN';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---------------- JSONP fetcher ----------------
  // maxResults  : 1..50  (Blogger caps at 25 for posts, sometimes returns
  //                       fewer; we still cap at 50 as a defensive ceiling).
  // onSuccess   : (data) -> void   — Blogger's full feed JSON
  // onError     : (err)  -> void   — single Error with code "feed-load-failed"
  //                                  or "feed-timeout"
  function fetchPosts(maxResults, onSuccess, onError) {
    const cbName = '__mmcBlog_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    let done = false;
    let timeoutId = null;
    let script = null;

    function finish(err, data) {
      if (done) return;
      done = true;
      try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
      if (script && script.parentNode) script.parentNode.removeChild(script);
      if (timeoutId) clearTimeout(timeoutId);
      if (err) { if (onError) onError(err); }
      else    { if (onSuccess) onSuccess(data); }
    }

    // Blogger calls this global on success.
    window[cbName] = function (data) { finish(null, data); };

    script = document.createElement('script');
    script.src = 'https://' + BLOGGER_URL + '/feeds/posts/default'
      + '?alt=json-in-script'
      + '&max-results=' + Math.max(1, Math.min(50, maxResults || 6))
      + '&callback=' + cbName;
    script.async = true;
    script.onerror = function () { finish(new Error('feed-load-failed')); };
    document.head.appendChild(script);

    // Belt-and-braces: some browsers swallow onerror for blocked scripts.
    timeoutId = setTimeout(function () { finish(new Error('feed-timeout')); }, FETCH_TIMEOUT_MS);
  }
})();
