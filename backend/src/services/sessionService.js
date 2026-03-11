import crypto from 'crypto';
import { sessions } from '../state/runtime.js';

export async function creerSession(user) {
  const sid = crypto.randomUUID();
  sessions.set(sid, { ...user, createdAt: Date.now() });
  return sid;
}

export async function poserCookieSession(res, sid) {
  res.setHeader('Set-Cookie', `sid=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
}

export async function supprimerCookieSession(res) {
  res.setHeader('Set-Cookie', 'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}