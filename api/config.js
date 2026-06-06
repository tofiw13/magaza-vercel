// Frontend üçün açıq konfiqurasiya (anon açar + ödəniş məlumatı + kampaniya tarixi)
const { supabase } = require('../lib/supabase');
module.exports = async (req, res) => {
  let campaignEndsAt = null;
  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'campaign_ends_at').maybeSingle();
    campaignEndsAt = data?.value || null;
  } catch (e) { /* cədvəl yoxdursa null qalır */ }
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    paymentInfo: process.env.PAYMENT_INFO || 'Kapital Bank · 4169 7388 0083 1020 · Tofig N***',
    campaignEndsAt,
  });
};
