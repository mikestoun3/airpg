import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { adminGetCharacter, adminUpdateCharacter, adminResetCharacter, getEquipment, getInventory } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const character = adminGetCharacter(id);
  if (!character) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  const equipment = getEquipment(id);
  const inventory = getInventory(id);
  return NextResponse.json({ ok: true, character, equipment, inventory });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  if (body.action === 'reset') {
    adminResetCharacter(id);
    return NextResponse.json({ ok: true, action: 'reset' });
  }

  adminUpdateCharacter(id, body as Parameters<typeof adminUpdateCharacter>[1]);
  return NextResponse.json({ ok: true });
}
