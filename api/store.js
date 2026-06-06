// Birləşmiş API (Vercel funksiya limitinə qənaət üçün):
//   GET  /api/store?action=promo&code=XXX        → promo kodu yoxla
//   POST /api/store  body={action:'rate', product_id, stars}  → reytinq ver (1-5)
const { supabase } = require('../lib/supabase');
const { getUser, ensureProfile } = require('../lib/user');

module.exports = async (req, res) => {
  const action = (req.query.action || req.body?.action || '').toString();

  // ---------- PROMO KODU YOXLA (giriş tələb olunmur) ----------
  if (req.method === 'GET' && action === 'promo') {
    const code = (req.query.code || '').toString().trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Kod boşdur.' });
    const { data: promo } = await supabase
      .from('promo_codes').select('*').eq('code', code).maybeSingle();
    if (!promo || !promo.active) return res.status(404).json({ error: 'Kod tapılmadı və ya aktiv deyil.' });
    if (promo.expires_at && new Date(promo.expires_at) < new Date())
      return res.status(410).json({ error: 'Kodun müddəti bitib.' });
    if (promo.max_uses != null && promo.used_count >= promo.max_uses)
      return res.status(409).json({ error: 'Kodun istifadə limiti dolub.' });
    return res.json({ code: promo.code, discount_percent: promo.discount_percent });
  }

  // ---------- REYTİNQ VER (giriş tələb olunur) ----------
  if (req.method === 'POST' && action === 'rate') {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Əvvəlcə daxil ol.' });
    await ensureProfile(user);

    const productId = (req.body?.product_id || '').toString();
    const stars = parseInt(req.body?.stars, 10);
    if (!productId || !(stars >= 1 && stars <= 5))
      return res.status(400).json({ error: 'Yanlış reytinq (1-5 olmalıdır).' });

    // Məhsul mövcuddurmu?
    const { data: product } = await supabase.from('products').select('id').eq('id', productId).maybeSingle();
    if (!product) return res.status(404).json({ error: 'Məhsul tapılmadı.' });

    // Əvvəlki reytinq varmı? (yeniləmə üçün fərqi hesablayaq)
    const { data: prev } = await supabase
      .from('ratings').select('stars').eq('product_id', productId).eq('user_id', user.id).maybeSingle();

    // Reytinqi upsert et
    const up = await supabase.from('ratings').upsert(
      { product_id: productId, user_id: user.id, stars },
      { onConflict: 'product_id,user_id' }
    );
    if (up.error) return res.status(500).json({ error: up.error.message });

    // products.rating_sum / rating_count yenilə
    const { data: prod } = await supabase
      .from('products').select('rating_sum,rating_count').eq('id', productId).single();
    let sum = prod?.rating_sum || 0;
    let count = prod?.rating_count || 0;
    if (prev) {
      sum = sum - prev.stars + stars; // mövcud reytinqi dəyiş
    } else {
      sum = sum + stars; count = count + 1; // yeni reytinq
    }
    await supabase.from('products').update({ rating_sum: sum, rating_count: count }).eq('id', productId);

    const avg = count ? sum / count : 0;
    return res.json({ ok: true, average: avg, count });
  }

  return res.status(400).json({ error: 'Naməlum əməliyyat.' });
};
