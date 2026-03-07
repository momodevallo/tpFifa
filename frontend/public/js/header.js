(function () {
    const mount = document.getElementById('tp-header');
    if (!mount) return;

    if (!document.getElementById('tp-header-styles')) {
        const style = document.createElement('style');
        style.id = 'tp-header-styles';
        style.textContent = `
          .tp-header-simple { display:flex; justify-content:space-between; align-items:center; gap:1rem; }
          .tp-header-left { display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }
          .coins-wrap { display:flex; align-items:center; gap:.8rem; }
          .coins-wrap .coins { padding:.55rem .9rem; border-radius:999px; background:rgba(0,0,0,.28); font-weight:700; }
          .btn-regenerate {
            background:#f1c40f; color:#222; border:none; border-radius:8px;
            padding:.5rem .8rem; cursor:pointer; font-weight:700; transition:.2s;
          }
          .btn-regenerate:hover { transform:scale(1.04); }
          .logo, .logo-img, .coin-icon { display:none !important; }
        `;
        document.head.appendChild(style);
    }

    mount.innerHTML = `
    <header class="tp-header-simple">
      <div class="tp-header-left">
        <span class="greeting">Salut <strong id="pseudo">Joueur</strong></span>
        <div class="coins-wrap">
          <div class="coins">Crédits : <span id="money">...</span></div>
          <button id="regenCredits" class="btn-regenerate" type="button">+ crédits</button>
        </div>
      </div>
      <button id="logout" class="btn-logout" type="button">Déconnexion</button>
    </header>

    <nav class="main-nav">
      <button class="nav-btn" data-page="accueil" data-href="/accueil.html">Mon Équipe</button>
      <button class="nav-btn" data-page="boutique" data-href="/boutique.html">Boutique</button>
      <button class="nav-btn" data-page="marche" data-href="/marche.html">Marché</button>
      <button class="nav-btn" data-page="composition" data-href="/composition.html">Composition</button>
      <button class="nav-btn" data-page="mes-joueurs" data-href="/mes-joueurs.html">Mes joueurs</button>
    </nav>
  `;

    document.querySelectorAll('.main-nav .nav-btn[data-href]').forEach((btn) => {
        btn.addEventListener('click', () => (window.location.href = btn.dataset.href));
    });

    const p = window.location.pathname;
    const current =
        p.includes('boutique') ? 'boutique' :
        p.includes('marche') ? 'marche' :
        p.includes('composition') ? 'composition' :
        p.includes('mes-joueurs') ? 'mes-joueurs' :
        p.includes('accueil') ? 'accueil' : '';

    document.querySelectorAll('.main-nav .nav-btn').forEach((b) => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.main-nav .nav-btn[data-page="${current}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    function getResponseKind(res) {
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (res.status === 401 || res.status === 403) return 'unauthorized';
        if (res.redirected || res.url.includes('/login')) return 'login-page';
        if (contentType.includes('application/json')) return 'json';
        if (contentType.includes('text/html')) return 'html';
        return 'other';
    }

    async function safeJsonFetch(url, options = {}) {
        const res = await fetch(url, { credentials: 'same-origin', ...options });
        const kind = getResponseKind(res);

        if (kind === 'unauthorized' || kind === 'login-page') {
            window.location.href = '/login';
            return null;
        }

        if (!res.ok) {
            let message = `Erreur ${res.status}`;
            try {
                if (kind === 'json') {
                    const data = await res.json();
                    message = data?.message || data?.error || message;
                }
            } catch (_) {}
            throw new Error(message);
        }

        if (kind !== 'json') {
            throw new Error('Réponse invalide du serveur');
        }

        return res.json();
    }

    async function loadUserInfo() {
        try {
            const [user, credits] = await Promise.all([
                safeJsonFetch('/api/moi'),
                safeJsonFetch('/api/moi/credits')
            ]);

            if (!user || !credits) return;
            document.getElementById('pseudo').textContent = user.pseudo;
            document.getElementById('money').textContent = credits.credits;
        } catch (e) {
            console.error('Erreur chargement session :', e);
            document.getElementById('money').textContent = 'Erreur';
        }
    }

    loadUserInfo();

    const regenBtn = document.getElementById('regenCredits');
    regenBtn?.addEventListener('click', async () => {
        try {
            regenBtn.disabled = true;
            const data = await safeJsonFetch('/api/moi/credits/regenerer', { method: 'POST' });
            if (data) {
                document.getElementById('money').textContent = data.credits;
            }
        } catch (e) {
            console.error(e);
            alert(e.message || 'Impossible de régénérer les crédits');
        } finally {
            regenBtn.disabled = false;
        }
    });

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
            window.location.href = '/login?logout';
        });
    }
})();
