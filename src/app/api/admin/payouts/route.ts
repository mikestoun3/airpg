import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { getPendingPayouts, markPayoutPaid } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, payouts: getPendingPayouts() });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { payoutId } = await req.json() as { payoutId: string };
  if (!payoutId) return NextResponse.json({ ok: false, error: 'Missing payoutId' }, { status: 400 });
  markPayoutPaid(payoutId);
  return NextResponse.json({ ok: true });
}
