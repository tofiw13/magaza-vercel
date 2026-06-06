const { supabase } = require('../lib/supabase');
module.exports = async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,price,currency,emoji,rating_sum,rating_count,sale_price,sale_ends_at,variants')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });

  // Qlobal kampaniya faizini oxu
  let campaignPercent = 0;
  try {
    const { data: setRows } = await supabase.from('app_settings').select('key,value')
      .in('key', ['campaign_ends_at', 'campaign_percent']);
    let cEnds = null, cPct = 0;
    (setRows || []).forEach((r) => {
      if (r.key === 'campaign_ends_at') cEnds = r.value;
      if (r.key === 'campaign_percent') cPct = parseInt(r.value, 10) || 0;
    });
    if (cPct > 0 && cEnds && new Date(cEnds).getTime() > Date.now()) campaignPercent = cPct;
  } catch (e) { /* kampaniya yoxdur */ }

  const now = Date.now();
  const out = (data || []).map((p) => {
    const count = p.rating_count || 0;
    const avg = count ? (p.rating_sum || 0) / count : 0;
    // Effektiv endirimli qiymət: məhsulun öz endirimi + qlobal kampaniya (ən ucuzu)
    let salePrice = null;
    const ownSaleActive = p.sale_price != null && p.sale_price < p.price &&
      (!p.sale_ends_at || new Date(p.sale_ends_at).getTime() > now);
    if (ownSaleActive) salePrice = p.sale_price;
    if (campaignPercent > 0) {
      const campPrice = Math.round(p.price * (100 - campaignPercent) / 100);
      salePrice = salePrice == null ? campPrice : Math.min(salePrice, campPrice);
    }
    const variantCount = Array.isArray(p.variants) ? p.variants.filter((v) => v && v.file_path).length : 0;
    return {
      id: p.id, name: p.name, description: p.description,
      price: p.price, currency: p.currency, emoji: p.emoji,
      rating_avg: Math.round(avg * 10) / 10,
      rating_count: count,
      sale_price: (salePrice != null && salePrice < p.price) ? salePrice : null,
      variant_count: variantCount,
    };
  });
  res.json(out);
};
