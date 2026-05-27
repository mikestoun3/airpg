import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { getBannedCharacters } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, banned: getBannedCharacters() });
}
