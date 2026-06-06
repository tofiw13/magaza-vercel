// Promo kod yoxlama və tətbiq etmə
const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET - Promo kod yoxla
  if (req.method === 'GET') {
    const code = (req.query.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ error: 'Promo kod daxil edin.' });

    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .single();

      if (error || !promo) {
        return res.status(404).json({ error: 'Bu promo kod etibarsızdır.' });
      }

      // Vaxt bitibsə
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Bu promo kodun vaxtı bitib.' });
      }

      // İstifadə limiti bitibsə
      if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
        return res.status(400).json({ error: 'Bu promo kod artıq istifadə olunub.' });
      }

      res.json({
        code: promo.code,
        discount_percent: promo.discount_percent,
        discount_fixed: promo.discount_fixed,
        min_order: promo.min_order
      });
    } catch (e) {
      res.status(500).json({ error: 'Server xətası.' });
    }
  } else {
    res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }
};
