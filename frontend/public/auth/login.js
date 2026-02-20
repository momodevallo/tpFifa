const form = document.getElementById('login');
const errorDiv = document.getElementById('error');
const toast = document.getElementById('toast');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  errorDiv.textContent = '';

  const formData = new FormData(form);
  const data = {
    pseudo: formData.get('pseudo'),
    mdp: formData.get('mdp'),
  };

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ IMPORTANT : permet de recevoir + renvoyer le cookie de session
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      errorDiv.textContent = json.message || 'Erreur de connexion';
      return;
    }

    // (optionnel) tu peux garder ça, mais la "vraie" auth = session côté serveur
    localStorage.setItem('userId', json.userId);
    localStorage.setItem('pseudo', json.pseudo);

    window.location.href = '/accueil';
  } catch (err) {
    console.error(err);
    errorDiv.textContent = 'Erreur réseau';
  }
});
