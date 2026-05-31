// Telegram webhook: "Təsdiqlə/Rədd et" düymələrini emal edir
const { supabase } = require('../lib/supabase');

const TG = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT = String(process.env.TELEGRAM_CHAT_ID || '');
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

async function tg(method, body) {
  try {
    await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch (e) { console.error('tg error:', e.message); }
}

module.exports = async (req, res) => {
  // Təhlükəsizlik: gizli token yoxlaması
  if (SECRET && req.headers['x-telegram-bot-api-secret-token'] !== SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const update = req.body || {};
  const cq = update.callback_query;
  if (!cq) return res.json({ ok: true }); // yalnız düymə basışlarını emal edirik

  // Yalnız admin (sənin chat id) təsdiq edə bilər
  const fromId = String(cq.from?.id || '');
  if (ADMIN_CHAT && fromId !== ADMIN_CHAT) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'İcazə yoxdur.' });
    return res.json({ ok: true });
  }

  const [action, idStr] = String(cq.data || '').split(':');
  const id = Number(idStr);
  let result = 'Naməlum əmr';

  if (['approve', 'reject'].includes(action) && id) {
    const { data: topup } = await supabase.from('topups').select('*').eq('id', id).single();
    if (!topup) result = 'Sorğu tapılmadı';
    else if (topup.status !== 'pending') result = 'Artıq emal olunub: ' + topup.status;
    else if (action === 'reject') {
      await supabase.from('topups').update({ status: 'rejected' }).eq('id', id);
      result = '❌ Rədd edildi';
    } else {
      const { data: prof } = await supabase.from('profiles').select('balance').eq('id', topup.user_id).single();
      const nb = (prof?.balance || 0) + topup.amount;
      await supabase.from('profiles').update({ balance: nb }).eq('id', topup.user_id);
      await supabase.from('topups').update({ status: 'approved' }).eq('id', id);
      result = `✅ Təsdiqləndi (+$${(topup.amount / 100).toFixed(2)})`;
    }
  }

  await tg('answerCallbackQuery', { callback_query_id: cq.id, text: result });
  // Mesaja nəticəni əlavə et (düymələri sil)
  if (cq.message) {
    const chatId = cq.message.chat.id;
    const mid = cq.message.message_id;
    const base = cq.message.caption !== undefined
      ? { method: 'editMessageCaption', extra: { caption: (cq.message.caption || '') + '\n\n➡️ ' + result } }
      : { method: 'editMessageText', extra: { text: (cq.message.text || '') + '\n\n➡️ ' + result } };
    await tg(base.method, { chat_id: chatId, message_id: mid, ...base.extra, reply_markup: { inline_keyboard: [] } });
  }
  res.json({ ok: true });
};
