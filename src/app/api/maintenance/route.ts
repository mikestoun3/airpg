import { NextResponse } from 'next/server';
import { getMaintenanceMode } from '@/lib/db';

export async function GET() {
  return NextResponse.json({ maintenance: getMaintenanceMode() });
}
