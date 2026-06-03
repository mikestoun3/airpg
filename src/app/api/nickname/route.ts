import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, isNicknameTaken, setNickname } from '@/lib/db';
import { validateNickname } from '@/lib/profanity';

export async function POST(req: NextRequest) {
  const wallet = getSessionWallet(req);
  if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const body = await req.json() as { nickname?: string; charClass?: string };
  if (!body.nickname) return NextResponse.json({ ok: false, error: 'Missing nickname' }, { status: 400 });

  const char = getOrCreateCharacter(wallet);
  if (char.nicknameSet) {
    return NextResponse.json({ ok: true }); // already set — close modal silently
  }

  const validation = validateNickname(body.nickname);
  if (!validation.ok) return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });

  const trimmed = body.nickname.trim();
  if (isNicknameTaken(trimmed)) {
    return NextResponse.json({ ok: false, error: 'Никнейм уже занят' }, { status: 409 });
  }

  const validClasses = ['warrior', 'assassin', 'mage'] as const;
  const charClass = validClasses.includes(body.charClass as typeof validClasses[number])
    ? (body.charClass as typeof validClasses[number])
    : 'warrior';
  setNickname(char.id, trimmed, charClass);

  return NextResponse.json({ ok: true });
}
