/* ===========================================================================
   blog-reader.js — Renders a single Blogger post inside our site theme.
   Loaded ONLY by /blog/index.html. Depends on blog-feed.js + main.js (i18n).
   =========================================================================== */

(function () {
  'use strict';

  // Counter API namespace. Same string used for both reaction keys and any
  // future counters (visitor stats, etc.). counterapi.dev is free + auth-less.
  const COUNTER_NS = 'mulgund-blog';
  const COUNTER_API = 'https://api.counterapi.dev/v1/' + COUNTER_NS;

  document.addEventListener('DOMContentLoaded', function () {
    const FEED = window.MMC_BLOG;
    if (!FEED) { showError('load'); return; }

    const params = new URLSearchParams(window.location.search);
    const wantedId = params.get('id');

    if (!wantedId) { showError('no-id'); return; }

    // 50 results is plenty for "find post by ID" on a clinic blog.
    FEED.fetchPosts(50, function (data) {
      const entries = (data && data.feed && data.feed.entry) || [];
      const post = entries.find(function (e) {
        return FEED.extractPostId(e.id && e.id.$t) === wantedId;
      });
      if (!post) { showError('not-found'); return; }
      renderPost(post, wantedId, FEED);
    }, function () {
      showError('load');
    });
  });

  // ---------------- Render the post ----------------
  function renderPost(post, postId, FEED) {
    const lang = document.documentElement.lang || 'en';

    const loading = document.getElementById('reader-loading');
    if (loading) loading.hidden = true;

    const article = document.getElementById('reader-article');
    if (article) article.hidden = false;

    const title  = (post.title && post.title.$t) || '(Untitled)';
    const html   = (post.content && post.content.$t) || '';
    const date   = FEED.formatDateLong(post.published && post.published.$t, lang);
    const author = (post.author && post.author[0] && post.author[0].name && post.author[0].name.$t) || FEED.DEFAULT_AUTHOR;
    const tag    = (post.category && post.category[0] && post.category[0].term) || 'Post';

    setText('post-tag', tag);
    setText('post-date', date);
    setText('post-title', title);

    // Author byline — built with escaped values; allows bold styling on name.
    const byline = tDict().byline || 'By';
    const authorEl = document.getElementById('post-author');
    if (authorEl) {
      authorEl.innerHTML = FEED.escapeHtml(byline)
        + ' <strong>' + FEED.escapeHtml(author) + '</strong>';
    }

    // Render HTML body. Source = the user's own Blogger account; same trust
    // model as your static site copy. Still, escape happens upstream for
    // metadata; the body itself is rich HTML with images/iframes by design.
    const contentEl = document.getElementById('post-content');
    if (contentEl) {
      contentEl.innerHTML = html;

      // External links → new tab. Blogger renders absolute URLs for
      // cross-site links, so .hostname comparison is meaningful.
      const here = window.location.hostname;
      contentEl.querySelectorAll('a[href]').forEach(function (a) {
        if (a.hostname && a.hostname !== here) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener');
        }
      });
    }

    // Update document/OG meta for nice WhatsApp/LinkedIn/Twitter previews.
    const excerpt = FEED.summarize(html, 160);
    const fullTitle = title + ' — Mulgund Multispeciality Clinic';
    document.title = fullTitle;
    setMeta('description', excerpt);
    setOg('og:title', title);
    setOg('og:description', excerpt);

    // "Comment on this post" → opens Blogger's permalink at the comment form.
    const permalink = ((post.link || []).find(function (l) { return l.rel === 'alternate'; }) || {}).href || '';
    const commentBtn = document.getElementById('post-comment-btn');
    if (commentBtn && permalink) {
      commentBtn.href = permalink + '#comment-form';
      commentBtn.hidden = false;
    }

    // Reactions widget
    setupReactions(postId);
  }

  // ---------------- Helpers ----------------
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setMeta(name, value) {
    let el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  function setOg(prop, value) {
    let el = document.querySelector('meta[property="' + prop + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  function tDict() {
    const lang = document.documentElement.lang || 'en';
    return (window.MMC_TRANSLATIONS && window.MMC_TRANSLATIONS[lang] && window.MMC_TRANSLATIONS[lang].blog) || {};
  }

  function showError(kind) {
    const loading = document.getElementById('reader-loading');
    if (loading) loading.hidden = true;
    const errEl = document.getElementById('reader-error');
    if (!errEl) return;
    errEl.hidden = false;

    const dict = tDict();
    let title, body;
    if (kind === 'no-id') {
      title = dict.errNoIdTitle    || 'No post selected';
      body  = dict.errNoIdBody     || 'Looks like the link is missing a post id.';
    } else if (kind === 'not-found') {
      title = dict.errNotFoundTitle || 'Post not found';
      body  = dict.errNotFoundBody  || 'This post may have been removed or renamed.';
    } else {
      title = dict.errLoadTitle     || "Couldn't load this post";
      body  = dict.errLoadBody      || 'Please check your connection and try again.';
    }
    const titleEl = errEl.querySelector('.reader-error-title');
    const bodyEl  = errEl.querySelector('.reader-error-body');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl)  bodyEl.textContent  = body;
  }

  // ---------------- Reactions ----------------
  function setupReactions(postId) {
    const wrap = document.getElementById('reactions');
    if (!wrap) return;
    wrap.hidden = false;

    wrap.querySelectorAll('.reaction-btn').forEach(function (btn) {
      const type    = btn.getAttribute('data-type');
      const lockKey = 'react_' + postId + '_' + type;
      const countEl = btn.querySelector('.reaction-count');

      // Restore previous click state for this browser.
      if (localStorage.getItem(lockKey)) btn.classList.add('clicked');

      // Pull current count (no-op on failure).
      loadCount(postId, type, function (n) {
        if (countEl && typeof n === 'number') countEl.textContent = n;
      });

      btn.addEventListener('click', function () {
        if (localStorage.getItem(lockKey)) return; // one click per browser
        localStorage.setItem(lockKey, '1');
        btn.classList.add('clicked');

        // Optimistic increment so the UI feels instant.
        if (countEl) {
          const prev = parseInt(countEl.textContent, 10) || 0;
          countEl.textContent = prev + 1;
        }

        // Bump animation
        const emoji = btn.querySelector('.reaction-emoji');
        if (emoji) {
          emoji.classList.remove('bump');
          // Force reflow to restart the animation.
          void emoji.offsetWidth;
          emoji.classList.add('bump');
          setTimeout(function () { emoji.classList.remove('bump'); }, 600);
        }

        sendUp(postId, type);
      });
    });
  }

  function counterKey(postId, type) { return postId + '-' + type; }

  function loadCount(postId, type, cb) {
    const url = COUNTER_API + '/' + counterKey(postId, type) + '/';
    safeFetchJson(url, function (data) {
      if (data && typeof data.count === 'number') cb(data.count);
    });
  }

  function sendUp(postId, type) {
    const url = COUNTER_API + '/' + counterKey(postId, type) + '/up';
    safeFetchJson(url, function () { /* fire-and-forget */ });
  }

  function safeFetchJson(url, cb) {
    try {
      fetch(url, { mode: 'cors' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { cb(j); })
        .catch(function () { /* counterapi down — keep site working */ });
    } catch (e) { /* very old browsers */ }
  }
})();
