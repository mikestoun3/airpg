import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, getLeaderboard } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    let currentCharId: string | undefined;
    if (wallet) {
      const char = getOrCreateCharacter(wallet);
      currentCharId = char.id;
    }
    const data = getLeaderboard(currentCharId);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error('GET /api/leaderboard error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
