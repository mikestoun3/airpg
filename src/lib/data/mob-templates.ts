export type DmgType = 'physical' | 'fire' | 'ice' | 'lightning';

export interface MobTemplate {
  id: string;
  name: string;
  dungeonId: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseEva: number;
  dmgType: DmgType;
  isBoss: boolean;
}

export const MOB_TEMPLATES: MobTemplate[] = [
  // ── Iron Hollows (goblin_warrens) — tier 1 ───────────────────────────────────
  { id: 'scav_scout',      name: 'Scav Scout',       dungeonId: 'goblin_warrens',   baseHp:  70, baseAtk: 12, baseDef:  0, baseEva:  5, dmgType: 'physical',  isBoss: false },
  { id: 'tunnel_rat',      name: 'Tunnel Rat',        dungeonId: 'goblin_warrens',   baseHp:  50, baseAtk: 10, baseDef:  0, baseEva: 12, dmgType: 'physical',  isBoss: false },
  { id: 'iron_shaman',     name: 'Iron Shaman',       dungeonId: 'goblin_warrens',   baseHp:  90, baseAtk: 14, baseDef:  5, baseEva:  3, dmgType: 'fire',      isBoss: false },
  { id: 'hollow_guard',    name: 'Hollow Guard',      dungeonId: 'goblin_warrens',   baseHp: 110, baseAtk: 16, baseDef: 10, baseEva:  0, dmgType: 'physical',  isBoss: false },
  { id: 'clan_enforcer',   name: 'Clan Enforcer',     dungeonId: 'goblin_warrens',   baseHp: 130, baseAtk: 18, baseDef:  8, baseEva:  5, dmgType: 'physical',  isBoss: false },
  { id: 'clan_warchief',   name: 'Clan Warchief',     dungeonId: 'goblin_warrens',   baseHp: 200, baseAtk: 22, baseDef: 15, baseEva:  5, dmgType: 'physical',  isBoss: true  },

  // ── Rift Basin (forgotten_cellar) — tier 1 ───────────────────────────────────
  { id: 'static_drone',    name: 'Static Drone',      dungeonId: 'forgotten_cellar', baseHp:  65, baseAtk: 13, baseDef:  5, baseEva:  8, dmgType: 'lightning', isBoss: false },
  { id: 'echo_wraith',     name: 'Echo Wraith',       dungeonId: 'forgotten_cellar', baseHp:  55, baseAtk: 11, baseDef:  0, baseEva: 20, dmgType: 'ice',       isBoss: false },
  { id: 'relay_specter',   name: 'Relay Specter',     dungeonId: 'forgotten_cellar', baseHp:  80, baseAtk: 15, baseDef:  0, baseEva: 15, dmgType: 'lightning', isBoss: false },
  { id: 'signal_ghost',    name: 'Signal Ghost',      dungeonId: 'forgotten_cellar', baseHp: 100, baseAtk: 17, baseDef:  5, baseEva: 10, dmgType: 'ice',       isBoss: false },
  { id: 'void_crawler',    name: 'Void Crawler',      dungeonId: 'forgotten_cellar', baseHp: 120, baseAtk: 19, baseDef:  8, baseEva:  8, dmgType: 'lightning', isBoss: false },
  { id: 'core_overseer',   name: 'Core Overseer',     dungeonId: 'forgotten_cellar', baseHp: 190, baseAtk: 24, baseDef: 10, baseEva: 10, dmgType: 'lightning', isBoss: true  },

  // ── Rustfall Wastes (ruined_watchtower) — tier 2 ─────────────────────────────
  { id: 'rogue_operator',  name: 'Rogue Operator',    dungeonId: 'ruined_watchtower', baseHp: 140, baseAtk: 24, baseDef: 10, baseEva:  8, dmgType: 'physical',  isBoss: false },
  { id: 'combat_drone',    name: 'Combat Drone',      dungeonId: 'ruined_watchtower', baseHp: 120, baseAtk: 22, baseDef: 15, baseEva:  5, dmgType: 'lightning', isBoss: false },
  { id: 'armored_merc',    name: 'Armored Merc',      dungeonId: 'ruined_watchtower', baseHp: 170, baseAtk: 26, baseDef: 20, baseEva:  3, dmgType: 'physical',  isBoss: false },
  { id: 'war_engineer',    name: 'War Engineer',      dungeonId: 'ruined_watchtower', baseHp: 150, baseAtk: 28, baseDef: 10, baseEva:  8, dmgType: 'fire',      isBoss: false },
  { id: 'elite_sentinel',  name: 'Elite Sentinel',    dungeonId: 'ruined_watchtower', baseHp: 190, baseAtk: 30, baseDef: 15, baseEva:  5, dmgType: 'physical',  isBoss: false },
  { id: 'warzone_cmdr',    name: 'Warzone Commander', dungeonId: 'ruined_watchtower', baseHp: 300, baseAtk: 38, baseDef: 20, baseEva:  8, dmgType: 'physical',  isBoss: true  },

  // ── Void Spire (collapsed_mine) — tier 2 ─────────────────────────────────────
  { id: 'phase_crawler',   name: 'Phase Crawler',     dungeonId: 'collapsed_mine',   baseHp: 160, baseAtk: 28, baseDef:  5, baseEva: 15, dmgType: 'lightning', isBoss: false },
  { id: 'shard_golem',     name: 'Shard Golem',       dungeonId: 'collapsed_mine',   baseHp: 220, baseAtk: 30, baseDef: 25, baseEva:  0, dmgType: 'physical',  isBoss: false },
  { id: 'rift_lurker',     name: 'Rift Lurker',       dungeonId: 'collapsed_mine',   baseHp: 140, baseAtk: 32, baseDef:  8, baseEva: 18, dmgType: 'ice',       isBoss: false },
  { id: 'void_warden',     name: 'Void Warden',       dungeonId: 'collapsed_mine',   baseHp: 200, baseAtk: 35, baseDef: 15, baseEva:  8, dmgType: 'ice',       isBoss: false },
  { id: 'anomaly_colosus', name: 'Anomaly Colossus',  dungeonId: 'collapsed_mine',   baseHp: 260, baseAtk: 38, baseDef: 18, baseEva:  5, dmgType: 'lightning', isBoss: false },
  { id: 'spire_colossus',  name: 'Spire Colossus',    dungeonId: 'collapsed_mine',   baseHp: 420, baseAtk: 48, baseDef: 22, baseEva:  5, dmgType: 'lightning', isBoss: true  },

  // ── Nexus Prime (cursed_catacombs) — tier 3 ──────────────────────────────────
  { id: 'nexus_drone',     name: 'Nexus Drone',       dungeonId: 'cursed_catacombs', baseHp: 240, baseAtk: 42, baseDef: 15, baseEva: 10, dmgType: 'lightning', isBoss: false },
  { id: 'data_specter',    name: 'Data Specter',      dungeonId: 'cursed_catacombs', baseHp: 200, baseAtk: 45, baseDef:  5, baseEva: 25, dmgType: 'ice',       isBoss: false },
  { id: 'neural_knight',   name: 'Neural Knight',     dungeonId: 'cursed_catacombs', baseHp: 300, baseAtk: 48, baseDef: 25, baseEva:  5, dmgType: 'physical',  isBoss: false },
  { id: 'sync_reaper',     name: 'Sync Reaper',       dungeonId: 'cursed_catacombs', baseHp: 260, baseAtk: 50, baseDef: 10, baseEva: 15, dmgType: 'lightning', isBoss: false },
  { id: 'core_sentinel2',  name: 'Core Sentinel',     dungeonId: 'cursed_catacombs', baseHp: 320, baseAtk: 55, baseDef: 20, baseEva: 10, dmgType: 'physical',  isBoss: false },
  { id: 'nexus_archon',    name: 'Nexus Archon',      dungeonId: 'cursed_catacombs', baseHp: 600, baseAtk: 70, baseDef: 25, baseEva: 15, dmgType: 'lightning', isBoss: true  },

  // ── Solar Core (bandit_stronghold) — tier 3 ───────────────────────────────────
  { id: 'core_guard',      name: 'Core Guard',        dungeonId: 'bandit_stronghold', baseHp: 220, baseAtk: 38, baseDef: 18, baseEva:  8, dmgType: 'physical', isBoss: false },
  { id: 'plasma_merc',     name: 'Plasma Mercenary',  dungeonId: 'bandit_stronghold', baseHp: 200, baseAtk: 40, baseDef:  8, baseEva: 12, dmgType: 'fire',     isBoss: false },
  { id: 'reactor_vet',     name: 'Reactor Veteran',   dungeonId: 'bandit_stronghold', baseHp: 260, baseAtk: 44, baseDef: 20, baseEva:  5, dmgType: 'fire',     isBoss: false },
  { id: 'fusion_cmdr',     name: 'Fusion Commander',  dungeonId: 'bandit_stronghold', baseHp: 280, baseAtk: 48, baseDef: 15, baseEva: 10, dmgType: 'fire',     isBoss: false },
  { id: 'elite_champion',  name: 'Elite Champion',    dungeonId: 'bandit_stronghold', baseHp: 300, baseAtk: 52, baseDef: 20, baseEva:  8, dmgType: 'physical', isBoss: false },
  { id: 'reactor_warlord', name: 'Reactor Warlord',   dungeonId: 'bandit_stronghold', baseHp: 550, baseAtk: 65, baseDef: 22, baseEva: 12, dmgType: 'fire',     isBoss: true  },
];

export function getMobsForDungeon(dungeonId: string): MobTemplate[] {
  return MOB_TEMPLATES.filter(m => m.dungeonId === dungeonId);
}

export function pickMobForFloor(dungeonId: string, floor: number, isBoss: boolean): MobTemplate | undefined {
  const mobs = getMobsForDungeon(dungeonId);
  if (isBoss) return mobs.find(m => m.isBoss);
  const normals = mobs.filter(m => !m.isBoss);
  if (normals.length === 0) return mobs[0];
  // Cycle through normal mobs as floor increases
  return normals[floor % normals.length];
}

export function scaleMob(mob: MobTemplate, floor: number): { hp: number; atk: number; def: number; eva: number } {
  const scale = 1 + (floor - 1) * 0.08;
  return {
    hp: Math.round(mob.baseHp * scale),
    atk: Math.round(mob.baseAtk * scale),
    def: mob.baseDef,
    eva: mob.baseEva,
  };
}
