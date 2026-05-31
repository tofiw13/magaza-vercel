// Admin: balans sorğularını gör və təsdiqlə/rədd et
const { supabase } = require('../../lib/supabase');
const { isAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'İcazə yoxdur.' });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('topups').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    // qəbz şəkilləri üçün imzalı linklər
    const list = [];
    for (const t of data || []) {
      let receiptUrl = null;
      if (t.receipt_path) {
        const s = await supabase.storage.from('receipts').createSignedUrl(t.receipt_path, 3600);
        receiptUrl = s?.data?.signedUrl || null;
      }
      list.push({ ...t, receiptUrl });
    }
    return res.json(list);
  }

  if (req.method === 'POST') {
    const id = req.body?.id;
    const action = req.body?.action; // 'approve' | 'reject'
    if (!id || !['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'id və action lazımdır.' });

    const { data: topup, error: e1 } = await supabase.from('topups').select('*').eq('id', id).single();
    if (e1 || !topup) return res.status(404).json({ error: 'Sorğu tapılmadı.' });
    if (topup.status !== 'pending') return res.status(400).json({ error: 'Bu sorğu artıq emal olunub.' });

    if (action === 'reject') {
      await supabase.from('topups').update({ status: 'rejected' }).eq('id', id);
      return res.json({ ok: true });
    }

    // approve → balansı artır
    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', topup.user_id).single();
    const newBalance = (profile?.balance || 0) + topup.amount;
    const upd = await supabase.from('profiles').update({ balance: newBalance }).eq('id', topup.user_id);
    if (upd.error) return res.status(500).json({ error: upd.error.message });
    await supabase.from('topups').update({ status: 'approved' }).eq('id', id);
    return res.json({ ok: true, newBalance });
  }

  res.status(405).json({ error: 'Metod dəstəklənmir.' });
};
