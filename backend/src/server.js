import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const PORT = Number(process.env.PORT || 8000);
const app = await createApp();

app.listen(PORT, () => {
  console.log(`Serveur Node lancé sur http://localhost:${PORT}`);
});