import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';

import createAuthRouter from './routes/authRoutes.js';
import createHomeRouter from './routes/homeRoutes.js';
import imageRouter from './routes/imageRoutes.js';
import cartesRouter from './routes/cartesRoutes.js';
import joueursRouter from './routes/joueursRoutes.js';
import marketplaceRouter from './routes/marketplaceRoutes.js';
import pool from "./config/db.js";

dotenv.config();
const PORT = process.env.PORT || 8000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '../..', 'frontend', 'public');

const app = express();

// utile si déploiement derrière un proxy (Apache/Nginx)
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    name: 'tpFifa.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        // IMPORTANT: si tu es en http (dev / proxy), secure:true empêche le cookie => plus de session
        secure: false,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.get('/', (req, res) => {
    if (req.session?.user) return res.redirect('/accueil');
    return res.sendFile(path.join(publicPath, 'auth', 'login.html'));
});

app.use((req, res, next) => {
    const isHtml = req.path.endsWith('.html');
    const isAuth = req.path.startsWith('/auth/');
    const isPublic = req.path === '/index.html'; // optionnel

    // /accueil est une page (route) mais ne finit pas par .html
    const isPageRoute = req.path === '/accueil';

    if ((isHtml || isPageRoute) && !isAuth && !isPublic) {
        if (req.session?.user) return next();
        return res.redirect('/auth/login');
    }
    next();
});

app.use('/auth', createAuthRouter(publicPath));
app.use('/', createHomeRouter(publicPath));
app.use('/', imageRouter);
app.use('/api/cards', cartesRouter);
app.use('/api/packs', joueursRouter);
app.use('/api/marketplace', marketplaceRouter);

app.use(express.static(publicPath));

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
});