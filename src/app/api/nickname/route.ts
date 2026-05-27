import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, isNicknameTaken, setNickname } from '@/lib/db';
import { validateNickname } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  const wallet = getSessionWallet(req);
  if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { nickname } = await req.json() as { nickname?: string };
  if (!nickname) return NextResponse.json({ ok: false, error: 'Missing nickname' }, { status: 400 });

  const validation = validateNickname(nickname);
  if (!validation.ok) return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });

  const trimmed = nickname.trim();
  if (isNicknameTaken(trimmed)) {
    return NextResponse.json({ ok: false, error: 'Никнейм уже занят' }, { status: 409 });
  }

  const char = getOrCreateCharacter(wallet);
  setNickname(char.id, trimmed);

  return NextResponse.json({ ok: true });
}
