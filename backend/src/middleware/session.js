import { sessions } from '../state/runtime.js';
import { lireCookies } from '../services/requestService.js';

export async function chargerSession(req, _res, next) {
  req.cookies = await lireCookies(req.headers.cookie || '');
  const sid = req.cookies.sid;
  req.session = sid && sessions.has(sid) ? sessions.get(sid) : null;
  next();
}