// Flash Sales API - Aktiv kampaniyaları qaytarır
const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metod dəstəklənmir.' });
  }

  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('flash_sales')
      .select(`
        id,
        product_id,
        discount_percent,
        original_price,
        sale_price,
        starts_at,
        ends_at,
        products(id, name, description, emoji)
      `)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now);

    if (error) throw error;

    const sales = (data || []).map(s => ({
      id: s.id,
      product_id: s.product_id,
      product_name: s.products?.name,
      product_description: s.products?.description,
      product_emoji: s.products?.emoji,
      discount_percent: s.discount_percent,
      original_price: s.original_price,
      sale_price: s.sale_price,
      starts_at: s.starts_at,
      ends_at: s.ends_at
    }));

    res.json(sales);
  } catch (e) {
    console.error('flash-sales error:', e.message);
    res.status(500).json({ error: 'Xəta baş verdi.' });
  }
};
