const { makeToken } = require('../../lib/auth');
module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST lazimdir.' });
  const password = req.body?.password || '';
  if (password !== (process.env.ADMIN_PASSWORD || 'admin123')) return res.status(401).json({ error: 'Parol yanlisdir.' });
  res.json({ token: makeToken('admin', 43200000) });
};
