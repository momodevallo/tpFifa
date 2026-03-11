export async function verifierSessionApi(req, res, next) {
  if (!req.session) return res.status(401).json({ message: 'Non authentifié' });
  next();
}