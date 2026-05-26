import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, spendMaterials, addItemToInventory } from '@/lib/db';
import { CRAFT_RECIPES } from '@/lib/data/recipes';
import { v4 as uuidv4 } from 'uuid';
import type { ItemInstance } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const { recipeId } = await req.json() as { recipeId: string };

    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) {
      return NextResponse.json({ ok: false, error: 'Unknown recipe.' }, { status: 400 });
    }

    const wallet = getSessionWallet(req);
    const char = getOrCreateCharacter(wallet ?? undefined);

    const spent = spendMaterials(char.id, recipe.ingredients);
    if (!spent) {
      return NextResponse.json({ ok: false, error: 'Not enough materials.' }, { status: 400 });
    }

    const item: ItemInstance = {
      id: uuidv4(),
      templateId: recipe.outputItem.templateId,
      name: recipe.outputItem.name,
      slot: recipe.slot,
      rarity: recipe.rarity,
      primaryStat: recipe.outputItem.primaryStat,
      primaryValue: recipe.outputItem.primaryValue,
      secondaryStats: recipe.outputItem.secondaryStats,
      specialEffects: [],
      gearScore: recipe.outputItem.gearScore,
    };

    addItemToInventory(char.id, item);

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error('POST /api/craft error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
