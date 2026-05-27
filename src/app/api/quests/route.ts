import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, getCompletedQuests, completeQuest, getReferralCount, getOrCreateReferralCode } from '@/lib/db';
import { QUESTS } from '@/lib/data/quests';

export async function GET(req: NextRequest) {
  const wallet = getSessionWallet(req);
  if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const char = getOrCreateCharacter(wallet);
  const completed = getCompletedQuests(char.id);
  const referralCount = getReferralCount(char.id);
  const referralCode = getOrCreateReferralCode(char.id);

  return NextResponse.json({ ok: true, completed, referralCount, referralCode, quests: QUESTS });
}

export async function POST(req: NextRequest) {
  try {
    const { questId } = await req.json() as { questId?: string };
    if (!questId) return NextResponse.json({ ok: false, error: 'Missing questId' }, { status: 400 });

    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    const char = getOrCreateCharacter(wallet);
    const quest = QUESTS.find(q => q.id === questId);
    if (!quest) return NextResponse.json({ ok: false, error: 'Unknown quest' }, { status: 400 });

    // For referral quests, verify the player actually has enough referrals
    if (quest.type === 'referral' && quest.requiredReferrals) {
      const count = getReferralCount(char.id);
      if (count < quest.requiredReferrals) {
        return NextResponse.json({
          ok: false,
          error: `Need ${quest.requiredReferrals} referrals (have ${count})`,
        }, { status: 400 });
      }
    }

    const result = completeQuest(char.id, questId, quest.reward);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
