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

    CREATE TABLE IF NOT EXISTS materials (
      character_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (character_id, resource_id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS wallets (
      address TEXT PRIMARY KEY,
      character_id TEXT,
      nonce TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS market_listings (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      seller_wallet TEXT NOT NULL,
      item_json TEXT NOT NULL,
      price_wei TEXT NOT NULL,
      listed_at INTEGER DEFAULT (unixepoch()),
      cancel_lock_until INTEGER,
      status TEXT DEFAULT 'active',
      buyer_id TEXT,
      buyer_wallet TEXT,
      tx_hash TEXT UNIQUE,
      sold_at INTEGER,
      FOREIGN KEY (seller_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS pending_payouts (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      seller_wallet TEXT NOT NULL,
      listing_id TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      price_wei TEXT NOT NULL,
      payout_wei TEXT NOT NULL,
      fee_wei TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY,
      reward_json TEXT NOT NULL,
      max_uses INTEGER NOT NULL DEFAULT 1,
      uses INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      expires_at INTEGER,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS promo_redemptions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      character_id TEXT NOT NULL,
      redeemed_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(code, character_id)
    );
  `);

  try { db.exec('ALTER TABLE runs ADD COLUMN pre_rolled_json TEXT'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE characters ADD COLUMN wallet_address TEXT'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE market_listings ADD COLUMN cancel_lock_until INTEGER'); } catch { /* already exists */ }
  // Migrate tx_hash to be unique — rebuild table if needed
  try {
    const idxRows = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='market_listings' AND name='idx_market_tx_hash'").get();
    if (!idxRows) {
      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_market_tx_hash ON market_listings(tx_hash) WHERE tx_hash IS NOT NULL");
    }
  } catch { /* ignore */ }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_payouts (
        id TEXT PRIMARY KEY,
        seller_id TEXT NOT NULL,
        seller_wallet TEXT NOT NULL,
        listing_id TEXT NOT NULL,
        tx_hash TEXT NOT NULL,
        price_wei TEXT NOT NULL,
        payout_wei TEXT NOT NULL,
        fee_wei TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        status TEXT DEFAULT 'pending'
      );
    `);
  } catch { /* already exists */ }
  try { db.exec('ALTER TABLE pending_payouts ADD COLUMN tx_hash TEXT NOT NULL DEFAULT ""'); } catch { /* already exists */ }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS dungeon_floor_progress (
        character_id TEXT NOT NULL,
        dungeon_id TEXT NOT NULL,
        saved_floor INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (character_id, dungeon_id)
      );
    `);
  } catch { /* already exists */ }

  // Migrate wallets table to allow nullable character_id (for pre-auth nonce storage)
  try {
    const info = db.prepare("PRAGMA table_info(wallets)").all() as { name: string; notnull: number }[];
    const charIdCol = info.find(c => c.name === 'character_id');
    if (charIdCol && charIdCol.notnull === 1) {
      db.exec(`
        CREATE TABLE wallets_new (
          address TEXT PRIMARY KEY,
          character_id TEXT,
          nonce TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO wallets_new SELECT address, NULLIF(character_id, ''), nonce FROM wallets;
        DROP TABLE wallets;
        ALTER TABLE wallets_new RENAME TO wallets;
      `);
    }
  } catch { /* already migrated */ }
}

// ── Auth / Wallet ──────────────────────────────────────────────────────────────

export function getOrSetNonce(address: string): string {
  const db = getDb();
  const wallet = db.prepare('SELECT nonce FROM wallets WHERE address = ?').get(address) as { nonce: string } | undefined;
  if (wallet) return wallet.nonce;
  // No wallet row yet — generate a nonce (character created on verify)
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  // We can't insert without character_id yet; store in a temp way — just return nonce, save on verify
  return nonce;
}

export function saveNonce(address: string, nonce: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO wallets (address, character_id, nonce) VALUES (?, NULL, ?)
    ON CONFLICT(address) DO UPDATE SET nonce = excluded.nonce
  `).run(address, nonce);
}

export function getNonce(address: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT nonce FROM wallets WHERE address = ?').get(address) as { nonce: string } | undefined;
  return row?.nonce ?? null;
}

export function getCharacterIdByWallet(address: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT character_id FROM wallets WHERE address = ? AND character_id IS NOT NULL').get(address) as { character_id: string } | undefined;
  return row?.character_id ?? null;
}

// ── Character ─────────────────────────────────────────────────────────────────

export function getOrCreateCharacter(walletAddress?: string) {
  const db = getDb();

  if (walletAddress) {
    const addr = walletAddress.toLowerCase();
    const charId = getCharacterIdByWallet(addr);
    if (charId) {
      const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId) as Record<string, unknown> | undefined;
      if (row) return rowToCharacter(row);
    }
    // Create new character for this wallet
    const id = uuidv4();
    db.prepare(`
      INSERT INTO characters (id, name, level, xp, pwr, end_stat, lck, spd, ins, stat_points, gold, wallet_address)
      VALUES (?, ?, 1, 0, 5, 5, 3, 3, 3, 0, 50, ?)
    `).run(id, 'Wanderer', addr);
    db.prepare('INSERT INTO equipment (character_id) VALUES (?)').run(id);
    db.prepare('INSERT INTO pity (character_id) VALUES (?)').run(id);
    // Link wallet → character (preserve existing nonce if row was pre-inserted for auth)
    db.prepare(`
      INSERT INTO wallets (address, character_id, nonce) VALUES (?, ?, '')
      ON CONFLICT(address) DO UPDATE SET character_id = excluded.character_id
    `).run(addr, id);

    return rowToCharacter(db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown>);
  }

  // Legacy: no wallet, grab first character (backwards compat for dev)
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

const SALVAGE_VALUES: Record<string, { gold: number; essenceChance: number; essenceAmt: number }> = {
  common:    { gold: 8,   essenceChance: 0,   essenceAmt: 0  },
  uncommon:  { gold: 20,  essenceChance: 0.1, essenceAmt: 1  },
  rare:      { gold: 50,  essenceChance: 0.5, essenceAmt: 3  },
  epic:      { gold: 120, essenceChance: 1,   essenceAmt: 8  },
  legendary: { gold: 300, essenceChance: 1,   essenceAmt: 20 },
};

export function salvageItem(characterId: string, itemId: string): { gold: number; essence: number } {
  const db = getDb();
  const row = db.prepare('SELECT item_json FROM inventory WHERE id = ? AND character_id = ?')
    .get(itemId, characterId) as { item_json: string } | undefined;

  if (!row) return { gold: 0, essence: 0 };

  const item: ItemInstance = JSON.parse(row.item_json);
  const sv = SALVAGE_VALUES[item.rarity];
  const gold = sv.gold + Math.floor(Math.random() * sv.gold * 0.3);
  const essence = Math.random() < sv.essenceChance ? sv.essenceAmt : 0;

  db.prepare('DELETE FROM inventory WHERE id = ? AND character_id = ?').run(itemId, characterId);
  addResources(characterId, gold, essence);

  return { gold, essence };
}

export function salvageByRarity(
  characterId: string,
  rarity: string
): { gold: number; essence: number; count: number } {
  const db = getDb();
  const rows = db.prepare('SELECT id, item_json FROM inventory WHERE character_id = ?')
    .all(characterId) as { id: string; item_json: string }[];

  let totalGold = 0;
  let totalEssence = 0;
  let count = 0;

  const sv = SALVAGE_VALUES[rarity];
  if (!sv) return { gold: 0, essence: 0, count: 0 };

  const deleteStmt = db.prepare('DELETE FROM inventory WHERE id = ? AND character_id = ?');

  for (const row of rows) {
    const item: ItemInstance = JSON.parse(row.item_json);
    if (item.rarity !== rarity) continue;
    const gold = sv.gold + Math.floor(Math.random() * sv.gold * 0.3);
    const essence = Math.random() < sv.essenceChance ? sv.essenceAmt : 0;
    totalGold += gold;
    totalEssence += essence;
    count++;
    deleteStmt.run(row.id, characterId);
  }

  if (count > 0) addResources(characterId, totalGold, totalEssence);
  return { gold: totalGold, essence: totalEssence, count };
}

// ── Runs ──────────────────────────────────────────────────────────────────────

export function createRun(
  characterId: string,
  dungeonId: string,
  difficulty: string,
  durationMinutes: number,
  preRolledJson?: string
) {
  const db = getDb();
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + durationMinutes * 60;

  db.prepare(`
    INSERT INTO runs (id, character_id, dungeon_id, difficulty, start_time, end_time, pre_rolled_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, characterId, dungeonId, difficulty, now, endTime, preRolledJson ?? null);

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

// ── Materials (craft resources) ───────────────────────────────────────────────

export function getMaterials(characterId: string): { resource_id: string; quantity: number }[] {
  const db = getDb();
  return db.prepare('SELECT resource_id, quantity FROM materials WHERE character_id = ? AND quantity > 0')
    .all(characterId) as { resource_id: string; quantity: number }[];
}

export function addMaterials(characterId: string, stacks: { resourceId: string; quantity: number }[]) {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO materials (character_id, resource_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT (character_id, resource_id) DO UPDATE SET quantity = quantity + excluded.quantity
  `);
  for (const s of stacks) {
    upsert.run(characterId, s.resourceId, s.quantity);
  }
}

export function spendMaterials(
  characterId: string,
  ingredients: { resourceId: string; quantity: number }[]
): boolean {
  const db = getDb();
  const rows = db.prepare('SELECT resource_id, quantity FROM materials WHERE character_id = ?')
    .all(characterId) as { resource_id: string; quantity: number }[];
  const stock = Object.fromEntries(rows.map((r) => [r.resource_id, r.quantity]));
  for (const ing of ingredients) {
    if ((stock[ing.resourceId] ?? 0) < ing.quantity) return false;
  }
  for (const ing of ingredients) {
    db.prepare('UPDATE materials SET quantity = quantity - ? WHERE character_id = ? AND resource_id = ?')
      .run(ing.quantity, characterId, ing.resourceId);
  }
  return true;
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

// ── Market ─────────────────────────────────────────────────────────────────────

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerWallet: string;
  item: import('@/types/game').ItemInstance;
  priceWei: string;
  listedAt: number;
  cancelLockUntil: number;
  status: 'active' | 'sold' | 'cancelled';
  buyerWallet?: string;
  txHash?: string;
  soldAt?: number;
}

export interface PendingPayout {
  id: string;
  sellerId: string;
  sellerWallet: string;
  listingId: string;
  txHash: string;
  priceWei: string;
  payoutWei: string;
  feeWei: string;
  createdAt: number;
  status: 'pending' | 'paid';
}

const CANCEL_LOCK_SECONDS = 3600; // 1 hour
export const MARKET_FEE_BPS = 500; // 5%

function rowToListing(row: Record<string, unknown>): MarketListing {
  return {
    id: row.id as string,
    sellerId: row.seller_id as string,
    sellerWallet: row.seller_wallet as string,
    item: JSON.parse(row.item_json as string),
    priceWei: row.price_wei as string,
    listedAt: row.listed_at as number,
    cancelLockUntil: (row.cancel_lock_until as number) ?? 0,
    status: row.status as 'active' | 'sold' | 'cancelled',
    buyerWallet: row.buyer_wallet as string | undefined,
    txHash: row.tx_hash as string | undefined,
    soldAt: row.sold_at as number | undefined,
  };
}

export function listItem(
  characterId: string,
  walletAddress: string,
  itemId: string,
  priceWei: string
): MarketListing | null {
  const db = getDb();
  const row = db.prepare('SELECT item_json FROM inventory WHERE id = ? AND character_id = ?')
    .get(itemId, characterId) as { item_json: string } | undefined;
  if (!row) return null;

  const item = JSON.parse(row.item_json);
  db.prepare('DELETE FROM inventory WHERE id = ? AND character_id = ?').run(itemId, characterId);

  const id = uuidv4();
  const cancelLockUntil = Math.floor(Date.now() / 1000) + CANCEL_LOCK_SECONDS;
  db.prepare(`
    INSERT INTO market_listings (id, seller_id, seller_wallet, item_json, price_wei, cancel_lock_until)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, characterId, walletAddress.toLowerCase(), row.item_json, priceWei, cancelLockUntil);

  return rowToListing(
    db.prepare('SELECT * FROM market_listings WHERE id = ?').get(id) as Record<string, unknown>
  );
}

export function getActiveListings(): MarketListing[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM market_listings WHERE status = 'active' ORDER BY listed_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToListing);
}

export function getListingById(id: string): MarketListing | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM market_listings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToListing(row) : null;
}

export function completeSale(
  listingId: string,
  buyerCharId: string,
  buyerWallet: string,
  txHash: string
): boolean {
  const db = getDb();

  return db.transaction(() => {
    // Recheck inside transaction to prevent race conditions
    const listing = db.prepare("SELECT * FROM market_listings WHERE id = ? AND status = 'active'")
      .get(listingId) as Record<string, unknown> | undefined;
    if (!listing) return false;
    if ((listing.seller_id as string) === buyerCharId) return false;

    // Prevent tx hash reuse across any listing
    const existingTx = db.prepare('SELECT id FROM market_listings WHERE tx_hash = ?').get(txHash);
    if (existingTx) return false;

    db.prepare(`
      UPDATE market_listings
      SET status = 'sold', buyer_id = ?, buyer_wallet = ?, tx_hash = ?, sold_at = unixepoch()
      WHERE id = ? AND status = 'active'
    `).run(buyerCharId, buyerWallet.toLowerCase(), txHash, listingId);

    // Transfer item to buyer's inventory
    const itemId = uuidv4();
    db.prepare('INSERT INTO inventory (id, character_id, item_json) VALUES (?, ?, ?)')
      .run(itemId, buyerCharId, JSON.stringify(JSON.parse(listing.item_json as string)));

    // Payment split (seller 95%, treasury 5%) was handled atomically by the smart contract
    return true;
  })();
}

export function cancelListing(listingId: string, characterId: string): { ok: boolean; lockedFor?: number } {
  const db = getDb();
  const listing = getListingById(listingId);
  if (!listing || listing.status !== 'active') return { ok: false };
  if (listing.sellerId !== characterId) return { ok: false };

  const now = Math.floor(Date.now() / 1000);
  if (listing.cancelLockUntil && now < listing.cancelLockUntil) {
    return { ok: false, lockedFor: listing.cancelLockUntil - now };
  }

  db.prepare("UPDATE market_listings SET status = 'cancelled' WHERE id = ?").run(listingId);

  const itemId = uuidv4();
  db.prepare('INSERT INTO inventory (id, character_id, item_json) VALUES (?, ?, ?)')
    .run(itemId, characterId, JSON.stringify(listing.item));

  return { ok: true };
}

export function getPendingPayouts(): PendingPayout[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM pending_payouts ORDER BY created_at DESC").all() as Record<string, unknown>[];
  return rows.map(r => ({
    id: r.id as string,
    sellerId: r.seller_id as string,
    sellerWallet: r.seller_wallet as string,
    listingId: r.listing_id as string,
    txHash: (r.tx_hash as string) ?? '',
    priceWei: r.price_wei as string,
    payoutWei: r.payout_wei as string,
    feeWei: r.fee_wei as string,
    createdAt: r.created_at as number,
    status: r.status as 'pending' | 'paid',
  }));
}

export function markPayoutPaid(payoutId: string): void {
  const db = getDb();
  db.prepare("UPDATE pending_payouts SET status = 'paid' WHERE id = ?").run(payoutId);
}

// Reset a stuck character: cancel active run, set status to idle, clear injury
export function adminResetCharacter(characterId: string): void {
  const db = getDb();
  db.transaction(() => {
    // Cancel any active run (mark as resolved with failure outcome)
    db.prepare(`
      UPDATE runs SET outcome = 'failure', resolved_at = unixepoch()
      WHERE character_id = ? AND resolved_at IS NULL
    `).run(characterId);
    // Reset character status and clear injury
    db.prepare(`
      UPDATE characters SET status = 'idle', injured_until = NULL WHERE id = ?
    `).run(characterId);
  })();
}

export function getSellerListings(characterId: string): MarketListing[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM market_listings WHERE seller_id = ? AND status = 'active' ORDER BY listed_at DESC")
    .all(characterId) as Record<string, unknown>[];
  return rows.map(rowToListing);
}

// ── Admin ──────────────────────────────────────────────────────────────────────

export function adminGetAllCharacters(search?: string) {
  const db = getDb();
  const like = search ? `%${search}%` : null;
  const rows = (like
    ? db.prepare(`
        SELECT c.*, w.address as w_addr FROM characters c
        LEFT JOIN wallets w ON w.character_id = c.id
        WHERE c.name LIKE ? OR w.address LIKE ?
        ORDER BY c.level DESC, c.gold DESC
      `).all(like, like)
    : db.prepare(`
        SELECT c.*, w.address as w_addr FROM characters c
        LEFT JOIN wallets w ON w.character_id = c.id
        ORDER BY c.level DESC, c.gold DESC
      `).all()
  ) as Record<string, unknown>[];
  return rows.map(row => ({ ...rowToCharacter(row), walletAddress: (row.w_addr as string | null) ?? null }));
}

export function adminGetCharacter(id: string) {
  const db = getDb();
  const row = db.prepare(`
    SELECT c.*, w.address as w_addr FROM characters c
    LEFT JOIN wallets w ON w.character_id = c.id
    WHERE c.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...rowToCharacter(row), walletAddress: (row.w_addr as string | null) ?? null };
}

export function adminUpdateCharacter(id: string, fields: Partial<{
  name: string; level: number; xp: number; gold: number; essence: number;
  pwr: number; end_stat: number; lck: number; spd: number; ins: number; stat_points: number;
}>): void {
  const db = getDb();
  const allowed = ['name', 'level', 'xp', 'gold', 'essence', 'pwr', 'end_stat', 'lck', 'spd', 'ins', 'stat_points'];
  const entries = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (entries.length === 0) return;
  const sets = entries.map(([k]) => `${k} = ?`).join(', ');
  db.prepare(`UPDATE characters SET ${sets} WHERE id = ?`).run([...entries.map(([, v]) => v), id]);
}

export interface AdminListing extends MarketListing {
  sellerName: string;
  buyerName?: string;
}

export function adminGetAllListings(): AdminListing[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT m.*, cs.name as seller_name, cb.name as buyer_name
    FROM market_listings m
    LEFT JOIN characters cs ON cs.id = m.seller_id
    LEFT JOIN characters cb ON cb.id = m.buyer_id
    ORDER BY m.listed_at DESC LIMIT 500
  `).all() as Record<string, unknown>[];
  return rows.map(row => ({
    ...rowToListing(row),
    sellerName: (row.seller_name as string) ?? '?',
    buyerName: row.buyer_name as string | undefined,
  }));
}

// ── Promo Codes ────────────────────────────────────────────────────────────────

export type PromoReward =
  | { type: 'gold'; amount: number }
  | { type: 'essence'; amount: number }
  | { type: 'item'; slot: import('@/types/game').EquipmentSlot; rarity: import('@/types/game').Rarity };

export interface PromoCode {
  code: string;
  reward: PromoReward;
  maxUses: number;
  uses: number;
  createdAt: number;
  expiresAt: number | null;
  active: boolean;
}

function rowToPromo(row: Record<string, unknown>): PromoCode {
  return {
    code: row.code as string,
    reward: JSON.parse(row.reward_json as string) as PromoReward,
    maxUses: row.max_uses as number,
    uses: row.uses as number,
    createdAt: row.created_at as number,
    expiresAt: (row.expires_at as number | null) ?? null,
    active: (row.active as number) === 1,
  };
}

export function adminCreatePromoCode(
  code: string,
  reward: PromoReward,
  maxUses: number,
  expiresAt?: number
): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO promo_codes (code, reward_json, max_uses, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(code.toUpperCase().trim(), JSON.stringify(reward), maxUses, expiresAt ?? null);
}

export function adminGetAllPromoCodes(): PromoCode[] {
  const db = getDb();
  return (db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all() as Record<string, unknown>[])
    .map(rowToPromo);
}

export function adminDeactivatePromoCode(code: string): void {
  const db = getDb();
  db.prepare('UPDATE promo_codes SET active = 0 WHERE code = ?').run(code.toUpperCase().trim());
}

export type RedeemResult =
  | { ok: true; reward: PromoReward; item?: import('@/types/game').ItemInstance }
  | { ok: false; error: string };

// ── Floor Progress ────────────────────────────────────────────────────────────

export function getFloorProgress(characterId: string): Record<string, number> {
  const db = getDb();
  const rows = db.prepare(
    'SELECT dungeon_id, saved_floor FROM dungeon_floor_progress WHERE character_id = ?'
  ).all(characterId) as { dungeon_id: string; saved_floor: number }[];
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.dungeon_id] = row.saved_floor;
  }
  return result;
}

export function saveFloorCheckpoint(characterId: string, dungeonId: string, floor: number): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO dungeon_floor_progress (character_id, dungeon_id, saved_floor) VALUES (?, ?, ?)
    ON CONFLICT (character_id, dungeon_id) DO UPDATE SET saved_floor = CASE WHEN excluded.saved_floor > saved_floor THEN excluded.saved_floor ELSE saved_floor END
  `).run(characterId, dungeonId, floor);
}

// ── Settings ───────────────────────────────────────────────────────────────────

export function getMaintenanceMode(): boolean {
  const db = getDb();
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('maintenance') as { value: string } | undefined;
  return row?.value === '1';
}

export function setMaintenanceMode(on: boolean): void {
  const db = getDb();
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run('maintenance', on ? '1' : '0');
}

export function redeemPromoCode(code: string, characterId: string): RedeemResult {
  const db = getDb();
  const normalized = code.toUpperCase().trim();
  const row = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(normalized) as Record<string, unknown> | undefined;
  if (!row) return { ok: false, error: 'Invalid code' };

  const promo = rowToPromo(row);
  if (!promo.active) return { ok: false, error: 'Code is no longer active' };
  if (promo.expiresAt && promo.expiresAt < Math.floor(Date.now() / 1000)) return { ok: false, error: 'Code has expired' };
  if (promo.maxUses > 0 && promo.uses >= promo.maxUses) return { ok: false, error: 'Code has reached its usage limit' };

  // Check this character hasn't already redeemed it
  const already = db.prepare('SELECT 1 FROM promo_redemptions WHERE code = ? AND character_id = ?').get(normalized, characterId);
  if (already) return { ok: false, error: 'You have already redeemed this code' };

  // Apply reward in a transaction
  const grant = db.transaction(() => {
    db.prepare('UPDATE promo_codes SET uses = uses + 1 WHERE code = ?').run(normalized);
    db.prepare('INSERT INTO promo_redemptions (id, code, character_id) VALUES (?, ?, ?)').run(uuidv4(), normalized, characterId);

    if (promo.reward.type === 'gold') {
      addResources(characterId, promo.reward.amount, 0);
      return { ok: true as const, reward: promo.reward };
    }
    if (promo.reward.type === 'essence') {
      addResources(characterId, 0, promo.reward.amount);
      return { ok: true as const, reward: promo.reward };
    }
    if (promo.reward.type === 'item') {
      const { rollFreeItem } = require('@/lib/engine/loot-roller') as typeof import('@/lib/engine/loot-roller');
      const item = rollFreeItem(promo.reward.slot, promo.reward.rarity);
      if (!item) return { ok: false as const, error: 'Could not generate item reward' };
      addItemToInventory(characterId, item);
      return { ok: true as const, reward: promo.reward, item };
    }
    return { ok: false as const, error: 'Unknown reward type' };
  });

  return grant();
}
