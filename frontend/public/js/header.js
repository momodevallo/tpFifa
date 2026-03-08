(function () {
    const DELAI_RAFRAICHISSEMENT_HEADER = 5000;
    let timerHeader = null;
    const zoneHeader = document.getElementById('tp-header');

    if (!zoneHeader) return;

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

    zoneHeader.innerHTML = `
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
        btn.addEventListener('click', () => {
            window.location.href = btn.dataset.href;
        });
    });

    const chemin = window.location.pathname;
    const pageActive =
        chemin.includes('boutique') ? 'boutique' :
        chemin.includes('marche') ? 'marche' :
        chemin.includes('composition') ? 'composition' :
        chemin.includes('mes-joueurs') ? 'mes-joueurs' :
        chemin.includes('accueil') ? 'accueil' : '';

    document.querySelectorAll('.main-nav .nav-btn').forEach((bouton) => {
        bouton.classList.remove('active');
    });

    const boutonActif = document.querySelector(`.main-nav .nav-btn[data-page="${pageActive}"]`);
    if (boutonActif) boutonActif.classList.add('active');

    function determinerTypeReponse(reponse) {
        const typeContenu = (reponse.headers.get('content-type') || '').toLowerCase();
        if (reponse.status === 401 || reponse.status === 403) return 'non-auth';
        if (reponse.redirected || reponse.url.includes('/login')) return 'page-login';
        if (typeContenu.includes('application/json')) return 'json';
        if (typeContenu.includes('text/html')) return 'html';
        return 'autre';
    }

    async function recupererJsonSecurise(url, options = {}) {
        const reponse = await fetch(url, { credentials: 'same-origin', ...options });
        const typeReponse = determinerTypeReponse(reponse);

        if (typeReponse === 'non-auth' || typeReponse === 'page-login') {
            window.location.href = '/login';
            return null;
        }

        if (!reponse.ok) {
            let message = `Erreur ${reponse.status}`;
            try {
                if (typeReponse === 'json') {
                    const data = await reponse.json();
                    message = data?.message || data?.error || message;
                }
            } catch (_erreurLecture) {}
            throw new Error(message);
        }

        if (typeReponse !== 'json') {
            throw new Error('Réponse invalide du serveur');
        }

        return reponse.json();
    }

    async function chargerInfosUtilisateur() {
        try {
            const [utilisateur, credits] = await Promise.all([
                recupererJsonSecurise('/api/moi'),
                recupererJsonSecurise('/api/moi/credits')
            ]);

            if (!utilisateur || !credits) return;

            document.getElementById('pseudo').textContent = utilisateur.pseudo;
            document.getElementById('money').textContent = credits.credits;
        } catch (erreur) {
            console.error('Erreur chargement session :', erreur);
            document.getElementById('money').textContent = 'Erreur';
        }
    }

    function demarrerRafraichissementHeader() {
        if (timerHeader) clearInterval(timerHeader);

        timerHeader = setInterval(() => {
            chargerInfosUtilisateur().catch(() => {});
        }, DELAI_RAFRAICHISSEMENT_HEADER);

        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                chargerInfosUtilisateur().catch(() => {});
            }
        });
    }

    chargerInfosUtilisateur();
    demarrerRafraichissementHeader();

    const boutonRegen = document.getElementById('regenCredits');
    boutonRegen?.addEventListener('click', async () => {
        try {
            boutonRegen.disabled = true;
            const data = await recupererJsonSecurise('/api/moi/credits/regenerer', { method: 'POST' });
            if (data) {
                document.getElementById('money').textContent = data.credits;
            }
        } catch (erreur) {
            console.error(erreur);
            alert(erreur.message || 'Impossible de régénérer les crédits');
        } finally {
            boutonRegen.disabled = false;
        }
    });

    const boutonLogout = document.getElementById('logout');
    if (boutonLogout) {
        boutonLogout.addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
            window.location.href = '/login?logout';
        });
    }
})();
