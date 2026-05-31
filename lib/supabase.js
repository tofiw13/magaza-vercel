const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) console.warn('SUPABASE_URL/SERVICE_ROLE_KEY teyin olunmayib.');
const supabase = createClient(url || 'http://localhost', key || 'missing', { auth: { persistSession: false } });
module.exports = { supabase };
