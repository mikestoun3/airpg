import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { adminGetAllListings } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const listings = adminGetAllListings();
  return NextResponse.json({ ok: true, listings });
}
