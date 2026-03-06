const form = document.getElementById('register');
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
        const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        const json = await res.json();

        if (!res.ok) {
            errorDiv.textContent = json.message || 'Erreur';
            return;
        }

        showToast(json.message || 'Compte créé');
        form.reset();

        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
    } catch (err) {
        console.error(err);
        errorDiv.textContent = 'Erreur réseau, réessaie plus tard';
    }
});

function showToast(message) {
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => {
        toast.className = 'toast';
    }, 1500);
}
