module.exports = (req, res) => res.json({ ok: true, demo: !process.env.STRIPE_SECRET_KEY });
