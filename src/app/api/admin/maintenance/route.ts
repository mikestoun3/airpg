import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { getMaintenanceMode, setMaintenanceMode } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, maintenance: getMaintenanceMode() });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { on } = await req.json() as { on: boolean };
  setMaintenanceMode(on);
  return NextResponse.json({ ok: true, maintenance: on });
}
