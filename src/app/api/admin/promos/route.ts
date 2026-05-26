import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { adminCreatePromoCode, adminGetAllPromoCodes } from '@/lib/db';
import type { PromoReward } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, codes: adminGetAllPromoCodes() });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json() as { code: string; reward: PromoReward; maxUses: number; expiresAt?: number };
  if (!body.code || !body.reward) return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 });
  try {
    adminCreatePromoCode(body.code, body.reward, body.maxUses ?? 1, body.expiresAt);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 400 });
  }
}
