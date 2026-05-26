import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { adminGetAllCharacters } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const q = req.nextUrl.searchParams.get('q') ?? undefined;
  const accounts = adminGetAllCharacters(q);
  return NextResponse.json({ ok: true, accounts });
}
