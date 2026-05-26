import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ItemInstance, Equipment, EquipmentSlot } from '@/types/game';
import { xpToNextLevel } from '@/lib/engine/run-engine';

const DB_PATH = path.join(process.cwd(), 'airpg.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      pwr INTEGER DEFAULT 5,
      end_stat INTEGER DEFAULT 5,
      lck INTEGER DEFAULT 3,
      spd INTEGER DEFAULT 3,
      ins INTEGER DEFAULT 3,
      stat_points INTEGER DEFAULT 0,
      gold INTEGER DEFAULT 50,
      essence INTEGER DEFAULT 0,
      relics INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle',
      injured_until INTEGER,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS equipment (
      character_id TEXT PRIMARY KEY,
      weapon TEXT,
      helmet TEXT,
      chest TEXT,
      boots TEXT,
      ring TEXT,
      trinket TEXT,
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      item_json TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      dungeon_id TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER NOT NULL,
      resolved INTEGER DEFAULT 0,
      outcome TEXT,
      result_json TEXT,
      consumable_used TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS pity (
      character_id TEXT PRIMARY KEY,
      total_runs INTEGER DEFAULT 0,
      since_last_uncommon INTEGER DEFAULT 0,
      since_last_rare INTEGER DEFAULT 0,
      since_last_epic INTEGER DEFAULT 0,
      consecutive_no_success INTEGER DEFAULT 0,
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS camp (
      character_id TEXT NOT NULL,
      upgrade_id TEXT NOT NULL,
      built_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (character_id, upgrade_id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS dungeon_clears (
      character_id TEXT NOT NULL,
      dungeon_id TEXT NOT NULL,
      tier INTEGER NOT NULL,
      cleared_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (character_id, dungeon_id, cleared_at),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );
  `);
}

// ── Character ─────────────────────────────────────────────────────────────────

export function getOrCreateCharacter() {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM characters LIMIT 1').get() as Record<string, unknown> | undefined;
  if (existing) return rowToCharacter(existing);

  const id = uuidv4();
  db.prepare(`
    INSERT INTO characters (id, name, level, xp, pwr, end_stat, lck, spd, ins, stat_points, gold)
    VALUES (?, ?, 1, 0, 5, 5, 3, 3, 3, 0, 50)
  `).run(id, 'Wanderer');

  db.prepare('INSERT INTO equipment (character_id) VALUES (?)').run(id);
  db.prepare('INSERT INTO pity (character_id) VALUES (?)').run(id);

  return rowToCharacter(db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown>);
}

export function updateCharacterStatus(id: string, status: string, injuredUntil?: number) {
  const db = getDb();
  db.prepare('UPDATE characters SET status = ?, injured_until = ? WHERE id = ?')
    .run(status, injuredUntil ?? null, id);
}

export function addResources(id: string, gold: number, essence: number, relics: number = 0) {
  const db = getDb();
  db.prepare('UPDATE characters SET gold = gold + ?, essence = essence + ?, relics = relics + ? WHERE id = ?')
    .run(gold, essence, relics, id);
}

export function addXpAndLevel(id: string, xpGained: number) {
  const db = getDb();
  const char = db.prepare('SELECT level, xp FROM characters WHERE id = ?').get(id) as { level: number; xp: number };
  let { level, xp } = char;
  xp += xpGained;
  let leveled = false;
  let statPointsGained = 0;

  while (level < 30) {
    const needed = xpToNextLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
      leveled = true;
      statPointsGained++;
    } else break;
  }

  db.prepare('UPDATE characters SET level = ?, xp = ?, stat_points = stat_points + ? WHERE id = ?')
    .run(level, xp, statPointsGained, id);

  return { leveled, newLevel: level, statPointsGained };
}

export function spendStatPoint(characterId: string, stat: string): boolean {
  const db = getDb();
  const char = db.prepare('SELECT stat_points FROM characters WHERE id = ?').get(characterId) as { stat_points: number } | undefined;
  if (!char || char.stat_points <= 0) return false;

  const col = stat === 'end' ? 'end_stat' : stat;
  const allowed = ['pwr', 'end_stat', 'lck', 'spd', 'ins'];
  if (!allowed.includes(col)) return false;

  db.prepare(`UPDATE characters SET ${col} = ${col} + 1, stat_points = stat_points - 1 WHERE id = ?`)
    .run(characterId);
  return true;
}

function rowToCharacter(row: Record<string, unknown>) {
  const pwr = row.pwr as number;
  const end = row.end_stat as number;
  return {
    id: row.id as string,
    name: row.name as string,
    level: row.level as number,
    xp: row.xp as number,
    xpToNext: xpToNextLevel(row.level as number),
    pwr,
    end,
    lck: row.lck as number,
    spd: row.spd as number,
    ins: row.ins as number,
    statPoints: row.stat_points as number,
    gold: row.gold as number,
    essence: row.essence as number,
    relics: row.relics as number,
    gearScore: 0, // computed after loading equipment
    combatRating: Math.floor(pwr * 1.5 + end),
    status: row.status as import('@/types/game').CharacterStatus,
    injuredUntil: row.injured_until as number | undefined,
  };
}

// ── Equipment ─────────────────────────────────────────────────────────────────

export function getEquipment(characterId: string): Equipment {
  const db = getDb();
  const row = db.prepare('SELECT * FROM equipment WHERE character_id = ?').get(characterId) as Record<string, string | null> | undefined;
  if (!row) return emptyEquipment();

  const slots: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];
  const equip: Partial<Equipment> = {};
  for (const slot of slots) {
    const json = row[slot];
    equip[slot] = json ? (JSON.parse(json) as ItemInstance) : null;
  }
  return equip as Equipment;
}

function emptyEquipment(): Equipment {
  return { weapon: null, helmet: null, chest: null, boots: null, ring: null, trinket: null };
}

export function equipItem(characterId: string, item: ItemInstance): ItemInstance | null {
  const db = getDb();
  const col = item.slot;
  const row = db.prepare(`SELECT ${col} FROM equipment WHERE character_id = ?`).get(characterId) as Record<string, string | null>;
  const prevJson = row?.[col];
  const prevItem: ItemInstance | null = prevJson ? JSON.parse(prevJson) : null;

  db.prepare(`UPDATE equipment SET ${col} = ? WHERE character_id = ?`)
    .run(JSON.stringify(item), characterId);

  // Remove newly equipped item from inventory
  db.prepare('DELETE FROM inventory WHERE id = ? AND character_id = ?').run(item.id, characterId);

  // If there was a previously equipped item, move it back to inventory
  if (prevItem) {
    db.prepare('INSERT INTO inventory (id, character_id, item_json) VALUES (?, ?, ?)')
      .run(prevItem.id, characterId, JSON.stringify(prevItem));
  }

  // Recompute gear score
  recomputeGearScore(characterId);

  return prevItem;
}

export function unequipItem(characterId: string, slot: EquipmentSlot) {
  const db = getDb();
  const row = db.prepare(`SELECT ${slot} FROM equipment WHERE character_id = ?`).get(characterId) as Record<string, string | null>;
  const json = row?.[slot];
  if (!json) return;

  const item: ItemInstance = JSON.parse(json);
  db.prepare(`UPDATE equipment SET ${slot} = NULL WHERE character_id = ?`).run(characterId);
  db.prepare('INSERT INTO inventory (id, character_id, item_json) VALUES (?, ?, ?)')
    .run(item.id, characterId, json);
  recomputeGearScore(characterId);
}

function recomputeGearScore(characterId: string) {
  const db = getDb();
  const equip = getEquipment(characterId);
  const slots: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];
  const gs = slots.reduce((sum, s) => sum + (equip[s]?.gearScore ?? 0), 0);
  db.prepare('UPDATE characters SET end_stat = end_stat WHERE id = ?').run(characterId);
  // Store GS separately — add column if needed
  try {
    db.prepare('ALTER TABLE characters ADD COLUMN gear_score INTEGER DEFAULT 0').run();
  } catch { /* already exists */ }
  db.prepare('UPDATE characters SET gear_score = ? WHERE id = ?').run(gs, characterId);
}

export function getGearScore(characterId: string): number {
  const equip = getEquipment(characterId);
  const slots: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];
  return slots.reduce((sum, s) => sum + (equip[s]?.gearScore ?? 0), 0);
}

// Returns base stats + all bonuses from equipped items
export function getEffectiveStats(characterId: string) {
  const char = getOrCreateCharacter();
  const equip = getEquipment(characterId);
  const slots: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];

  const bonus: Record<string, number> = { pwr: 0, end: 0, lck: 0, spd: 0, ins: 0 };
  for (const slot of slots) {
    const item = equip[slot];
    if (!item) continue;
    bonus[item.primaryStat] = (bonus[item.primaryStat] ?? 0) + item.primaryValue;
    for (const sec of item.secondaryStats) {
      bonus[sec.stat] = (bonus[sec.stat] ?? 0) + sec.value;
    }
  }

  const pwr = char.pwr + bonus.pwr;
  const end = char.end + bonus.end;
  return {
    pwr,
    end,
    lck: char.lck + bonus.lck,
    spd: char.spd + bonus.spd,
    ins: char.ins + bonus.ins,
    combatRating: Math.floor(pwr * 1.5 + end),
  };
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export function getInventory(characterId: string): ItemInstance[] {
  const db = getDb();
  const rows = db.prepare('SELECT item_json FROM inventory WHERE character_id = ? ORDER BY created_at DESC').all(characterId) as { item_json: string }[];
  return rows.map((r) => JSON.parse(r.item_json) as ItemInstance);
}

export function addItemToInventory(characterId: string, item: ItemInstance) {
  const db = getDb();
  db.prepare('INSERT INTO inventory (id, character_id, item_json) VALUES (?, ?, ?)')
    .run(item.id, characterId, JSON.stringify(item));
}

export function salvageItem(characterId: string, itemId: string): { gold: number; essence: number } {
  const db = getDb();
  const row = db.prepare('SELECT item_json FROM inventory WHERE id = ? AND character_id = ?')
    .get(itemId, characterId) as { item_json: string } | undefined;

  if (!row) return { gold: 0, essence: 0 };

  const item: ItemInstance = JSON.parse(row.item_json);

  const salvageValues: Record<string, { gold: number; essenceChance: number; essenceAmt: number }> = {
    common: { gold: 8, essenceChance: 0, essenceAmt: 0 },
    uncommon: { gold: 20, essenceChance: 0.1, essenceAmt: 1 },
    rare: { gold: 50, essenceChance: 0.5, essenceAmt: 3 },
    epic: { gold: 120, essenceChance: 1, essenceAmt: 8 },
    legendary: { gold: 300, essenceChance: 1, essenceAmt: 20 },
  };

  const sv = salvageValues[item.rarity];
  const gold = sv.gold + Math.floor(Math.random() * sv.gold * 0.3);
  const essence = Math.random() < sv.essenceChance ? sv.essenceAmt : 0;

  db.prepare('DELETE FROM inventory WHERE id = ? AND character_id = ?').run(itemId, characterId);
  addResources(characterId, gold, essence);

  return { gold, essence };
}

// ── Runs ──────────────────────────────────────────────────────────────────────

export function createRun(
  characterId: string,
  dungeonId: string,
  difficulty: string,
  durationMinutes: number
) {
  const db = getDb();
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + durationMinutes * 60;

  db.prepare(`
    INSERT INTO runs (id, character_id, dungeon_id, difficulty, start_time, end_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, characterId, dungeonId, difficulty, now, endTime);

  updateCharacterStatus(characterId, 'on_run');
  return { id, startTime: now, endTime };
}

export function getActiveRun(characterId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM runs WHERE character_id = ? AND resolved = 0 ORDER BY created_at DESC LIMIT 1
  `).get(characterId) as Record<string, unknown> | undefined;
}

export function resolveRunInDb(runId: string, outcome: string, resultJson: string) {
  const db = getDb();
  db.prepare('UPDATE runs SET resolved = 1, outcome = ?, result_json = ? WHERE id = ?')
    .run(outcome, resultJson, runId);
}

export function getCompletedUnresolvedRun(characterId: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  return db.prepare(`
    SELECT * FROM runs WHERE character_id = ? AND resolved = 0 AND end_time <= ?
    ORDER BY end_time ASC LIMIT 1
  `).get(characterId, now) as Record<string, unknown> | undefined;
}

export function getLastRunResult(characterId: string) {
  const db = getDb();
  const row = db.prepare(`
    SELECT result_json FROM runs WHERE character_id = ? AND resolved = 1 AND result_json IS NOT NULL
    ORDER BY created_at DESC LIMIT 1
  `).get(characterId) as { result_json: string } | undefined;
  return row ? JSON.parse(row.result_json) : null;
}

// ── Pity ──────────────────────────────────────────────────────────────────────

export function getPity(characterId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM pity WHERE character_id = ?').get(characterId) as {
    total_runs: number;
    since_last_uncommon: number;
    since_last_rare: number;
    since_last_epic: number;
    consecutive_no_success: number;
  } | undefined;
}

export function updatePity(characterId: string, outcome: string, loot: { rarity: string }[]) {
  const db = getDb();
  const pity = getPity(characterId);
  if (!pity) return;

  const hasUncommon = loot.some((i) => i.rarity === 'uncommon' || i.rarity === 'rare' || i.rarity === 'epic' || i.rarity === 'legendary');
  const hasRare = loot.some((i) => i.rarity === 'rare' || i.rarity === 'epic' || i.rarity === 'legendary');
  const hasEpic = loot.some((i) => i.rarity === 'epic' || i.rarity === 'legendary');
  const isNoSuccess = outcome === 'failure' || outcome === 'critical_failure' || outcome === 'partial';

  db.prepare(`
    UPDATE pity SET
      total_runs = total_runs + 1,
      since_last_uncommon = CASE WHEN ? THEN 0 ELSE since_last_uncommon + 1 END,
      since_last_rare = CASE WHEN ? THEN 0 ELSE since_last_rare + 1 END,
      since_last_epic = CASE WHEN ? THEN 0 ELSE since_last_epic + 1 END,
      consecutive_no_success = CASE WHEN ? THEN consecutive_no_success + 1 ELSE 0 END
    WHERE character_id = ?
  `).run(hasUncommon ? 1 : 0, hasRare ? 1 : 0, hasEpic ? 1 : 0, isNoSuccess ? 1 : 0, characterId);
}

// ── Dungeon Clears ────────────────────────────────────────────────────────────

export function recordClear(characterId: string, dungeonId: string, tier: number) {
  const db = getDb();
  db.prepare('INSERT INTO dungeon_clears (character_id, dungeon_id, tier) VALUES (?, ?, ?)')
    .run(characterId, dungeonId, tier);
}

export function getTier1Clears(characterId: string): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM dungeon_clears WHERE character_id = ? AND tier = 1').get(characterId) as { cnt: number };
  return row.cnt;
}

// ── Camp ──────────────────────────────────────────────────────────────────────

export function getBuiltUpgrades(characterId: string): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT upgrade_id FROM camp WHERE character_id = ?').all(characterId) as { upgrade_id: string }[];
  return rows.map((r) => r.upgrade_id);
}

export function buildUpgrade(characterId: string, upgradeId: string) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO camp (character_id, upgrade_id) VALUES (?, ?)').run(characterId, upgradeId);
}

export function spendGold(characterId: string, amount: number): boolean {
  const db = getDb();
  const char = db.prepare('SELECT gold FROM characters WHERE id = ?').get(characterId) as { gold: number } | undefined;
  if (!char || char.gold < amount) return false;
  db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ?').run(amount, characterId);
  return true;
}

export function spendEssence(characterId: string, amount: number): boolean {
  const db = getDb();
  const char = db.prepare('SELECT essence FROM characters WHERE id = ?').get(characterId) as { essence: number } | undefined;
  if (!char || char.essence < amount) return false;
  db.prepare('UPDATE characters SET essence = essence - ? WHERE id = ?').run(amount, characterId);
  return true;
}
