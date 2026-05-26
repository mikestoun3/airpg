import { createHmac } from 'crypto';
import type { NextRequest } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'airpg-admin-dev';
export const ADMIN_COOKIE = 'airpg_admin';

function token(): string {
  return createHmac('sha256', ADMIN_SECRET).update('admin-session').digest('hex');
}

export function checkAdminSecret(input: string): boolean {
  return input === ADMIN_SECRET;
}

export function isAdminAuthed(req: NextRequest): boolean {
  const v = req.cookies.get(ADMIN_COOKIE)?.value;
  return !!v && v === token();
}

export function makeAdminCookieValue(): string {
  return token();
}
