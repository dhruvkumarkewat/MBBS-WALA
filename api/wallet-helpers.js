import supabase from './db-client.js';

export function makeCode(seed = '') {
  const base = (seed || Math.random().toString(36)).replace(/[^a-z0-9]/gi, '').toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MBW${(base.slice(0, 4) || 'USER')}${rand}`;
}

export async function ensureWallet(user) {
  const { data: existing } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) return existing;

  let code = makeCode(user.email?.split('@')[0] || user.id);
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await supabase
      .from('wallets')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle();
    if (!clash) break;
    code = makeCode(user.id + i);
  }

  const row = {
    user_id: user.id,
    balance: 0,
    lifetime_earned: 0,
    lifetime_withdrawn: 0,
    referral_code: code,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('wallets').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function creditWallet(userId, amount, type, description, meta = {}) {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!wallet) throw new Error('Wallet not found');

  const newBal = (wallet.balance || 0) + amount;
  const newEarned = amount > 0 ? (wallet.lifetime_earned || 0) + amount : wallet.lifetime_earned || 0;

  const { error: uErr } = await supabase
    .from('wallets')
    .update({
      balance: newBal,
      lifetime_earned: newEarned,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (uErr) throw uErr;

  const { error: tErr } = await supabase.from('wallet_transactions').insert({
    user_id: userId,
    type,
    amount,
    balance_after: newBal,
    description,
    meta,
    created_at: new Date().toISOString(),
  });
  if (tErr) throw tErr;
  return newBal;
}
