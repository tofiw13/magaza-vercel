// Məhsullar siyahısı (flash sale ilə)
const { supabase } = require('../lib/supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Məhsulları al
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, description, price, currency, emoji, rating_avg, rating_count, category')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Aktiv flash sales-ları al
    const now = new Date().toISOString();
    const { data: sales } = await supabase
      .from('flash_sales')
      .select('product_id, sale_price, discount_percent')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now);

    // Flash sale map-i
    const saleMap = {};
    (sales || []).forEach(s => {
      saleMap[s.product_id] = { sale_price: s.sale_price, discount: s.discount_percent };
    });

    // Məhsullara sale_price əlavə et
    const result = (products || []).map(p => ({
      ...p,
      sale_price: saleMap[p.id]?.sale_price || null,
      discount_percent: saleMap[p.id]?.discount || null
    }));

    res.json(result);
  } catch (e) {
    console.error('products error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
