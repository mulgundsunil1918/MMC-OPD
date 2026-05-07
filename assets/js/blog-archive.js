/* ===========================================================================
   blog-archive.js — Renders /blog/all/ (every published post)
   ---------------------------------------------------------------------------
   - Uses paginated JSONP requests (Blogger caps at 25 results per call) so
     this scales to hundreds of posts.
   - Groups posts by year, newest first.
   - Shows a category filter dropdown if the blog has 2+ categories.
   - Reuses the same card markup as the home grid for consistent UX.
   =========================================================================== */

(function () {
  'use strict';

  const PAGE_SIZE = 25;          // Blogger's max per request
  const PAGE_TIMEOUT_MS = 10000; // per-page JSONP timeout

  document.addEventListener('DOMContentLoaded', function () {
    const FEED = window.MMC_BLOG;
    if (!FEED) return;

    fetchAllPosts(FEED, function (posts) {
      if (!posts.length) { showEmpty(FEED); return; }
      renderArchive(posts, FEED);
    }, function () {
      showError(FEED);
    });
  });

  // ---------------- Paginated fetch ----------------
  // Recursively fetches one page at a time until we've got everything.
  // Uses raw JSONP because blog-feed.js's helper doesn't support start-index.
  function fetchAllPosts(FEED, onSuccess, onError) {
    const out = [];
    let startIndex = 1;

    function fetchPage() {
      const cbName = '__mmcArc_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      let done = false;
      let timeoutId = null;
      let script = null;

      function finish(err, data) {
        if (done) return;
        done = true;
        try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
        if (script && script.parentNode) script.parentNode.removeChild(script);
        if (timeoutId) clearTimeout(timeoutId);

        if (err) { onError(err); return; }

        const entries = (data && data.feed && data.feed.entry) || [];
        out.push.apply(out, entries);

        const total = parseInt(((data.feed.openSearch$totalResults) || {}).$t, 10) || 0;

        // Stop when we've got everything OR the server returned fewer than
        // we asked for (last page).
        if (out.length >= total || entries.length < PAGE_SIZE) {
          onSuccess(out);
        } else {
          startIndex += PAGE_SIZE;
          fetchPage();
        }
      }

      window[cbName] = function (data) { finish(null, data); };

      script = document.createElement('script');
      script.src = 'https://' + FEED.BLOGGER_URL + '/feeds/posts/default'
        + '?alt=json-in-script'
        + '&max-results=' + PAGE_SIZE
        + '&start-index=' + startIndex
        + '&callback=' + cbName;
      script.async = true;
      script.onerror = function () { finish(new Error('feed-load-failed')); };
      document.head.appendChild(script);

      timeoutId = setTimeout(function () { finish(new Error('feed-timeout')); }, PAGE_TIMEOUT_MS);
    }

    fetchPage();
  }

  // ---------------- Render ----------------
  function renderArchive(posts, FEED) {
    const loading = document.getElementById('archive-loading');
    if (loading) loading.hidden = true;

    // Collect unique categories across all posts
    const cats = new Set();
    posts.forEach(function (p) {
      (p.category || []).forEach(function (c) {
        if (c.term) cats.add(c.term);
      });
    });

    // Show the filter only if there's a real choice to make
    if (cats.size >= 2) {
      const filterEl = document.querySelector('.archive-filter');
      const select   = document.getElementById('archive-cat');
      if (filterEl && select) {
        const allLabel = tDict().filterAll || 'All categories';
        select.innerHTML = '<option value="">' + FEED.escapeHtml(allLabel) + '</option>'
          + Array.from(cats).sort().map(function (c) {
              return '<option value="' + FEED.escapeHtml(c) + '">' + FEED.escapeHtml(c) + '</option>';
            }).join('');
        filterEl.hidden = false;
        select.addEventListener('change', function () {
          renderYearGroups(posts, select.value, FEED);
        });
      }
    }

    renderYearGroups(posts, '', FEED);
  }

  function renderYearGroups(posts, categoryFilter, FEED) {
    const container = document.getElementById('archive-years');
    if (!container) return;

    let filtered = posts;
    if (categoryFilter) {
      filtered = posts.filter(function (p) {
        return (p.category || []).some(function (c) { return c.term === categoryFilter; });
      });
    }

    if (!filtered.length) {
      container.innerHTML = '<div class="blog-message">'
        + FEED.escapeHtml(tDict().filterEmpty || 'No posts in this category yet.')
        + '</div>';
      return;
    }

    // Group by year
    const byYear = {};
    filtered.forEach(function (p) {
      const yr = new Date(p.published.$t).getFullYear();
      (byYear[yr] = byYear[yr] || []).push(p);
    });

    // Years descending (newest first)
    const years = Object.keys(byYear).sort(function (a, b) { return Number(b) - Number(a); });
    const lang  = document.documentElement.lang || 'en';

    container.innerHTML = years.map(function (yr) {
      // Within each year, sort posts newest-first
      const yearPosts = byYear[yr].sort(function (a, b) {
        return new Date(b.published.$t) - new Date(a.published.$t);
      });
      return ''
        + '<section class="archive-year-group">'
        +   '<h2 class="archive-year">' + FEED.escapeHtml(yr) + '</h2>'
        +   '<div class="blog-grid">'
        +     yearPosts.map(function (p) { return entryToCard(p, FEED, lang); }).filter(Boolean).join('')
        +   '</div>'
        + '</section>';
    }).join('');
  }

  function entryToCard(entry, FEED, lang) {
    const postId = FEED.extractPostId(entry.id && entry.id.$t);
    if (!postId) return '';

    const title   = (entry.title && entry.title.$t) || '(Untitled)';
    const html    = (entry.content && entry.content.$t) || (entry.summary && entry.summary.$t) || '';
    const date    = FEED.formatDate(entry.published && entry.published.$t, lang);
    const author  = (entry.author && entry.author[0] && entry.author[0].name && entry.author[0].name.$t) || FEED.DEFAULT_AUTHOR;
    const tag     = (entry.category && entry.category[0] && entry.category[0].term) || 'Post';
    const excerpt = FEED.summarize(html, 140);

    // /blog/all/ → /blog/?id=POSTID is one level up
    return ''
      + '<a href="../?id=' + encodeURIComponent(postId) + '" class="blog-card">'
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

  // ---------------- States ----------------
  function showEmpty(FEED) {
    const loading = document.getElementById('archive-loading');
    if (loading) loading.hidden = true;
    const empty = document.getElementById('archive-empty');
    if (empty) {
      empty.textContent = tDict().empty || 'No posts yet — check back soon.';
      empty.hidden = false;
    }
  }

  function showError(FEED) {
    const loading = document.getElementById('archive-loading');
    if (loading) loading.hidden = true;
    const empty = document.getElementById('archive-empty');
    if (empty) {
      empty.innerHTML = FEED.escapeHtml(tDict().error || "Couldn't load posts.") + ' '
        + '<a href="https://' + FEED.BLOGGER_URL + '/" target="_blank" rel="noopener">'
        + FEED.escapeHtml(tDict().readDirect || 'Read directly on Blogger') + ' →</a>';
      empty.hidden = false;
    }
  }

  function tDict() {
    const lang = document.documentElement.lang || 'en';
    return (window.MMC_TRANSLATIONS && window.MMC_TRANSLATIONS[lang] && window.MMC_TRANSLATIONS[lang].blog) || {};
  }
})();
