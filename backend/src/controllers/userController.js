import { createUser, findUserByPseudo } from '../models/userModel.js';
import bcrypt from 'bcrypt';

export async function register(req, res) {
    const { pseudo, mdp } = req.body;

    if (!mdp || mdp.length < 8) {
        return res
            .status(400)
            .json({ message: 'Mot de passe trop court (min 8 caractères)' });
    }

    const alnumRegex = /^[a-zA-Z0-9]+$/; // que lettres + chiffres, au moins 1 char [web:161]
    if (!alnumRegex.test(pseudo)) {
        return res
            .status(400)
            .json({ message: 'Le pseudo doit contenir uniquement des lettres et des chiffres (sans espace, ni caractères spéciaux)' });
    }

    const existingUser = await findUserByPseudo(pseudo);
    if (existingUser) {
        return res.status(400).json({ message: 'Pseudo déjà pris' });
    }

    const mdpHash = await bcrypt.hash(mdp, 10);
    await createUser(pseudo, mdpHash);

    return res.status(201).json({ message: 'Compte créé' });
}

export async function login(req, res) {
    const { pseudo, mdp } = req.body;

    if (!pseudo || !mdp) {
        return res.status(400).json({ message: 'Pseudo et mot de passe sont obligatoires' });
    }

    const user = await findUserByPseudo(pseudo);
    if (!user) {
        return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const ok = await bcrypt.compare(mdp, user.mdp);
    if (!ok) {
        return res.status(400).json({ message: 'Identifiants invalides' });
    }

    req.session.user = {
        id: user.id,
        pseudo: user.pseudo
    };

    req.session.user = {
        id: user.id,
        pseudo: user.pseudo
    };

    return res.status(200).json({ message: 'Connexion réussie' });
}



