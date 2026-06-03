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

    CREATE TABLE IF NOT EXISTS referral_codes (
      code TEXT PRIMARY KEY,
      character_id TEXT NOT NULL UNIQUE,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referee_id TEXT NOT NULL UNIQUE,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (referrer_id) REFERENCES characters(id),
      FOREIGN KEY (referee_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS quest_completions (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      completed_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(character_id, quest_id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS store_purchases (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      store_item_id TEXT NOT NULL,
      tx_hash TEXT UNIQUE,
      amount_wei TEXT NOT NULL,
      reward_json TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );
  `);

  try { db.exec('ALTER TABLE runs ADD COLUMN pre_rolled_json TEXT'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE characters ADD COLUMN wallet_address TEXT'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE characters ADD COLUMN nickname_set INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE characters ADD COLUMN gender TEXT NOT NULL DEFAULT 'male'"); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE characters ADD COLUMN banned INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE characters ADD COLUMN ban_reason TEXT'); } catch { /* already exists */ }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ip_logs (
        character_id TEXT NOT NULL,
        ip TEXT NOT NULL,
        last_seen INTEGER DEFAULT (unixepoch()),
        PRIMARY KEY (character_id, ip)
      );
    `);
  } catch { /* already exists */ }
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
  try { db.exec('ALTER TABLE characters ADD COLUMN season_points INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE runs ADD COLUMN party_json TEXT'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE characters ADD COLUMN gear_score INTEGER DEFAULT 0'); } catch { /* already exists */ }
  try { db.exec("ALTER TABLE characters ADD COLUMN class TEXT NOT NULL DEFAULT 'warrior'"); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE characters ADD COLUMN skill_points INTEGER NOT NULL DEFAULT 0'); } catch { /* already exists */ }
  // Migrate gender → class (male→warrior, female→assassin) for existing characters
  try {
    db.exec(`UPDATE characters SET class = CASE WHEN gender = 'female' THEN 'assassin' ELSE 'warrior' END WHERE class = 'warrior' AND gender IS NOT NULL`);
  } catch { /* ignore */ }
  // Retroactively give existing characters skill_points = max(0, level - 1)
  try {
    db.exec(`UPDATE characters SET skill_points = MAX(0, level - 1) WHERE skill_points = 0 AND level > 1`);
  } catch { /* ignore */ }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS character_skills (
        character_id TEXT NOT NULL,
        skill_id TEXT NOT NULL,
        ranks INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (character_id, skill_id),
        FOREIGN KEY (character_id) REFERENCES characters(id)
      );
    `);
  } catch { /* already exists */ }

  // Multi-character support
  try { db.exec("ALTER TABLE wallets ADD COLUMN active_class TEXT NOT NULL DEFAULT 'warrior'"); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE wallets ADD COLUMN auto_dungeon_id TEXT'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE wallets ADD COLUMN auto_floors INTEGER NOT NULL DEFAULT 3'); } catch { /* already exists */ }
  try { db.exec('ALTER TABLE wallets ADD COLUMN auto_party_json TEXT'); } catch { /* already exists */ }
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS wallet_characters (
        wallet TEXT NOT NULL,
        char_class TEXT NOT NULL,
        character_id TEXT NOT NULL,
        PRIMARY KEY (wallet, char_class),
        FOREIGN KEY (character_id) REFERENCES characters(id)
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

export function rotateNonce(address: string): void {
  const newNonce = require('crypto').randomBytes(16).toString('hex');
  saveNonce(address, newNonce);
}

export function isCharacterBanned(characterId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT banned FROM characters WHERE id = ?').get(characterId) as { banned: number } | undefined;
  return !!(row?.banned);
}

export function getCharacterIdByWallet(address: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT character_id FROM wallets WHERE address = ? AND character_id IS NOT NULL').get(address) as { character_id: string } | undefined;
  return row?.character_id ?? null;
}

// ── Character ─────────────────────────────────────────────────────────────────

const CLASS_DEFAULT_NAMES: Record<string, string> = {
  warrior: 'Warrior',
  assassin: 'Assassin',
  mage: 'Mage',
};

function createCharacterForClass(db: import('better-sqlite3').Database, cls: string, addr: string): string {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO characters (id, name, class, level, xp, pwr, end_stat, lck, spd, ins, stat_points, skill_points, gold, nickname_set, wallet_address)
    VALUES (?, ?, ?, 1, 0, 5, 5, 3, 3, 3, 0, 0, 50, 1, ?)
  `).run(id, CLASS_DEFAULT_NAMES[cls] ?? cls, cls, addr);
  db.prepare('INSERT INTO equipment (character_id) VALUES (?)').run(id);
  db.prepare('INSERT INTO pity (character_id) VALUES (?)').run(id);
  db.prepare('INSERT INTO wallet_characters (wallet, char_class, character_id) VALUES (?, ?, ?)').run(addr, cls, id);
  return id;
}

// Ensures all 3 class characters exist for a wallet and returns the active one
export function getOrCreateCharacter(walletAddress?: string) {
  const db = getDb();

  if (walletAddress) {
    const addr = walletAddress.toLowerCase();

    // Migrate existing single-character wallets into wallet_characters
    const walletRow = db.prepare('SELECT character_id, active_class FROM wallets WHERE address = ?').get(addr) as { character_id: string | null; active_class: string } | undefined;
    if (walletRow?.character_id) {
      const existingInRoster = db.prepare('SELECT 1 FROM wallet_characters WHERE wallet = ? AND character_id = ?').get(addr, walletRow.character_id);
      if (!existingInRoster) {
        // Migrate: add existing char to roster by its class
        const charRow = db.prepare('SELECT class FROM characters WHERE id = ?').get(walletRow.character_id) as { class: string } | undefined;
        const cls = charRow?.class ?? 'warrior';
        db.prepare('INSERT OR IGNORE INTO wallet_characters (wallet, char_class, character_id) VALUES (?, ?, ?)').run(addr, cls, walletRow.character_id);
        db.prepare('UPDATE wallets SET active_class = ? WHERE address = ?').run(cls, addr);
      }
    }

    // Ensure all 3 class characters exist
    db.transaction(() => {
      for (const cls of ['warrior', 'assassin', 'mage']) {
        const exists = db.prepare('SELECT 1 FROM wallet_characters WHERE wallet = ? AND char_class = ?').get(addr, cls);
        if (!exists) {
          // Make sure we don't create duplicate if wallet somehow linked to a char of this class
          const existing = db.prepare('SELECT id FROM characters WHERE wallet_address = ? AND class = ?').get(addr, cls) as { id: string } | undefined;
          if (existing) {
            db.prepare('INSERT OR IGNORE INTO wallet_characters (wallet, char_class, character_id) VALUES (?, ?, ?)').run(addr, cls, existing.id);
          } else {
            createCharacterForClass(db, cls, addr);
          }
        }
      }
    })();

    // Get active class character
    const activeClass = (db.prepare('SELECT active_class FROM wallets WHERE address = ?').get(addr) as { active_class: string } | undefined)?.active_class ?? 'warrior';
    const rosterRow = db.prepare('SELECT character_id FROM wallet_characters WHERE wallet = ? AND char_class = ?').get(addr, activeClass) as { character_id: string } | undefined;
    const activeId = rosterRow?.character_id;
    if (activeId) {
      const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(activeId) as Record<string, unknown> | undefined;
      if (row) return rowToCharacter(row);
    }

    // Fallback: first in roster
    const fallback = db.prepare('SELECT character_id FROM wallet_characters WHERE wallet = ? LIMIT 1').get(addr) as { character_id: string } | undefined;
    if (fallback) {
      const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(fallback.character_id) as Record<string, unknown> | undefined;
      if (row) return rowToCharacter(row);
    }

    // Should not reach here, but create a new wallet entry just in case
    db.prepare(`
      INSERT INTO wallets (address, character_id, nonce) VALUES (?, NULL, '')
      ON CONFLICT(address) DO NOTHING
    `).run(addr);
    const newId = createCharacterForClass(db, 'warrior', addr);
    return rowToCharacter(db.prepare('SELECT * FROM characters WHERE id = ?').get(newId) as Record<string, unknown>);
  }

  // Legacy: no wallet, grab first character
  const existing = db.prepare('SELECT * FROM characters LIMIT 1').get() as Record<string, unknown> | undefined;
  if (existing) return rowToCharacter(existing);

  const id = uuidv4();
  db.prepare(`INSERT INTO characters (id, name, level, xp, pwr, end_stat, lck, spd, ins, stat_points, gold) VALUES (?, ?, 1, 0, 5, 5, 3, 3, 3, 0, 50)`).run(id, 'Wanderer');
  db.prepare('INSERT INTO equipment (character_id) VALUES (?)').run(id);
  db.prepare('INSERT INTO pity (character_id) VALUES (?)').run(id);
  return rowToCharacter(db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown>);
}

export function getAllCharacterSummaries(walletAddress: string): import('@/types/game').CharacterSummary[] {
  const db = getDb();
  const addr = walletAddress.toLowerCase();
  const rows = db.prepare(`
    SELECT c.id, c.class, c.name, c.level, c.status, c.nickname_set, COALESCE(c.gear_score, 0) as gear_score, c.pwr, c.end_stat
    FROM wallet_characters wc
    JOIN characters c ON c.id = wc.character_id
    WHERE wc.wallet = ?
    ORDER BY CASE wc.char_class WHEN 'warrior' THEN 1 WHEN 'assassin' THEN 2 WHEN 'mage' THEN 3 ELSE 4 END
  `).all(addr) as { id: string; class: string; name: string; level: number; status: string; nickname_set: number; gear_score: number; pwr: number; end_stat: number }[];

  return rows.map(r => ({
    id: r.id,
    charClass: r.class as import('@/types/game').CharacterClass,
    name: r.name,
    level: r.level,
    status: r.status as import('@/types/game').CharacterStatus,
    nicknameSet: !!r.nickname_set,
    gearScore: r.gear_score,
    combatRating: Math.floor(r.pwr * 1.5 + r.end_stat),
  }));
}

export interface AutoRunConfig {
  dungeonId: string;
  floors: number;
  partyIds: string[];
}

export function saveAutoRunConfig(walletAddress: string, config: AutoRunConfig): void {
  const db = getDb();
  db.prepare(`
    UPDATE wallets SET auto_dungeon_id = ?, auto_floors = ?, auto_party_json = ? WHERE address = ?
  `).run(config.dungeonId, config.floors, JSON.stringify(config.partyIds), walletAddress.toLowerCase());
}

export function getAutoRunConfig(walletAddress: string): AutoRunConfig | null {
  const db = getDb();
  const row = db.prepare('SELECT auto_dungeon_id, auto_floors, auto_party_json FROM wallets WHERE address = ?')
    .get(walletAddress.toLowerCase()) as { auto_dungeon_id: string | null; auto_floors: number; auto_party_json: string | null } | undefined;
  if (!row?.auto_dungeon_id) return null;
  let partyIds: string[] = [];
  try { partyIds = row.auto_party_json ? JSON.parse(row.auto_party_json) : []; } catch { /* ignore */ }
  return { dungeonId: row.auto_dungeon_id, floors: row.auto_floors ?? 3, partyIds };
}

export function setActiveClass(walletAddress: string, charClass: string): boolean {
  const db = getDb();
  const addr = walletAddress.toLowerCase();
  const exists = db.prepare('SELECT 1 FROM wallet_characters WHERE wallet = ? AND char_class = ?').get(addr, charClass);
  if (!exists) return false;
  db.prepare('UPDATE wallets SET active_class = ? WHERE address = ?').run(charClass, addr);
  return true;
}

export function isNicknameTaken(nickname: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT id FROM characters WHERE LOWER(name) = LOWER(?) AND nickname_set = 1').get(nickname);
  return !!row;
}

export function setNickname(characterId: string, nickname: string, charClass: import('@/types/game').CharacterClass = 'warrior'): void {
  const db = getDb();
  db.prepare('UPDATE characters SET name = ?, nickname_set = 1, class = ? WHERE id = ?').run(nickname, charClass, characterId);
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

export function upgradeItemInInventory(characterId: string, itemId: string): { ok: boolean; error?: string; item?: ItemInstance; goldSpent?: number } {
  const db = getDb();
  return db.transaction(() => {
    const row = db.prepare('SELECT item_json FROM inventory WHERE id = ? AND character_id = ?').get(itemId, characterId) as { item_json: string } | undefined;
    if (!row) return { ok: false as const, error: 'Item not found.' };

    const item = JSON.parse(row.item_json) as ItemInstance;
    const level = item.upgradeLevel ?? 0;
    if (level >= 5) return { ok: false as const, error: 'Item is fully upgraded.' };

    const UPGRADE_GOLD_BASE: Record<string, number> = { common: 50, uncommon: 120, rare: 300, epic: 700, legendary: 1800 };
    const cost = UPGRADE_GOLD_BASE[item.rarity] * (level + 1);

    // Atomic gold deduction — fails if insufficient
    const result = db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ? AND gold >= ?').run(cost, characterId, cost);
    if (result.changes === 0) return { ok: false as const, error: `Not enough gold. Need ${cost}g.` };

    const upgraded: ItemInstance = { ...item, upgradeLevel: level + 1, gearScore: item.gearScore + 4, primaryValue: item.primaryValue + 3 };
    db.prepare('UPDATE inventory SET item_json = ? WHERE id = ? AND character_id = ?').run(JSON.stringify(upgraded), itemId, characterId);

    return { ok: true as const, item: upgraded, goldSpent: cost };
  })();
}

export function addXpAndLevel(id: string, xpGained: number) {
  const db = getDb();
  const char = db.prepare('SELECT level, xp FROM characters WHERE id = ?').get(id) as { level: number; xp: number };
  let { level, xp } = char;
  xp += xpGained;
  let leveled = false;
  let levelsGained = 0;

  while (level < 30) {
    const needed = xpToNextLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
      leveled = true;
      levelsGained++;
    } else break;
  }

  db.prepare('UPDATE characters SET level = ?, xp = ?, stat_points = stat_points + ?, skill_points = skill_points + ? WHERE id = ?')
    .run(level, xp, levelsGained, levelsGained, id);

  return { leveled, newLevel: level, statPointsGained: levelsGained };
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
  const charClass = (row.class as string ?? 'warrior') as import('@/types/game').CharacterClass;
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
    skillPoints: (row.skill_points as number | undefined) ?? 0,
    skills: [], // loaded separately via getCharacterSkills
    gold: row.gold as number,
    essence: row.essence as number,
    relics: row.relics as number,
    gearScore: 0,
    combatRating: Math.floor(pwr * 1.5 + end),
    status: row.status as import('@/types/game').CharacterStatus,
    injuredUntil: row.injured_until as number | undefined,
    nicknameSet: !!(row.nickname_set as number),
    charClass,
    banned: !!(row.banned as number),
    banReason: (row.ban_reason as string | undefined) ?? undefined,
    seasonPoints: (row.season_points as number | undefined) ?? 0,
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

const VALID_SLOTS: readonly EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];

export function unequipItem(characterId: string, slot: EquipmentSlot) {
  if (!VALID_SLOTS.includes(slot)) throw new Error('Invalid slot');
  const db = getDb();
  // Use a known-safe column name from the allowlist, never interpolate user input directly
  const safeSlot = VALID_SLOTS[VALID_SLOTS.indexOf(slot)];
  const row = db.prepare(`SELECT ${safeSlot} FROM equipment WHERE character_id = ?`).get(characterId) as Record<string, string | null>;
  const json = row?.[safeSlot];
  if (!json) return;

  const item: ItemInstance = JSON.parse(json);
  db.prepare(`UPDATE equipment SET ${safeSlot} = NULL WHERE character_id = ?`).run(characterId);
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
  const db = getDb();
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId) as Record<string, unknown> | undefined;
  if (!row) throw new Error(`Character not found: ${characterId}`);
  const char = rowToCharacter(row);
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
  const lck = char.lck + bonus.lck;
  const spd = char.spd + bonus.spd;
  const ins = char.ins + bonus.ins;
  const combatRating = Math.floor(pwr * 1.5 + end);
  return { pwr, end, lck, spd, ins, combatRating, charClass: char.charClass };
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

export function removeItemFromInventory(characterId: string, itemId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM inventory WHERE id = ? AND character_id = ?').run(itemId, characterId);
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
  preRolledJson?: string,
  partyIds?: string[]
) {
  const db = getDb();
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + durationMinutes * 60;
  const allIds = partyIds && partyIds.length > 0 ? partyIds : [characterId];
  const partyJson = JSON.stringify(allIds);

  db.prepare(`
    INSERT INTO runs (id, character_id, dungeon_id, difficulty, start_time, end_time, pre_rolled_json, party_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, characterId, dungeonId, difficulty, now, endTime, preRolledJson ?? null, partyJson);

  // Set all party members on_run
  const updateStmt = db.prepare('UPDATE characters SET status = ? WHERE id = ?');
  for (const pid of allIds) updateStmt.run('on_run', pid);

  return { id, startTime: now, endTime };
}

export function getActiveRun(characterId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM runs
    WHERE resolved = 0 AND (character_id = ? OR (party_json IS NOT NULL AND party_json LIKE ?))
    ORDER BY created_at DESC LIMIT 1
  `).get(characterId, `%${characterId}%`) as Record<string, unknown> | undefined;
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
  return db.transaction(() => {
    for (const ing of ingredients) {
      const result = db.prepare(
        'UPDATE materials SET quantity = quantity - ? WHERE character_id = ? AND resource_id = ? AND quantity >= ?'
      ).run(ing.quantity, characterId, ing.resourceId, ing.quantity);
      if (result.changes === 0) return false;
    }
    return true;
  })();
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

export function getActiveListings(limit = 30, offset = 0): { listings: MarketListing[]; total: number } {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) as n FROM market_listings WHERE status = 'active'").get() as { n: number }).n;
  const rows = db.prepare("SELECT * FROM market_listings WHERE status = 'active' ORDER BY listed_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Record<string, unknown>[];
  return { listings: rows.map(rowToListing), total };
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

export function updateListingPrice(
  listingId: string,
  characterId: string,
  newPriceWei: string,
): { ok: boolean; error?: string } {
  const db = getDb();
  const listing = getListingById(listingId);
  if (!listing || listing.status !== 'active') return { ok: false, error: 'Listing not found' };
  if (listing.sellerId !== characterId) return { ok: false, error: 'Not your listing' };
  try {
    if (BigInt(newPriceWei) <= BigInt(0)) return { ok: false, error: 'Price must be positive' };
  } catch {
    return { ok: false, error: 'Invalid price' };
  }
  // Reset cancel lock so seller can't lower price right before lock expires then immediately cancel
  const newLockUntil = Math.floor(Date.now() / 1000) + CANCEL_LOCK_SECONDS;
  db.prepare(`
    UPDATE market_listings SET price_wei = ?, cancel_lock_until = ?
    WHERE id = ? AND status = 'active'
  `).run(newPriceWei, newLockUntil, listingId);
  return { ok: true };
}

export function incrementEquippedAttunement(characterId: string): void {
  const db = getDb();
  const slots: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];
  const row = db.prepare('SELECT * FROM equipment WHERE character_id = ?').get(characterId) as Record<string, string | null> | undefined;
  if (!row) return;
  for (const slot of slots) {
    const json = row[slot];
    if (!json) continue;
    const item = JSON.parse(json) as import('@/types/game').ItemInstance;
    item.attunementRuns = (item.attunementRuns ?? 0) + 1;
    db.prepare(`UPDATE equipment SET ${slot} = ? WHERE character_id = ?`).run(JSON.stringify(item), characterId);
  }
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

export function getBannedCharacters(): Array<{ id: string; name: string; level: number; walletAddress: string | null; banReason?: string }> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.id, c.name, c.level, c.ban_reason, w.address as w_addr
    FROM characters c
    LEFT JOIN wallets w ON w.character_id = c.id
    WHERE c.banned = 1
    ORDER BY c.name
  `).all() as Array<{ id: string; name: string; level: number; ban_reason: string | null; w_addr: string | null }>;
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    level: r.level,
    walletAddress: r.w_addr,
    banReason: r.ban_reason ?? undefined,
  }));
}

export function banCharacter(id: string, reason?: string): void {
  const db = getDb();
  db.prepare('UPDATE characters SET banned = 1, ban_reason = ? WHERE id = ?').run(reason ?? null, id);
}

export function unbanCharacter(id: string): void {
  const db = getDb();
  db.prepare('UPDATE characters SET banned = 0, ban_reason = NULL WHERE id = ?').run(id);
}

export function logIp(characterId: string, ip: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO ip_logs (character_id, ip, last_seen) VALUES (?, ?, unixepoch())
    ON CONFLICT(character_id, ip) DO UPDATE SET last_seen = unixepoch()
  `).run(characterId, ip);
}

export function getIpAnalytics(): Array<{
  ip: string;
  characters: Array<{ id: string; name: string; level: number; walletAddress: string | null; banned: boolean; lastSeen: number }>;
}> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT l.ip, l.character_id, l.last_seen,
           c.name, c.level, c.banned, w.address as wallet
    FROM ip_logs l
    JOIN characters c ON c.id = l.character_id
    LEFT JOIN wallets w ON w.character_id = c.id
    ORDER BY l.ip, l.last_seen DESC
  `).all() as Array<{ ip: string; character_id: string; last_seen: number; name: string; level: number; banned: number; wallet: string | null }>;

  const grouped = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!grouped.has(row.ip)) grouped.set(row.ip, []);
    grouped.get(row.ip)!.push(row);
  }

  return Array.from(grouped.entries())
    .filter(([, chars]) => chars.length > 1)
    .map(([ip, chars]) => ({
      ip,
      characters: chars.map(r => ({
        id: r.character_id,
        name: r.name,
        level: r.level,
        walletAddress: r.wallet,
        banned: !!r.banned,
        lastSeen: r.last_seen,
      })),
    }))
    .sort((a, b) => b.characters.length - a.characters.length);
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

// ── Referrals ─────────────────────────────────────────────────────────────────

export function getOrCreateReferralCode(characterId: string): string {
  const db = getDb();
  const existing = db.prepare('SELECT code FROM referral_codes WHERE character_id = ?').get(characterId) as { code: string } | undefined;
  if (existing) return existing.code;

  const base = characterId.replace(/-/g, '').slice(0, 8).toUpperCase();
  let code = base;
  let suffix = 0;
  while (db.prepare('SELECT character_id FROM referral_codes WHERE code = ?').get(code)) {
    code = (base.slice(0, 6) + (suffix++).toString(16).padStart(2, '0')).toUpperCase();
  }
  db.prepare('INSERT INTO referral_codes (code, character_id) VALUES (?, ?)').run(code, characterId);
  return code;
}

export function getCharacterByReferralCode(code: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT character_id FROM referral_codes WHERE code = ?').get(code.toUpperCase()) as { character_id: string } | undefined;
  return row?.character_id ?? null;
}

export function applyReferral(referrerCode: string, refereeId: string): { ok: boolean; error?: string } {
  const db = getDb();
  const referrerId = getCharacterByReferralCode(referrerCode);
  if (!referrerId) return { ok: false, error: 'Invalid referral code' };
  if (referrerId === refereeId) return { ok: false, error: 'Cannot refer yourself' };

  const existing = db.prepare('SELECT id FROM referrals WHERE referee_id = ?').get(refereeId);
  if (existing) return { ok: false, error: 'Already referred' };

  db.transaction(() => {
    db.prepare('INSERT INTO referrals (id, referrer_id, referee_id) VALUES (?, ?, ?)').run(uuidv4(), referrerId, refereeId);
    addResources(refereeId, 300, 30);
    addResources(referrerId, 200, 20);
  })();

  return { ok: true };
}

export function getReferralCount(characterId: string): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM referrals WHERE referrer_id = ?').get(characterId) as { cnt: number };
  return row.cnt;
}

export function getReferralInfo(characterId: string): {
  referredBy: { id: string; name: string; walletAddress: string | null } | null;
  referrals: Array<{ id: string; name: string; walletAddress: string | null; createdAt: number }>;
  code: string | null;
} {
  const db = getDb();
  // Who referred this character
  const referrerRow = db.prepare(`
    SELECT c.id, c.name, w.address as wallet
    FROM referrals r
    JOIN characters c ON c.id = r.referrer_id
    LEFT JOIN wallets w ON w.character_id = c.id
    WHERE r.referee_id = ?
  `).get(characterId) as { id: string; name: string; wallet: string | null } | undefined;

  // Who this character has referred
  const referredRows = db.prepare(`
    SELECT c.id, c.name, w.address as wallet, r.created_at
    FROM referrals r
    JOIN characters c ON c.id = r.referee_id
    LEFT JOIN wallets w ON w.character_id = c.id
    WHERE r.referrer_id = ?
    ORDER BY r.created_at DESC
  `).all(characterId) as Array<{ id: string; name: string; wallet: string | null; created_at: number }>;

  // This character's referral code
  const codeRow = db.prepare('SELECT code FROM referral_codes WHERE character_id = ?').get(characterId) as { code: string } | undefined;

  return {
    referredBy: referrerRow ? { id: referrerRow.id, name: referrerRow.name, walletAddress: referrerRow.wallet } : null,
    referrals: referredRows.map(r => ({ id: r.id, name: r.name, walletAddress: r.wallet, createdAt: r.created_at })),
    code: codeRow?.code ?? null,
  };
}

// ── Quests ────────────────────────────────────────────────────────────────────

export function getCompletedQuests(characterId: string): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT quest_id FROM quest_completions WHERE character_id = ?').all(characterId) as { quest_id: string }[];
  return rows.map(r => r.quest_id);
}

export function completeQuest(characterId: string, questId: string, reward: { gold: number; essence: number }): { ok: boolean; error?: string } {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM quest_completions WHERE character_id = ? AND quest_id = ?').get(characterId, questId);
  if (existing) return { ok: false, error: 'Quest already completed' };

  db.transaction(() => {
    db.prepare('INSERT INTO quest_completions (id, character_id, quest_id) VALUES (?, ?, ?)').run(uuidv4(), characterId, questId);
    addResources(characterId, reward.gold, reward.essence);
  })();

  return { ok: true };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export function recordStorePurchase(
  characterId: string,
  storeItemId: string,
  txHash: string,
  amountWei: string,
  rewardJson: string,
): { ok: boolean; error?: string } {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM store_purchases WHERE tx_hash = ?').get(txHash);
  if (existing) return { ok: false, error: 'Transaction already used' };
  try {
    db.prepare('INSERT INTO store_purchases (id, character_id, store_item_id, tx_hash, amount_wei, reward_json) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), characterId, storeItemId, txHash, amountWei, rewardJson);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Purchase record failed' };
  }
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

// ── Party helpers ─────────────────────────────────────────────────────────────

export function getCharacterById(id: string) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToCharacter(row) : null;
}

export function validatePartyForWallet(wallet: string, partyIds: string[]): { ok: boolean; error?: string } {
  const db = getDb();
  const addr = wallet.toLowerCase();
  for (const id of partyIds) {
    const row = db.prepare('SELECT char_class FROM wallet_characters WHERE wallet = ? AND character_id = ?').get(addr, id);
    if (!row) return { ok: false, error: `Character ${id} does not belong to this wallet` };
    const status = (db.prepare('SELECT status FROM characters WHERE id = ?').get(id) as { status: string } | undefined)?.status;
    if (status !== 'idle') return { ok: false, error: 'All party members must be idle' };
  }
  return { ok: true };
}

export function setPartyStatus(charIds: string[], status: string, injuredUntil?: number): void {
  const db = getDb();
  const stmt = db.prepare('UPDATE characters SET status = ?, injured_until = ? WHERE id = ?');
  for (const id of charIds) stmt.run(status, injuredUntil ?? null, id);
}

export function getRunPartyIds(runId: string): string[] {
  const db = getDb();
  const row = db.prepare('SELECT party_json, character_id FROM runs WHERE id = ?').get(runId) as { party_json: string | null; character_id: string } | undefined;
  if (!row) return [];
  if (row.party_json) {
    try { return JSON.parse(row.party_json) as string[]; } catch { /* ignore */ }
  }
  return [row.character_id];
}

// ── Skills ────────────────────────────────────────────────────────────────────

export function getCharacterSkills(characterId: string): import('@/types/game').CharacterSkill[] {
  const db = getDb();
  const rows = db.prepare('SELECT skill_id, ranks FROM character_skills WHERE character_id = ?').all(characterId) as { skill_id: string; ranks: number }[];
  return rows.map(r => ({ skillId: r.skill_id, ranks: r.ranks }));
}

export function getCharacterSkillBonus(characterId: string): import('@/lib/engine/combat-engine').SkillBonus {
  const { getSkill } = require('@/lib/data/skills') as typeof import('@/lib/data/skills');
  const skills = getCharacterSkills(characterId);
  const bonus: import('@/lib/engine/combat-engine').SkillBonus = {};
  for (const s of skills) {
    const def = getSkill(s.skillId);
    if (!def) continue;
    const stat = def.effectStat as keyof import('@/lib/engine/combat-engine').SkillBonus;
    bonus[stat] = (bonus[stat] ?? 0) + def.effectPerRank * s.ranks;
  }
  return bonus;
}

export function spendSkillPoint(characterId: string, skillId: string): { ok: boolean; error?: string } {
  const db = getDb();
  const { getSkill } = require('@/lib/data/skills') as typeof import('@/lib/data/skills');
  const char = db.prepare('SELECT skill_points, level, class FROM characters WHERE id = ?').get(characterId) as { skill_points: number; level: number; class: string } | undefined;
  if (!char) return { ok: false, error: 'Character not found' };
  if (char.skill_points <= 0) return { ok: false, error: 'No skill points available' };

  const def = getSkill(skillId);
  if (!def) return { ok: false, error: 'Unknown skill' };
  if (def.forClass !== char.class) return { ok: false, error: 'Wrong class for this skill' };
  if (char.level < def.requiredLevel) return { ok: false, error: `Requires level ${def.requiredLevel}` };

  const existing = db.prepare('SELECT ranks FROM character_skills WHERE character_id = ? AND skill_id = ?').get(characterId, skillId) as { ranks: number } | undefined;
  const currentRanks = existing?.ranks ?? 0;
  if (currentRanks >= def.maxRanks) return { ok: false, error: 'Skill is already at max rank' };

  db.transaction(() => {
    db.prepare('UPDATE characters SET skill_points = skill_points - 1 WHERE id = ?').run(characterId);
    if (existing) {
      db.prepare('UPDATE character_skills SET ranks = ranks + 1 WHERE character_id = ? AND skill_id = ?').run(characterId, skillId);
    } else {
      db.prepare('INSERT INTO character_skills (character_id, skill_id, ranks) VALUES (?, ?, 1)').run(characterId, skillId);
    }
  })();

  return { ok: true };
}

// ── Season Points & Leaderboard ───────────────────────────────────────────────

export function addSeasonPoints(characterId: string, points: number): void {
  if (points <= 0) return;
  const db = getDb();
  db.prepare('UPDATE characters SET season_points = season_points + ? WHERE id = ?').run(points, characterId);
}

export interface LeaderboardEntry {
  rank: number;
  nickname: string | null;
  shortWallet: string;
  level: number;
  seasonPoints: number;
  gearScore: number;
  combatRating: number;
  isCurrentPlayer: boolean;
}

export function getLeaderboard(currentCharacterId?: string): {
  bySeason: LeaderboardEntry[];
  byPower: LeaderboardEntry[];
} {
  const db = getDb();

  const rows = db.prepare(`
    SELECT id, name, nickname_set, wallet_address, level, season_points,
           COALESCE(gear_score, 0) as gear_score,
           pwr, end_stat
    FROM characters
    WHERE banned = 0
  `).all() as {
    id: string; name: string; nickname_set: number; wallet_address: string | null;
    level: number; season_points: number; gear_score: number;
    pwr: number; end_stat: number;
  }[];

  const mapped = rows.map(r => {
    const shortWallet = r.wallet_address
      ? r.wallet_address.slice(0, 6) + '…' + r.wallet_address.slice(-4)
      : '???';
    return {
      id: r.id,
      nickname: r.nickname_set ? r.name : null,
      shortWallet,
      level: r.level,
      seasonPoints: r.season_points,
      gearScore: r.gear_score,
      combatRating: Math.floor(r.pwr * 1.5 + r.end_stat),
      isCurrentPlayer: r.id === currentCharacterId,
    };
  });

  const bySeason = [...mapped]
    .sort((a, b) => b.seasonPoints - a.seasonPoints || b.level - a.level)
    .slice(0, 100)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  const byPower = [...mapped]
    .sort((a, b) => b.gearScore - a.gearScore || b.combatRating - a.combatRating || b.level - a.level)
    .slice(0, 100)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  return { bySeason, byPower };
}
