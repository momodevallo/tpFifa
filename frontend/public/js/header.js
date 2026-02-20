// frontend/public/js/header.js
(function () {
    const mount = document.getElementById("tp-header");
    if (!mount) return;

    mount.innerHTML = `
    <header>
      <div class="logo">
        <img src="/img/logo.png" alt="TP FIFA" class="logo-img">
      </div>


      <div class="user-info">
        <span class="greeting">Salut <strong id="pseudo">Joueur</strong></span>
        <div class="coins">
          <img class="coin-icon"
            src="https://gmedia.playstation.com/is/image/SIEPDC/fifa-ultimate-team-coins-01-ps4-ps5-en-09sep21?$native--t$"
            alt="coins">
          <span id="money">10000</span>
        </div>
      </div>

      <button id="logout" class="btn-logout">Déconnexion</button>
    </header>

    <nav class="main-nav">
      <button class="nav-btn" data-page="accueil" data-href="/accueil">Mon Équipe</button>
      <button class="nav-btn" data-page="boutique" data-href="/boutique.html">Boutique</button>
      <button class="nav-btn" data-page="marche" data-href="/marche.html">Marché des Transferts</button>
      <button class="nav-btn" data-page="composition" data-href="/composition.html">Composition</button>
      <button class="nav-btn btn-play">Jouer</button>
    </nav>
  `;
    document.querySelectorAll(".main-nav .nav-btn[data-href]").forEach((btn) => {
        btn.addEventListener("click", () => (window.location.href = btn.dataset.href));
    });

    const p = window.location.pathname;
    const current =
        p.includes("boutique") ? "boutique" :
            p.includes("marche") ? "marche" :
                p.includes("composition") ? "composition" :
                    (p === "/accueil" || p.includes("accueil")) ? "accueil" :
                        "";

    document.querySelectorAll(".main-nav .nav-btn").forEach((b) => b.classList.remove("active"));
    const activeBtn = document.querySelector(`.main-nav .nav-btn[data-page="${current}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    const pseudo = localStorage.getItem("pseudo");
    const userId = localStorage.getItem("userId");

    // ✅ Auth fiable : on vérifie la session serveur à chaque chargement de page
    fetch('/auth/me', { credentials: 'include' })
        .then(async (res) => {
            if (!res.ok) {
                window.location.href = '/auth/login';
                return null;
            }
            return res.json();
        })
        .then((me) => {
            if (!me) return;

            // on synchronise localStorage (utile si l'utilisateur a perdu le localStorage)
            localStorage.setItem('userId', me.userId);
            localStorage.setItem('pseudo', me.pseudo);

            document.getElementById('pseudo').textContent = me.pseudo;
            return fetch(`/api/cards/my-cards?userId=${me.userId}`, { credentials: 'include' });
        })
        .then((res) => (res ? res.json() : null))
        .then((data) => {
            if (data?.credits !== undefined) {
                document.getElementById('money').textContent = data.credits;
            }
        })
        .catch(() => {
            window.location.href = '/auth/login';
        });

    // Logout (simple)
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            fetch('/auth/logout', { method: 'POST', credentials: 'include' })
                .catch(() => {})
                .finally(() => {
                    localStorage.removeItem("pseudo");
                    localStorage.removeItem("money");
                    localStorage.removeItem("userId");
                    window.location.href = "/auth/login";
                });
        });
    }
})();
