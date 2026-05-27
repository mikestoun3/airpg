import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { getIpAnalytics } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = getIpAnalytics();
  return NextResponse.json({ ok: true, groups: data });
}
