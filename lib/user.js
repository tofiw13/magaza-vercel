// İstifadəçi JWT-sini yoxlayıb user obyektini qaytarır + profili təmin edir
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('./supabase'); // service-role klient

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;

async function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  try {
    const client = createClient(url || 'http://localhost', anon || 'missing', { auth: { persistSession: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

// Profil yoxdursa yaradır (trigger-dən asılı deyil — auth çökərsə belə işləyir)
async function ensureProfile(user) {
  if (!user) return;
  try {
    const fullName = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || '';
    await supabase.from('profiles').upsert(
      { id: user.id, email: user.email, full_name: fullName },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  } catch (e) {
    console.error('ensureProfile error:', e.message);
  }
}

module.exports = { getUser, ensureProfile };
