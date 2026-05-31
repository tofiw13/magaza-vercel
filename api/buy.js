// Balansla məhsul al (Stripe yox): balansdan çıx, sifariş yarat, yükləmə linkləri qaytar
const { supabase } = require('../lib/supabase');
const { getUser } = require('../lib/user');
const { makeToken } = require('../lib/auth');

const SIGNED_URL_TTL = 3600;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST lazımdır.' });
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Almaq üçün əvvəlcə daxil ol.' });

  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const ids = [...new Set(items.map((i) => i.id))];
    if (!ids.length) return res.status(400).json({ error: 'Səbət boşdur.' });

    const { data: products } = await supabase.from('products').select('*').in('id', ids);
    if (!products || !products.length) return res.status(400).json({ error: 'Məhsul tapılmadı.' });
    const total = products.reduce((s, p) => s + p.price, 0);

    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    const balance = profile?.balance || 0;
    if (balance < total) {
      return res.status(402).json({ error: 'Balans kifayət etmir.', need: total, balance });
    }

    // balansdan çıx
    const upd = await supabase.from('profiles').update({ balance: balance - total }).eq('id', user.id);
    if (upd.error) return res.status(500).json({ error: upd.error.message });

    // sifarişi qeyd et
    const orderKey = `bal_${user.id}_${Date.now()}`;
    const orderItems = products.map((p) => ({ id: p.id, name: p.name, price: p.price, emoji: p.emoji }));
    await supabase.from('orders').upsert(
      { order_key: orderKey, items: orderItems, total },
      { onConflict: 'order_key', ignoreDuplicates: true }
    );

    // yükləmə linkləri (proxy ilə düzgün açılır/redaktə olunur)
    const downloads = [];
    for (const p of products) {
      if (!p.file_path) continue;
      const t = makeToken('file:' + p.file_path, SIGNED_URL_TTL * 1000);
      downloads.push({ name: p.name, emoji: p.emoji, url: `/api/file?t=${encodeURIComponent(t)}` });
    }

    res.json({ ok: true, newBalance: balance - total, downloads });
  } catch (e) {
    console.error('buy error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
