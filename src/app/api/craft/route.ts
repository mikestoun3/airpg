import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, spendMaterials, addItemToInventory, getBuiltUpgrades, removeItemFromInventory, getInventory } from '@/lib/db';
import { CRAFT_RECIPES, ATTUNEMENT_RUNS_REQUIRED, FORGE_UPGRADE_ID } from '@/lib/data/recipes';
import { v4 as uuidv4 } from 'uuid';
import type { ItemInstance, GearTier } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const { recipeId, ingredientItemId } = await req.json() as { recipeId: string; ingredientItemId?: string };

    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) {
      return NextResponse.json({ ok: false, error: 'Unknown recipe.' }, { status: 400 });
    }

    const wallet = getSessionWallet(req);
    const char = getOrCreateCharacter(wallet ?? undefined);

    // Check forge level
    const builtIds = getBuiltUpgrades(char.id);
    const requiredForgeId = FORGE_UPGRADE_ID[recipe.requiredForgeLevel];
    if (!builtIds.includes(requiredForgeId)) {
      const forgeNames: Record<string, string> = {
        the_forge: 'The Forge',
        reinforced_forge: 'Reinforced Forge',
        master_forge: 'Master Forge',
        void_forge: 'Void Forge',
      };
      return NextResponse.json({ ok: false, error: `Requires ${forgeNames[requiredForgeId]}.` }, { status: 403 });
    }

    // For T2+ recipes, validate ingredient item
    let ingredient: ItemInstance | null = null;
    if (recipe.requiredItemTier) {
      if (!ingredientItemId) {
        return NextResponse.json({ ok: false, error: 'Select a tempered item to absorb.' }, { status: 400 });
      }

      const inv = getInventory(char.id);
      ingredient = inv.find(i => i.id === ingredientItemId) ?? null;

      if (!ingredient) {
        return NextResponse.json({ ok: false, error: 'Item not found in inventory.' }, { status: 404 });
      }
      if (ingredient.slot !== recipe.slot) {
        return NextResponse.json({ ok: false, error: `Must use a ${recipe.slot} item.` }, { status: 400 });
      }
      if ((ingredient.gearTier ?? 1) !== recipe.requiredItemTier) {
        return NextResponse.json({ ok: false, error: `Must absorb a Tier ${recipe.requiredItemTier} item.` }, { status: 400 });
      }

      const runsNeeded = ATTUNEMENT_RUNS_REQUIRED[recipe.requiredItemTier as 1 | 2 | 3];
      const runsHave = ingredient.attunementRuns ?? 0;
      if (runsHave < runsNeeded) {
        return NextResponse.json({
          ok: false,
          error: `Item not yet tempered. ${runsHave}/${runsNeeded} runs completed with it equipped.`,
        }, { status: 400 });
      }
    }

    // Spend materials
    const spent = spendMaterials(char.id, recipe.ingredients);
    if (!spent) {
      return NextResponse.json({ ok: false, error: 'Not enough materials.' }, { status: 400 });
    }

    // Consume ingredient item
    if (ingredient) {
      removeItemFromInventory(char.id, ingredient.id);
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
      gearTier: recipe.gearTier as GearTier,
      attunementRuns: 0,
    };

    addItemToInventory(char.id, item);

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error('POST /api/craft error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
