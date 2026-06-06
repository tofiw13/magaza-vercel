// Frontend üçün açıq konfiqurasiya (anon açar + ödəniş məlumatı + kampaniya)
const { supabase } = require('../lib/supabase');
module.exports = async (req, res) => {
  let campaignEndsAt = null;
  let campaignPercent = 0;
  let maintenance = false;
  try {
    const { data } = await supabase.from('app_settings').select('key,value')
      .in('key', ['campaign_ends_at', 'campaign_percent', 'maintenance']);
    (data || []).forEach((r) => {
      if (r.key === 'campaign_ends_at') campaignEndsAt = r.value || null;
      if (r.key === 'campaign_percent') campaignPercent = parseInt(r.value, 10) || 0;
      if (r.key === 'maintenance') maintenance = r.value === '1' || r.value === 'true';
    });
  } catch (e) { /* cədvəl yoxdursa default qalır */ }
  // Kampaniya yalnız tarix gələcəkdədirsə və faiz >0 olarsa aktivdir
  const active = campaignPercent > 0 && campaignEndsAt && new Date(campaignEndsAt).getTime() > Date.now();
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    paymentInfo: process.env.PAYMENT_INFO || 'Kapital Bank · 4169 7388 0083 1020 · Tofig N***',
    campaignEndsAt: active ? campaignEndsAt : null,
    campaignPercent: active ? campaignPercent : 0,
    maintenance,
  });
};
