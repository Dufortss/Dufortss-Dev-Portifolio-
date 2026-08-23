document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const form = document.querySelector('#ideaForm');
  const list = document.querySelector('#commentsList');
  const message = document.querySelector('#formMessage');
  if (!form || !list) return;

  const escapeText = value => String(value ?? '').replace(/[<>]/g, '');
  const formatDate = value => new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short'
  }).format(new Date(value));

  function avatarHTML(name, url) {
    const safeName = escapeText(name);
    if (url) return `<img class="comment-avatar" src="${url}" alt="Avatar de ${safeName}" referrerpolicy="no-referrer">`;
    return `<div class="comment-avatar comment-avatar-fallback">${safeName.charAt(0).toUpperCase()}</div>`;
  }

  function renderComments(comments) {
    if (!comments.length) {
      list.innerHTML = '<div class="empty">Ainda não há ideias. Seja o primeiro a publicar uma.</div>';
      return;
    }
    list.innerHTML = comments.map(c => `
      <article class="comment-card">
        <div class="comment-head">
          ${avatarHTML(c.name, c.imageUrl)}
          <div class="comment-meta"><strong>${escapeText(c.name)}</strong><time>${formatDate(c.createdAt)}</time></div>
        </div>
        <p class="comment-text">${escapeText(c.idea)}</p>
        ${c.reply ? `<div class="reply"><b>DUFORT RESPONDEU</b><p>${escapeText(c.reply)}</p></div>` : ''}
      </article>
    `).join('');
  }

  async function loadComments() {
    try {
      const res = await fetch('/api/comments');
      if (!res.ok) throw new Error();
      renderComments(await res.json());
    } catch {
      list.innerHTML = '<div class="empty">Comentários ainda não estão conectados ao servidor.</div>';
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    message.textContent = 'Publicando...';
    const payload = {
      name: document.querySelector('#commentName').value,
      imageUrl: document.querySelector('#commentImage').value,
      idea: document.querySelector('#commentIdea').value
    };
    if (/[<>]/.test(payload.name) || /[<>]/.test(payload.idea)) {
      message.textContent = 'HTML e tags não são permitidos.';
      return;
    }
    try {
      const res = await fetch('/api/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível publicar.');
      form.reset();
      message.textContent = 'Ideia publicada!';
      await loadComments();
    } catch (err) {
      message.textContent = err.message;
    }
  });

  loadComments();
});
