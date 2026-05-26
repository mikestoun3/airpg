import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { adminDeactivatePromoCode } from '@/lib/db';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { code } = await params;
  adminDeactivatePromoCode(code);
  return NextResponse.json({ ok: true });
}
