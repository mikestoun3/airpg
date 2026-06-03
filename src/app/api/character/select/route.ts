import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { setActiveClass } from '@/lib/db';

export async function POST(req: NextRequest) {
  const wallet = getSessionWallet(req);
  if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { charClass } = await req.json() as { charClass?: string };
  const valid = ['warrior', 'assassin', 'mage'];
  if (!charClass || !valid.includes(charClass)) {
    return NextResponse.json({ ok: false, error: 'Invalid class' }, { status: 400 });
  }

  const ok = setActiveClass(wallet, charClass);
  return NextResponse.json({ ok });
}
