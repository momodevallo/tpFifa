import pool from '../config/db.js';

// Retourne toutes les annonces du marché avec infos joueur.
export async function recupererToutesLesAnnonces() {
    try {
        const [rows] = await pool.query(
            `SELECT am.id as annonce_id, am.carte_id, am.vendeur_id, am.prix,
                    u.pseudo as vendeur_pseudo,
                    j.id as joueur_id, j.nom, j.poste, j.note, j.qualite, j.image_url, j.nationalite, j.club
             FROM annonces_marche am
             JOIN cartes c ON am.carte_id = c.id
             JOIN joueurs j ON c.joueur_id = j.id
             JOIN utilisateurs u ON am.vendeur_id = u.id
             ORDER BY am.prix ASC, j.note DESC`
        );
        return rows;
    } catch (erreur) {
        console.error('Erreur recupererToutesLesAnnonces:', erreur);
        throw erreur;
    }
}

// Crée une annonce marché.
export async function creerAnnonceMarche(carteId, vendeurId, prix) {
    try {
        const [result] = await pool.query(
            'INSERT INTO annonces_marche (carte_id, vendeur_id, prix) VALUES (?, ?, ?)',
            [carteId, vendeurId, prix]
        );
        return result.insertId;
    } catch (erreur) {
        if (erreur.code === 'ER_DUP_ENTRY') {
            throw new Error('Cette carte est déjà en vente');
        }
        console.error('Erreur creerAnnonceMarche:', erreur);
        throw erreur;
    }
}

// Supprime une annonce par son id.
export async function supprimerAnnonceMarche(annonceId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM annonces_marche WHERE id = ?',
            [annonceId]
        );
        return result.affectedRows > 0;
    } catch (erreur) {
        console.error('Erreur supprimerAnnonceMarche:', erreur);
        throw erreur;
    }
}

// Retourne une annonce précise.
export async function recupererAnnonceParId(annonceId) {
    try {
        const [rows] = await pool.query(
            `SELECT am.id as annonce_id, am.carte_id, am.vendeur_id, am.prix,
                    u.pseudo as vendeur_pseudo,
                    j.id as joueur_id, j.nom, j.poste, j.note, j.qualite, j.image_url
             FROM annonces_marche am
             JOIN cartes c ON am.carte_id = c.id
             JOIN joueurs j ON c.joueur_id = j.id
             JOIN utilisateurs u ON am.vendeur_id = u.id
             WHERE am.id = ?`,
            [annonceId]
        );
        return rows[0] || null;
    } catch (erreur) {
        console.error('Erreur recupererAnnonceParId:', erreur);
        throw erreur;
    }
}

// Supprime toutes les annonces liées à une carte.
export async function supprimerAnnonceParCarte(carteId) {
    try {
        const [result] = await pool.query(
            'DELETE FROM annonces_marche WHERE carte_id = ?',
            [carteId]
        );
        return result.affectedRows > 0;
    } catch (erreur) {
        console.error('Erreur supprimerAnnonceParCarte:', erreur);
        throw erreur;
    }
}
