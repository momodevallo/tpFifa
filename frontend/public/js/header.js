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
    if (pseudo) document.getElementById("pseudo").textContent = pseudo;

    const money = localStorage.getItem("money");
    if (money) document.getElementById("money").textContent = money;

    // Logout (simple)
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.removeItem("pseudo");
            localStorage.removeItem("money");
            window.location.href = "/auth/login";
        });
    }
})();
