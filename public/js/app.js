window.PostHub = (function () {
  function toast(message, type) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function applyReactionUI(root, state) {
    if (!root || !state) return;
    const likeBtn = root.querySelector('[data-react="like"]');
    const dislikeBtn = root.querySelector('[data-react="dislike"]');
    const likeCount = root.querySelector('[data-react-count="like"]');
    if (likeBtn) likeBtn.classList.toggle('text-white', !!state.liked);
    if (likeBtn) likeBtn.classList.toggle('active-like', !!state.liked);
    if (dislikeBtn) dislikeBtn.classList.toggle('text-white', !!state.disliked);
    if (dislikeBtn) dislikeBtn.classList.toggle('active-dislike', !!state.disliked);
    if (likeCount) likeCount.textContent = state.likes > 0 ? String(state.likes) : '';
  }

  async function react(url, root) {
    const prev = {
      liked: root.querySelector('[data-react="like"]')?.classList.contains('active-like'),
      disliked: root.querySelector('[data-react="dislike"]')?.classList.contains('active-dislike'),
      likes: parseInt(root.querySelector('[data-react-count="like"]')?.textContent || '0', 10) || 0
    };

    // optimistic flip
    const isLike = url.includes('/like');
    let next = { ...prev };
    if (isLike) {
      next.liked = !prev.liked;
      next.disliked = false;
      next.likes = prev.likes + (next.liked ? 1 : -1) - (prev.disliked ? 0 : 0);
      if (!prev.liked && prev.disliked) next.likes = prev.likes + 1;
      if (prev.liked) next.likes = Math.max(0, prev.likes - 1);
      if (!prev.liked) next.likes = prev.likes + 1;
    } else {
      next.disliked = !prev.disliked;
      if (prev.liked) {
        next.liked = false;
        next.likes = Math.max(0, prev.likes - 1);
      }
    }
    applyReactionUI(root, next);

    try {
      const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'ajax=1', {
        headers: { Accept: 'application/json' }
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error('failed');
      applyReactionUI(root, data);
    } catch (e) {
      applyReactionUI(root, prev);
      toast('Could not update reaction', 'error');
    }
  }

  function bindReactions(scope) {
    (scope || document).querySelectorAll('[data-react-url]').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const root = btn.closest('[data-reaction-root]');
        react(btn.getAttribute('data-react-url'), root);
      });
    });
  }

  function renderMarkdown(scope) {
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') return;
    (scope || document).querySelectorAll('[data-md]').forEach(el => {
      if (el.dataset.rendered) return;
      el.dataset.rendered = '1';
      const raw = el.getAttribute('data-md') || el.textContent || '';
      el.innerHTML = DOMPurify.sanitize(marked.parse(raw));
    });
  }

  async function loadMorePosts() {
    const btn = document.getElementById('load-more-posts');
    const list = document.getElementById('posts-list');
    const skel = document.getElementById('feed-skeleton');
    if (!btn || !list) return;
    const cursor = btn.dataset.cursor;
    if (!cursor) return;

    btn.disabled = true;
    if (skel) skel.classList.remove('hidden');
    try {
      const res = await fetch('/api/posts?before=' + encodeURIComponent(cursor));
      const data = await res.json();
      if (!data.ok) throw new Error('fail');
      list.insertAdjacentHTML('beforeend', data.html);
      bindReactions(list);
      renderMarkdown(list);
      initCommentUI(list);
      if (data.hasMore && data.nextCursor) {
        btn.dataset.cursor = data.nextCursor;
        btn.disabled = false;
      } else {
        btn.classList.add('hidden');
      }
    } catch (e) {
      toast('Failed to load more posts', 'error');
      btn.disabled = false;
    } finally {
      if (skel) skel.classList.add('hidden');
    }
  }

  function revealBatch(panel) {
    const items = Array.from(panel.querySelectorAll(':scope > .comment-item'));
    let shown = parseInt(panel.dataset.shown || '0', 10);
    const page = parseInt(panel.dataset.page || '20', 10);
    const next = Math.min(shown + page, items.length);
    for (let i = shown; i < next; i++) items[i].classList.remove('hidden');
    panel.dataset.shown = String(next);
    const loadBtn = panel.querySelector(':scope > .load-more-comments, :scope > .load-more-replies');
    if (loadBtn) {
      if (next < items.length) loadBtn.classList.remove('hidden');
      else loadBtn.classList.add('hidden');
    }
  }

  function initCommentUI(scope) {
    const root = scope || document;
    root.querySelectorAll('.show-top-comments, .view-replies').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const panel = document.getElementById(btn.getAttribute('data-panel'));
        if (!panel) return;
        const count = btn.getAttribute('data-count');
        if (panel.classList.contains('hidden')) {
          panel.classList.remove('hidden');
          if (parseInt(panel.dataset.shown || '0', 10) === 0) revealBatch(panel);
          btn.textContent = btn.classList.contains('show-top-comments') ? 'Hide comments' : 'Hide replies';
        } else {
          panel.classList.add('hidden');
          if (btn.classList.contains('show-top-comments')) {
            btn.textContent = count + ' Comment' + (count === '1' ? '' : 's');
          } else {
            btn.textContent = count + ' ' + (count === '1' ? 'reply' : 'replies');
          }
        }
      });
    });

    root.querySelectorAll('.load-more-comments, .load-more-replies').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const panel = document.getElementById(btn.getAttribute('data-panel'));
        if (panel) revealBatch(panel);
      });
    });

    root.querySelectorAll('.comment-toggle, .reply-toggle').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', () => {
        const el = document.getElementById(btn.getAttribute('data-target'));
        if (el) el.classList.toggle('hidden');
      });
    });

    root.querySelectorAll('.yt-dots').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById(btn.getAttribute('data-menu'));
        document.querySelectorAll('.yt-menu.open').forEach(m => { if (m !== menu) m.classList.remove('open'); });
        if (menu) menu.classList.toggle('open');
      });
    });

    root.querySelectorAll('.report-comment-btn').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toast('Thanks for reporting. We will review this comment.', 'success');
        btn.closest('.yt-menu')?.classList.remove('open');
      });
    });

    root.querySelectorAll('.edit-comment-btn').forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const postId = btn.getAttribute('data-post-id');
        const commentId = btn.getAttribute('data-comment-id');
        const commentEl = btn.closest('.comment');
        btn.closest('.yt-menu')?.classList.remove('open');
        if (!commentEl) return;
        const contentP = commentEl.querySelector('[data-comment-body]');
        const old = contentP ? contentP.textContent : '';
        if (contentP) contentP.style.display = 'none';
        const form = document.createElement('form');
        form.className = 'mt-2';
        form.innerHTML = `
          <input name="content" value="" class="w-full bg-transparent border-b border-[#717171] pb-1 text-sm outline-none focus:border-white" />
          <div class="flex justify-end gap-2 mt-2">
            <button type="button" class="cancel-edit px-3 py-1.5 text-sm rounded-full hover:bg-[#272727]">Cancel</button>
            <button type="submit" class="px-3 py-1.5 bg-[#3ea6ff] text-black rounded-full text-sm font-medium">Save</button>
          </div>`;
        form.querySelector('input').value = old;
        form.querySelector('.cancel-edit').addEventListener('click', () => {
          form.remove();
          if (contentP) contentP.style.display = '';
        });
        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const content = form.querySelector('input').value;
          try {
            const res = await fetch(`/comment/${postId}/edit/${commentId}?ajax=1`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
              body: 'content=' + encodeURIComponent(content)
            });
            const data = await res.json();
            if (!data.ok) throw new Error('fail');
            if (contentP) {
              contentP.textContent = content;
              contentP.style.display = '';
            }
            form.remove();
            toast('Comment updated', 'success');
          } catch (err) {
            toast('Failed to edit comment', 'error');
          }
        });
        commentEl.querySelector('.flex-1').insertBefore(form, contentP.nextSibling);
      });
    });
  }

  document.addEventListener('click', () => {
    document.querySelectorAll('.yt-menu.open').forEach(m => m.classList.remove('open'));
  });

  document.addEventListener('DOMContentLoaded', () => {
    bindReactions(document);
    renderMarkdown(document);
    initCommentUI(document);
    const loadBtn = document.getElementById('load-more-posts');
    if (loadBtn) loadBtn.addEventListener('click', loadMorePosts);

    const observerTarget = document.getElementById('infinite-sentinel');
    if (observerTarget && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          const btn = document.getElementById('load-more-posts');
          if (btn && !btn.disabled && !btn.classList.contains('hidden')) loadMorePosts();
        }
      }, { rootMargin: '200px' });
      io.observe(observerTarget);
    }
  });

  return { toast, bindReactions, renderMarkdown, initCommentUI };
})();
