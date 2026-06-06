// Birləşdirilmiş mağaza API (Vercel Hobby 12 funksiya limiti üçün)
// ?action=promo | wishlist | ratings | flash-sales | chat
const { supabase } = require('../lib/supabase');
const { getUser } = require('../lib/user');

const TG = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT = process.env.TELEGRAM_CHAT_ID;

async function tg(method, body) {
  if (!TG) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await r.json();
  } catch (e) {
    console.error('tg error:', e.message);
    return null;
  }
}

const AUTO_ANSWERS = [
  { keywords: ['salam', 'hello', 'hi', 'hey'], answer: 'Salam! 👋 Sizə necə kömək edə bilərəm?' },
  { keywords: ['balans', 'artır', 'pul', 'ödəniş'], answer: '💰 Balans artırmaq üçün: 1) Hesabınıza daxil olun 2) "+" düyməsinə basın 3) Ödəniş məlumatlarını daxil edin 4) Qəbz şəklini yükləyin. Təsdiqdən sonra balansınız avtomatik artacaq.' },
  { keywords: ['al', 'məhsul', 'səbət', 'alış'], answer: '🛒 Məhsul almaq üçün: 1) Məhsulu seçin və "Səbətə at" düyməsinə basın 2) "Al (balansla)" düyməsinə basın 3) Yükləmə linkini alın.' },
  { keywords: ['telegram', 'əlaqə', 'yaz'], answer: '📱 Telegram-da bizimlə əlaqə saxlamaq üçün: @onlinebeledci' },
  { keywords: ['xal', 'point', 'sadiqlik'], answer: '⭐ Hər 1₼ alış üçün 1 xal qazanırsınız. 100 xal = 1₼ dəyərində endirim!' },
  { keywords: ['promo', 'kod', 'endirim'], answer: '🎁 Promo kodları "Promo kod" sahəsinə daxil edin və "Tətbiq et" düyməsinə basın.' },
  { keywords: ['flash', 'sale', 'kampaniya'], answer: '🔥 Flash Sale kampaniyaları zamanında məhsullar endirimli olur!' },
  { keywords: ['wishlist', 'sevimli'], answer: '❤️ Məhsul kartındakı ürək işarəsinə basaraq sevimlilərə əlavə edə bilərsiniz.' },
  { keywords: ['çatdırılma', 'yüklə', 'download'], answer: '📥 Alışdan dərhal sonra yükləmə linki alacaqsınız. Link 1 saat etibarlıdır.' },
  { keywords: ['problem', 'xəta', 'işləm'], answer: '⚠️ Problem yaşayırsınız? Telegram-da @onlinebeledci ilə əlaqə saxlayın!' },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || '';

  // ========== PROMO ==========
  if (action === 'promo') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Metod dəstəklənmir.' });
    const code = (req.query.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Promo kod daxil edin.' });
    try {
      const { data: promo, error } = await supabase
        .from('promo_codes').select('*').eq('code', code).eq('is_active', true).single();
      if (error || !promo) return res.status(404).json({ error: 'Bu promo kod etibarsızdır.' });
      if (promo.expires_at && new Date(promo.expires_at) < new Date())
        return res.status(400).json({ error: 'Bu promo kodun vaxtı bitib.' });
      if (promo.max_uses !== null && promo.used_count >= promo.max_uses)
        return res.status(400).json({ error: 'Bu promo kod artıq istifadə olunub.' });
      return res.json({
        code: promo.code, discount_percent: promo.discount_percent,
        discount_fixed: promo.discount_fixed, min_order: promo.min_order,
      });
    } catch (e) { return res.status(500).json({ error: 'Server xətası.' }); }
  }

  // ========== FLASH SALES ==========
  if (action === 'flash-sales') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Metod dəstəklənmir.' });
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('flash_sales')
        .select('id,product_id,discount_percent,original_price,sale_price,starts_at,ends_at,products(id,name,description,emoji)')
        .eq('is_active', true).lte('starts_at', now).gte('ends_at', now);
      if (error) throw error;
      const sales = (data || []).map((s) => ({
        id: s.id, product_id: s.product_id, product_name: s.products?.name,
        product_description: s.products?.description, product_emoji: s.products?.emoji,
        discount_percent: s.discount_percent, original_price: s.original_price,
        sale_price: s.sale_price, starts_at: s.starts_at, ends_at: s.ends_at,
      }));
      return res.json(sales);
    } catch (e) { return res.status(500).json({ error: 'Xəta baş verdi.' }); }
  }

  // ========== RATINGS ==========
  if (action === 'ratings') {
    if (req.method === 'GET') {
      const { product_id } = req.query;
      if (!product_id) return res.status(400).json({ error: 'product_id lazımdır.' });
      try {
        const { data, error } = await supabase
          .from('ratings').select('rating, review, created_at')
          .eq('product_id', product_id).order('created_at', { ascending: false });
        if (error) throw error;
        const avg = data.length > 0 ? data.reduce((s, r) => s + r.rating, 0) / data.length : 0;
        return res.json({ ratings: data, average: avg.toFixed(1), count: data.length });
      } catch (e) { return res.status(500).json({ error: 'Xəta baş verdi.' }); }
    }
    if (req.method === 'POST') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Daxil olun.' });
      const { product_id, rating, review } = req.body || {};
      if (!product_id || !rating) return res.status(400).json({ error: 'product_id və rating lazımdır.' });
      if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 arası olmalıdır.' });
      try {
        const { error } = await supabase.from('ratings').upsert(
          { user_id: user.id, product_id, rating, review: review || '', updated_at: new Date().toISOString() },
          { onConflict: 'user_id,product_id' }
        );
        if (error) throw error;
        return res.json({ ok: true, rating, review });
      } catch (e) { return res.status(500).json({ error: 'Reytinq verilərkən xəta.' }); }
    }
    return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }

  // ========== WISHLIST ==========
  if (action === 'wishlist') {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Daxil olun.' });
    if (req.method === 'GET') {
      try {
        const { data } = await supabase.from('wishlists').select('product_id').eq('user_id', user.id);
        return res.json({ items: (data || []).map((w) => w.product_id) });
      } catch (e) { return res.status(500).json({ error: 'Xəta baş verdi.' }); }
    }
    if (req.method === 'POST') {
      const { product_id } = req.body || {};
      if (!product_id) return res.status(400).json({ error: 'Məhsul ID lazımdır.' });
      try {
        const { data: product } = await supabase.from('products').select('id').eq('id', product_id).single();
        if (!product) return res.status(404).json({ error: 'Məhsul tapılmadı.' });
        await supabase.from('wishlists').upsert(
          { user_id: user.id, product_id }, { onConflict: 'user_id,product_id', ignoreDuplicates: true }
        );
        return res.json({ ok: true });
      } catch (e) { return res.status(500).json({ error: 'Əlavə edilərkən xəta.' }); }
    }
    if (req.method === 'DELETE') {
      const { product_id } = req.body || {};
      if (!product_id) return res.status(400).json({ error: 'Məhsul ID lazımdır.' });
      try {
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('product_id', product_id);
        return res.json({ ok: true });
      } catch (e) { return res.status(500).json({ error: 'Silinərkən xəta.' }); }
    }
    return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }

  // ========== CHAT ==========
  if (action === 'chat') {
    if (req.method === 'GET') {
      const user = await getUser(req);
      if (!user) return res.status(401).json({ error: 'Daxil olun.' });
      try {
        const { data } = await supabase.from('chat_messages').select('*')
          .eq('user_id', user.id).order('created_at', { ascending: true }).limit(50);
        return res.json({ messages: data || [] });
      } catch (e) { return res.json({ messages: [] }); }
    }
    if (req.method === 'POST') {
      const user = await getUser(req);
      const { message, name, email } = req.body || {};
      if (!message) return res.status(400).json({ error: 'Mesaj boşdur.' });
      const lowerMsg = message.toLowerCase();
      let autoAnswer = null;
      for (const item of AUTO_ANSWERS) {
        if (item.keywords.some((k) => lowerMsg.includes(k))) { autoAnswer = item.answer; break; }
      }
      if (TG && ADMIN_CHAT) {
        const userInfo = user ? user.email : (email || 'Qonaq');
        const userName = name || userInfo;
        await tg('sendMessage', {
          chat_id: ADMIN_CHAT,
          text: `💬 *Yeni Mesaj!*\n\n👤 ${userName}\n📧 ${userInfo}\n\n📝 ${message}\n\n${autoAnswer ? '✅ Avtomatik cavab verildi.' : '⏳ Cavab gözləyir...'}`,
          parse_mode: 'Markdown',
        });
      }
      try {
        if (user) await supabase.from('chat_messages').insert({ user_id: user.id, message, is_admin: false });
      } catch (e) {}
      return res.json({ ok: true, auto_answer: autoAnswer, telegram_sent: !!(TG && ADMIN_CHAT) });
    }
    return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }

  res.status(400).json({ error: 'Naməlum action.' });
};
