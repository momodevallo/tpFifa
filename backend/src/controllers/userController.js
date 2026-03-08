import { creerUtilisateur, trouverUtilisateurParPseudo } from '../models/userModel.js';
import bcrypt from 'bcrypt';

// Inscrit un nouvel utilisateur après validation simple des champs.
export async function inscrireUtilisateur(req, res) {
    const { pseudo, mdp } = req.body;

    if (!mdp || mdp.length < 8) {
        return res.status(400).json({ message: 'Mot de passe trop court (min 8 caractères)' });
    }

    const regexAlphaNum = /^[a-zA-Z0-9]+$/;
    if (!regexAlphaNum.test(pseudo)) {
        return res.status(400).json({
            message: 'Le pseudo doit contenir uniquement des lettres et des chiffres (sans espace, ni caractères spéciaux)'
        });
    }

    const utilisateurExistant = await trouverUtilisateurParPseudo(pseudo);
    if (utilisateurExistant) {
        return res.status(400).json({ message: 'Pseudo déjà pris' });
    }

    const hashMdp = await bcrypt.hash(mdp, 10);
    await creerUtilisateur(pseudo, hashMdp);

    return res.status(201).json({ message: 'Compte créé' });
}

// Vérifie les identifiants d'un utilisateur.
export async function connecterUtilisateur(req, res) {
    const { pseudo, mdp } = req.body;

    if (!pseudo || !mdp) {
        return res.status(400).json({ message: 'Pseudo et mot de passe sont obligatoires' });
    }

    const utilisateur = await trouverUtilisateurParPseudo(pseudo);
    if (!utilisateur) {
        return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const motDePasseOk = await bcrypt.compare(mdp, utilisateur.mdp);
    if (!motDePasseOk) {
        return res.status(400).json({ message: 'Identifiants invalides' });
    }

    return res.status(200).json({
        message: 'Connexion réussie',
        userId: utilisateur.id,
        pseudo: utilisateur.pseudo
    });
}
