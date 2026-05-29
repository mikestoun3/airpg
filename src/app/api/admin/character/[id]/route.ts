import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { adminGetCharacter, adminUpdateCharacter, adminResetCharacter, getEquipment, getInventory, banCharacter, unbanCharacter, getReferralInfo } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const character = adminGetCharacter(id);
  if (!character) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const equipment = getEquipment(id);
  const inventory = getInventory(id);
  const referralInfo = getReferralInfo(id);
  return NextResponse.json({ ok: true, character, equipment, inventory, referralInfo });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  if (body.action === 'reset') {
    adminResetCharacter(id);
    return NextResponse.json({ ok: true, action: 'reset' });
  }

  if (body.action === 'ban') {
    banCharacter(id, body.reason as string | undefined);
    return NextResponse.json({ ok: true, action: 'ban' });
  }

  if (body.action === 'unban') {
    unbanCharacter(id);
    return NextResponse.json({ ok: true, action: 'unban' });
  }

  adminUpdateCharacter(id, body as Parameters<typeof adminUpdateCharacter>[1]);
  return NextResponse.json({ ok: true });
}
