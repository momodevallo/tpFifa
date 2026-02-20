import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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

app.use((req, res, next) => {
    console.log('REQUETE:', req.method, req.url);
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'auth', 'login.html'));
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
