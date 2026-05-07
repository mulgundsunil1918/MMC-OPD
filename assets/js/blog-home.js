/* ===========================================================================
   blog-home.js — Renders the "Latest from the clinic" grid on the home page.
   Depends on blog-feed.js (must load before this).
   =========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;

    const FEED = window.MMC_BLOG;
    if (!FEED) {
      // blog-feed.js failed to load — leave the existing skeleton in place.
      return;
    }

    // Don't add .reveal to dynamically-injected cards: the IntersectionObserver
    // in main.js was bound at DOMContentLoaded and will never see new elements,
    // so they'd be stuck at opacity:0 forever. Fade-in on cards is intentionally
    // skipped — the feed completes within ~1s and replaces the skeletons.

    grid.innerHTML = skeletonCards(3);

    FEED.fetchPosts(6, onSuccess, onError);

    function onSuccess(data) {
      const entries = (data && data.feed && data.feed.entry) || [];
      if (!entries.length) {
        grid.innerHTML = emptyMessage();
        return;
      }
      grid.innerHTML = entries.map(entryToCard).filter(Boolean).join('');
      if (!grid.innerHTML.trim()) grid.innerHTML = emptyMessage();
    }

    function onError() {
      grid.innerHTML = errorMessage();
    }

    function entryToCard(entry) {
      const postId = FEED.extractPostId(entry.id && entry.id.$t);
      if (!postId) return ''; // skip malformed entries

      const lang = document.documentElement.lang || 'en';

      const title   = (entry.title && entry.title.$t) || '(Untitled)';
      const html    = (entry.content && entry.content.$t) || (entry.summary && entry.summary.$t) || '';
      const date    = FEED.formatDate(entry.published && entry.published.$t, lang);
      const author  = (entry.author && entry.author[0] && entry.author[0].name && entry.author[0].name.$t) || FEED.DEFAULT_AUTHOR;
      const tag     = (entry.category && entry.category[0] && entry.category[0].term) || 'Post';
      const excerpt = FEED.summarize(html, 140);

      // Relative href: works at /MMC-OPD/ on GitHub Pages AND at the root of
      // a future custom domain.
      return ''
        + '<a href="blog/?id=' + encodeURIComponent(postId) + '" class="blog-card">'
        +   '<div class="blog-tag">' + FEED.escapeHtml(tag) + '</div>'
        +   '<div class="blog-title">' + FEED.escapeHtml(title) + '</div>'
        +   '<p class="blog-excerpt">' + FEED.escapeHtml(excerpt) + '</p>'
        +   '<div class="blog-meta">'
        +     '<span>' + FEED.escapeHtml(author) + '</span>'
        +     '<span class="blog-dot"></span>'
        +     '<span>' + FEED.escapeHtml(date) + '</span>'
        +   '</div>'
        + '</a>';
    }

    function skeletonCards(n) {
      let out = '';
      for (let i = 0; i < n; i++) {
        out += ''
          + '<div class="blog-card skeleton" aria-hidden="true">'
          +   '<div class="blog-tag">&nbsp;</div>'
          +   '<div class="blog-title">&nbsp;</div>'
          +   '<p class="blog-excerpt">&nbsp;</p>'
          +   '<div class="blog-meta"><span>&nbsp;</span></div>'
          + '</div>';
      }
      return out;
    }

    function tDict() {
      const lang = document.documentElement.lang || 'en';
      return (window.MMC_TRANSLATIONS && window.MMC_TRANSLATIONS[lang] && window.MMC_TRANSLATIONS[lang].blog) || {};
    }

    function emptyMessage() {
      const t = tDict();
      return '<div class="blog-message">' + FEED.escapeHtml(t.empty || 'No posts yet — check back soon.') + '</div>';
    }

    function errorMessage() {
      const t = tDict();
      return '<div class="blog-message">'
        + FEED.escapeHtml(t.error || "Couldn't load posts.") + ' '
        + '<a href="https://' + FEED.BLOGGER_URL + '/" target="_blank" rel="noopener">'
        + FEED.escapeHtml(t.readDirect || 'Read directly on Blogger') + ' →</a></div>';
    }
  });
})();
