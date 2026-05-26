'use client';
import { useState } from 'react';

type Section = 'overview' | 'stats' | 'combat' | 'floors' | 'items' | 'dungeons' | 'outcomes' | 'xp';

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'overview', label: 'How to Play',    icon: '📖' },
  { id: 'stats',    label: 'Character Stats', icon: '📊' },
  { id: 'combat',   label: 'Combat',          icon: '⚔️' },
  { id: 'floors',   label: 'Floor System',    icon: '🗺️' },
  { id: 'items',    label: 'Items & Gear',    icon: '⚙️' },
  { id: 'dungeons', label: 'Dungeons',        icon: '🏚️' },
  { id: 'outcomes', label: 'Outcomes',        icon: '🎲' },
  { id: 'xp',       label: 'XP & Leveling',  icon: '⭐' },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-slate-100 font-bold text-lg mb-4 flex items-center gap-2">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-violet-300 font-semibold text-sm mb-2 mt-4">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[#9090b8] text-sm leading-relaxed mb-2">{children}</p>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-[#0f0f28] border border-[rgba(120,110,200,0.2)] rounded px-1.5 py-0.5 text-violet-300 text-xs font-mono">{children}</code>;
}
function Box({ children, color = 'purple' }: { children: React.ReactNode; color?: 'purple' | 'amber' | 'emerald' | 'red' | 'blue' }) {
  const colors = {
    purple: 'bg-violet-950/30 border-violet-700/30',
    amber:  'bg-amber-950/30 border-amber-700/30',
    emerald:'bg-emerald-950/30 border-emerald-700/30',
    red:    'bg-red-950/30 border-red-700/30',
    blue:   'bg-blue-950/30 border-blue-700/30',
  };
  return (
    <div className={`border rounded-xl p-4 mb-3 ${colors[color]}`}>{children}</div>
  );
}
function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[rgba(120,110,200,0.08)] last:border-0">
      <span className="text-[#7070a0] text-sm">{label}</span>
      <div className="text-right">
        <span className="text-slate-200 text-sm font-mono">{value}</span>
        {sub && <div className="text-[#5050a0] text-[10px]">{sub}</div>}
      </div>
    </div>
  );
}

export function WikiTab() {
  const [section, setSection] = useState<Section>('overview');

  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar */}
      <div className="w-48 flex-shrink-0">
        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-2 space-y-0.5 sticky top-0">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                section === s.id
                  ? 'bg-[#1e1e40] text-slate-100 border border-[rgba(120,110,200,0.25)]'
                  : 'text-[#6060a0] hover:bg-[#1a1a30] hover:text-[#a0a0c0]'
              }`}>
              <span className="text-base">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-6 max-w-3xl">

          {/* ── Overview ── */}
          {section === 'overview' && (
            <div>
              <H2>📖 How to Play</H2>
              <P>AirPG is an idle dungeon RPG. You send your hero into dungeons and wait — combat is resolved automatically when the timer ends.</P>

              <H3>Core Loop</H3>
              <Box color="purple">
                <ol className="space-y-2 text-sm text-[#9090b8]">
                  <li><span className="text-violet-300 font-bold">1. Pick a dungeon</span> in Adventure and choose how many floors (1–10).</li>
                  <li><span className="text-violet-300 font-bold">2. Send your hero</span> — each floor takes ~2 minutes. Speed stat reduces this.</li>
                  <li><span className="text-violet-300 font-bold">3. Hero returns</span> — collect loot, gold, XP and materials.</li>
                  <li><span className="text-violet-300 font-bold">4. Upgrade</span> — equip better gear, level up stats, build camp upgrades.</li>
                  <li><span className="text-violet-300 font-bold">5. Go deeper</span> — floors scale in difficulty. Every 10th floor is a boss. Progress is saved at floor 10 checkpoints.</li>
                </ol>
              </Box>

              <H3>Key Numbers at a Glance</H3>
              <div className="bg-[#0f0f22] rounded-xl p-4 space-y-0">
                <Row label="Floor duration" value="2 min / floor" sub="reduced by SPD stat" />
                <Row label="Max floors per run" value="10" />
                <Row label="Checkpoint every" value="10 floors" sub="next run starts from saved floor" />
                <Row label="Boss every" value="10th floor" sub="3× loot drop" />
                <Row label="Max level" value="30" />
                <Row label="Equipment slots" value="6" sub="weapon, helmet, chest, boots, ring, trinket" />
              </div>

              <H3>Equipment Lock</H3>
              <P>You cannot equip or unequip items while your hero is on a run. Change gear before sending them out.</P>

              <H3>Injury</H3>
              <P>A failed run may injure your hero. During recovery they cannot be sent on new expeditions. Injury time scales with dungeon tier.</P>
            </div>
          )}

          {/* ── Stats ── */}
          {section === 'stats' && (
            <div>
              <H2>📊 Character Stats</H2>
              <P>Each stat has a specific mechanical effect. You gain 1 stat point per level. Stats are permanent once spent.</P>

              <Box color="purple">
                <H3>⚔ Power (PWR)</H3>
                <P>The most important combat stat. Contributes <Code>1.5×</Code> to your Combat Rating.</P>
                <div className="bg-[#0f0f22] rounded-lg p-3 mt-2">
                  <Row label="+1 PWR" value="+1.5 CR" sub="example: PWR 10 → CR +15" />
                  <Row label="PWR 20" value="+30 CR" />
                  <Row label="Effect" value="Higher CR → better odds on every floor" />
                </div>
              </Box>

              <Box color="blue">
                <H3>🛡 Endurance (END)</H3>
                <P>Contributes <Code>1.0×</Code> to Combat Rating. Also reduces injury on failures.</P>
                <div className="bg-[#0f0f22] rounded-lg p-3 mt-2">
                  <Row label="+1 END" value="+1.0 CR" />
                  <Row label="END 10" value="+10 CR" />
                  <Row label="Effect" value="Steady CR boost, best combined with PWR" />
                </div>
              </Box>

              <Box color="amber">
                <H3>✦ Luck (LCK)</H3>
                <P>Does not affect success chance. Shifts the loot rarity distribution toward higher tiers.</P>
                <div className="bg-[#0f0f22] rounded-lg p-3 mt-2">
                  <Row label="+1 LCK" value="−0.75% Common weight" sub="distributed to higher rarities" />
                  <Row label="+1 LCK" value="+0.5% Uncommon" />
                  <Row label="+1 LCK" value="+0.5% Rare" />
                  <Row label="Cap" value="20 LCK max bonus" sub="~15 effective for shift" />
                </div>
                <P>At high LCK the common pool shrinks significantly and rare/epic items drop more often.</P>
              </Box>

              <Box color="emerald">
                <H3>💨 Speed (SPD)</H3>
                <P>Reduces run duration. More runs = more loot over time.</P>
                <div className="bg-[#0f0f22] rounded-lg p-3 mt-2">
                  <Row label="+1 SPD" value="−2% run time" />
                  <Row label="SPD 10" value="−20% duration" sub="10-floor run: 20→16 min" />
                  <Row label="SPD 20" value="−40% duration" sub="10-floor run: 20→12 min" />
                  <Row label="Cap" value="40% reduction max" sub="at SPD 20+" />
                </div>
              </Box>

              <Box color="purple">
                <H3>👁 Insight (INS)</H3>
                <P>Increases XP gained from every run. Great for leveling quickly.</P>
                <div className="bg-[#0f0f22] rounded-lg p-3 mt-2">
                  <Row label="+1 INS" value="+2% XP" />
                  <Row label="INS 10" value="+20% XP" />
                  <Row label="INS 20" value="+40% XP" />
                  <Row label="Formula" value="baseXP × (1 + INS × 0.02)" />
                </div>
              </Box>

              <H3>Combat Rating Formula</H3>
              <Box color="blue">
                <p className="text-center font-mono text-violet-200 text-base py-1">
                  CR = floor(PWR × 1.5 + END × 1.0)
                </p>
                <p className="text-[#6060a0] text-xs text-center mt-1">Example: PWR 8, END 5 → CR = floor(12 + 5) = 17</p>
              </Box>
            </div>
          )}

          {/* ── Combat ── */}
          {section === 'combat' && (
            <div>
              <H2>⚔️ Combat System</H2>
              <P>Combat is fully automatic. When a run ends, each floor rolls a d100 and compares to the floor's DC.</P>

              <H3>How a Floor Roll Works</H3>
              <Box color="purple">
                <ol className="space-y-1.5 text-sm text-[#9090b8]">
                  <li>1. System rolls <Code>d100</Code> (1–100)</li>
                  <li>2. Adds your <Code>Combat Rating</Code> → <Code>Effective = roll + CR</Code></li>
                  <li>3. Compares against floor thresholds based on <Code>DC</Code></li>
                </ol>
              </Box>

              <H3>Outcome Thresholds</H3>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="Critical Success" value="Effective ≥ DC + 81" sub="loot ×3, no injury" />
                <Row label="Success"          value="Effective ≥ DC + 51" sub="loot ×2, no injury" />
                <Row label="Partial Success"  value="Effective ≥ DC + 31" sub="loot ×1 (common only), 5% injury, gold ×0.5" />
                <Row label="Failure"          value="Effective ≥ DC + 16" sub="no loot, 30% injury" />
                <Row label="Critical Failure" value="Effective < DC + 16" sub="no loot, 100% injury, run ends" />
              </div>

              <H3>Success Probability Formula</H3>
              <Box color="blue">
                <p className="text-center font-mono text-violet-200 text-base py-1">
                  P(success+) = clamp((CR − DC + 50) / 100, 5%, 95%)
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-[#6060a0] text-xs text-center">CR = DC → 50% odds · CR = DC+30 → 80% odds · CR = DC+45 → 95% (cap)</p>
                </div>
              </Box>

              <H3>Examples</H3>
              <div className="bg-[#0f0f22] rounded-xl p-4 space-y-3 text-sm text-[#9090b8]">
                <div>
                  <p className="text-slate-300 font-semibold mb-1">Floor 1 of Goblin Warrens (DC 5)</p>
                  <p>CR 17 → odds = (17 − 5 + 50) / 100 = <span className="text-emerald-400 font-bold">62%</span> success</p>
                </div>
                <div>
                  <p className="text-slate-300 font-semibold mb-1">Floor 5 of Goblin Warrens (DC 15)</p>
                  <p>CR 17 → odds = (17 − 15 + 50) / 100 = <span className="text-amber-400 font-bold">52%</span> success</p>
                </div>
                <div>
                  <p className="text-slate-300 font-semibold mb-1">Floor 10 boss (DC 28)</p>
                  <p>CR 17 → odds = (17 − 28 + 50) / 100 = <span className="text-red-400 font-bold">39%</span> success</p>
                </div>
              </div>

              <H3>Injury Duration</H3>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="Tier 1 dungeon" value="45 min" sub="30 + 1×15" />
                <Row label="Tier 2 dungeon" value="60 min" sub="30 + 2×15" />
                <Row label="Tier 3 dungeon" value="75 min" sub="30 + 3×15" />
              </div>
            </div>
          )}

          {/* ── Floors ── */}
          {section === 'floors' && (
            <div>
              <H2>🗺️ Floor System</H2>

              <H3>How Floors Work</H3>
              <P>Each dungeon has unlimited floors. Difficulty scales with floor number. You choose 1–10 floors per run. Each floor costs ~2 minutes of real time.</P>

              <H3>Floor DC Formula</H3>
              <Box color="purple">
                <p className="text-center font-mono text-violet-200 text-base py-1">
                  Floor DC = round(baseDC + (floor − 1) × dcStep)
                </p>
                <p className="text-[#6060a0] text-xs text-center mt-1">Example: Goblin Warrens floor 5 = round(5 + 4 × 2.5) = 15</p>
              </Box>

              <H3>Checkpoints</H3>
              <Box color="emerald">
                <P>Every 10th floor cleared saves your progress. Next run starts from floor 11, 21, etc. If you fail before floor 10, you start over from floor 1.</P>
                <P>Checkpoints are <span className="text-emerald-300 font-semibold">per dungeon</span> — each dungeon tracks progress independently.</P>
              </Box>

              <H3>Boss Floors</H3>
              <Box color="amber">
                <P>Every 10th floor is a boss fight. Bosses drop <span className="text-amber-300 font-semibold">3 items</span> instead of 2 on success, but have higher DC than regular floors.</P>
                <div className="bg-[#0f0f22] rounded-lg p-3 mt-2">
                  <Row label="Boss loot (success)" value="3 items" sub="vs. 2 for normal floors" />
                  <Row label="Partial success" value="1 item (common/uncommon only)" />
                  <Row label="Failure" value="No loot + 30–100% injury chance" />
                </div>
              </Box>

              <H3>Floor Progression — Loot Quality</H3>
              <P>Higher floors shift rarity weights. Every 10 floors, the common pool shrinks by 8%, redistributed to higher rarities.</P>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="Floors 1–9"   value="Base weights" />
                <Row label="Floors 10–19" value="−8% common"   sub="+~8% spread to rare/epic/legendary" />
                <Row label="Floors 20–29" value="−16% common"  />
                <Row label="Floors 30–39" value="−24% common"  sub="common min: 5%" />
              </div>

              <H3>Gold Scaling Per Floor</H3>
              <Box color="amber">
                <p className="text-center font-mono text-violet-200 text-sm py-1">
                  Gold = baseGold × (1 + (floor − 1) × 0.08)
                </p>
                <p className="text-[#6060a0] text-xs text-center mt-1">Floor 10 = +72% gold · Floor 20 = +152% gold</p>
              </Box>

              <H3>Run Duration</H3>
              <Box color="blue">
                <p className="text-center font-mono text-violet-200 text-sm py-1">
                  Duration = floors × 2 min × (1 − min(SPD × 0.02, 0.4)) × shrineBonus
                </p>
                <div className="mt-3 text-sm text-[#9090b8] space-y-1">
                  <p>• SPD 0: 10 floors = 20 min</p>
                  <p>• SPD 10: 10 floors = 16 min (−20%)</p>
                  <p>• SPD 20: 10 floors = 12 min (−40%, cap)</p>
                  <p>• Shrine of Swiftness: additional ×0.9 (−10%)</p>
                </div>
              </Box>
            </div>
          )}

          {/* ── Items ── */}
          {section === 'items' && (
            <div>
              <H2>⚙️ Items & Gear Score</H2>

              <H3>Equipment Slots</H3>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="Weapon"  value="PWR focus" />
                <Row label="Helmet"  value="END focus" />
                <Row label="Chest"   value="END / PWR" />
                <Row label="Boots"   value="SPD focus" />
                <Row label="Ring"    value="LCK / INS" />
                <Row label="Trinket" value="Mixed stats" />
              </div>

              <H3>Rarity Tiers</H3>
              <div className="space-y-2">
                {[
                  { rarity: 'Common',    color: 'text-slate-400',   gs: 5,   primary: '1–4',   secondary: '0',  effects: '—' },
                  { rarity: 'Uncommon',  color: 'text-emerald-400', gs: 12,  primary: '4–8',   secondary: '1',  effects: '—' },
                  { rarity: 'Rare',      color: 'text-blue-400',    gs: 22,  primary: '8–14',  secondary: '2',  effects: '—' },
                  { rarity: 'Epic',      color: 'text-purple-400',  gs: 38,  primary: '14–22', secondary: '3',  effects: '1 special' },
                  { rarity: 'Legendary', color: 'text-amber-400',   gs: 60,  primary: '22–36', secondary: '3',  effects: '2 specials' },
                ].map(r => (
                  <div key={r.rarity} className="bg-[#0f0f22] rounded-xl p-3 flex items-center gap-4">
                    <span className={`font-bold text-sm w-24 ${r.color}`}>{r.rarity}</span>
                    <div className="flex-1 grid grid-cols-4 gap-2 text-xs text-[#7070a0]">
                      <div><span className="text-[#5050a0]">GS</span> <span className="text-slate-300 font-bold">{r.gs}</span></div>
                      <div><span className="text-[#5050a0]">Primary</span> <span className="text-slate-300">{r.primary}</span></div>
                      <div><span className="text-[#5050a0]">2nd stats</span> <span className="text-slate-300">{r.secondary}</span></div>
                      <div><span className="text-[#5050a0]">Effects</span> <span className="text-slate-300">{r.effects}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <H3>Gear Score (GS)</H3>
              <P>Gear Score is the sum of GS values of all equipped items. Max possible GS with 6 legendary items = <Code>360</Code>.</P>
              <P>GS is used to unlock higher-tier dungeons and for matchmaking on the Market.</P>

              <H3>Special Effects</H3>
              <P>Epic items have 1 special effect, Legendary items have 2. Effects are randomly assigned.</P>
              <div className="bg-[#0f0f22] rounded-xl p-4 space-y-2 text-sm">
                {[
                  ['Night Stalker',    '+15% success in underground dungeons'],
                  ['Lucky Break',      '30% chance to ignore injury on failure'],
                  ['Treasure Sense',   '+1 bonus loot roll on Critical Success'],
                  ['Ironhide',         'Injury duration reduced by 50%'],
                  ["Scavenger's Eye",  '+10 guaranteed gold on any run'],
                  ['Swift Reflexes',   '−10% run duration'],
                  ["Scholar's Mind",   '+20% XP gained'],
                ].map(([name, desc]) => (
                  <div key={name} className="flex items-start gap-3">
                    <span className="text-violet-400 font-semibold w-36 shrink-0">{name}</span>
                    <span className="text-[#8080b0]">{desc}</span>
                  </div>
                ))}
              </div>

              <H3>Loot Pity System</H3>
              <P>The game tracks your last high-rarity drop and guarantees a minimum after a certain number of runs.</P>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="Uncommon guarantee" value="Every 5 runs without one" />
                <Row label="Rare guarantee"     value="Every 20 runs without one" />
                <Row label="Epic guarantee"     value="Every 75 runs without one" />
              </div>
            </div>
          )}

          {/* ── Dungeons ── */}
          {section === 'dungeons' && (
            <div>
              <H2>🏚️ Dungeons</H2>
              <P>There are 6 dungeons across 3 tiers. Higher tiers require unlocking via clears, level, or Gear Score.</P>

              {[
                {
                  name: 'Goblin Warrens', tier: 1, baseDC: 5, step: 2.5,
                  f1dc: 5, f10dc: 28, f20dc: 53,
                  unlock: 'Available from start',
                  loot: 'Gold, iron, common gear',
                  boss: 'Goblin Chieftain (floor 10)',
                  injury: '45 min',
                  color: 'from-slate-700 to-slate-600',
                },
                {
                  name: 'Forgotten Cellar', tier: 1, baseDC: 8, step: 3,
                  f1dc: 8, f10dc: 35, f20dc: 65,
                  unlock: 'Available from start',
                  loot: 'Common gear, potions, uncommon chance',
                  boss: 'Crypt Lord (floor 10)',
                  injury: '45 min',
                  color: 'from-slate-700 to-slate-600',
                },
                {
                  name: 'Ruined Watchtower', tier: 2, baseDC: 15, step: 4,
                  f1dc: 15, f10dc: 51, f20dc: 91,
                  unlock: '5 Tier 1 clears + Level 4',
                  loot: 'Uncommon gear, stone, gold',
                  boss: 'Bandit Captain (floor 10)',
                  injury: '60 min',
                  color: 'from-indigo-800 to-blue-700',
                },
                {
                  name: 'Collapsed Mine', tier: 2, baseDC: 18, step: 4.5,
                  f1dc: 18, f10dc: 59, f20dc: 99,
                  unlock: '8 Tier 1 clears + Level 5',
                  loot: 'Ore, essence, rare gear',
                  boss: 'Mine Colossus (floor 10)',
                  injury: '60 min',
                  color: 'from-indigo-800 to-blue-700',
                },
                {
                  name: 'Bandit Stronghold', tier: 3, baseDC: 22, step: 5.5,
                  f1dc: 22, f10dc: 72, f20dc: 122,
                  unlock: 'GS 45 + Level 11',
                  loot: 'Gold-heavy, unique items',
                  boss: 'Stronghold Warlord (floor 10)',
                  injury: '75 min',
                  color: 'from-violet-800 to-purple-700',
                },
                {
                  name: 'Cursed Catacombs', tier: 3, baseDC: 25, step: 6,
                  f1dc: 25, f10dc: 79, f20dc: 139,
                  unlock: 'GS 50 + Level 12',
                  loot: 'Rare gear, essence, legendary chance',
                  boss: 'Lich Lord (floor 10)',
                  injury: '75 min',
                  color: 'from-violet-800 to-purple-700',
                },
              ].map(d => (
                <div key={d.name} className="mb-4 bg-[#0f0f22] rounded-xl overflow-hidden border border-[rgba(120,110,200,0.12)]">
                  <div className={`h-1 bg-gradient-to-r ${d.color}`} />
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-slate-100 font-bold text-base">{d.name}</h3>
                      <span className="text-[10px] text-[#5050a0] bg-[#14142a] px-1.5 py-0.5 rounded border border-[rgba(120,110,200,0.15)]">
                        Tier {d.tier}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-2">
                      <Row label="Base DC"    value={String(d.baseDC)} />
                      <Row label="DC / floor" value={`+${d.step}`} />
                      <Row label="Floor 1 DC" value={String(d.f1dc)} />
                      <Row label="Floor 10 DC" value={String(d.f10dc)} />
                      <Row label="Floor 20 DC" value={String(d.f20dc)} />
                      <Row label="Injury"     value={d.injury} />
                    </div>
                    <div className="text-[11px] text-[#6060a0] space-y-0.5 pt-2 border-t border-[rgba(120,110,200,0.08)]">
                      <p><span className="text-[#4040a0]">Unlock:</span> <span className="text-[#8080b0]">{d.unlock}</span></p>
                      <p><span className="text-[#4040a0]">Loot:</span> <span className="text-[#8080b0]">{d.loot}</span></p>
                      <p><span className="text-[#4040a0]">Boss:</span> <span className="text-amber-400/80">{d.boss}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Outcomes ── */}
          {section === 'outcomes' && (
            <div>
              <H2>🎲 Run Outcomes</H2>
              <P>Each floor independently determines its outcome based on a d100 roll + Combat Rating vs floor DC.</P>

              {[
                {
                  outcome: 'Critical Success ⚡',
                  color: 'text-amber-400', bg: 'bg-amber-950/20 border-amber-700/30',
                  condition: 'Effective ≥ DC + 81',
                  loot: '3 items (any rarity)',
                  gold: 'Full gold',
                  essence: 'Normal chance',
                  injury: 'None',
                  xp: '×1.5',
                  notes: 'Best possible result. Rare at normal difficulty.',
                },
                {
                  outcome: 'Success ✓',
                  color: 'text-emerald-400', bg: 'bg-emerald-950/20 border-emerald-700/30',
                  condition: 'Effective ≥ DC + 51',
                  loot: '2 items (any rarity)',
                  gold: 'Full gold',
                  essence: 'Normal chance',
                  injury: 'None',
                  xp: '×1.0',
                  notes: 'Standard clear. Aim for this consistently.',
                },
                {
                  outcome: 'Partial Success ◎',
                  color: 'text-blue-400', bg: 'bg-blue-950/20 border-blue-700/30',
                  condition: 'Effective ≥ DC + 31',
                  loot: '1 item (common/uncommon only)',
                  gold: '×0.5 gold',
                  essence: '×0.5 chance',
                  injury: '5% chance',
                  xp: '×0.5',
                  notes: 'Hero struggled but survived.',
                },
                {
                  outcome: 'Failure ✗',
                  color: 'text-red-400', bg: 'bg-red-950/20 border-red-700/30',
                  condition: 'Effective ≥ DC + 16',
                  loot: 'None',
                  gold: 'None',
                  essence: 'None',
                  injury: '30% chance',
                  xp: '×0.25',
                  notes: 'Run ends here. Prior floors\' loot is still kept.',
                },
                {
                  outcome: 'Disaster! 💀',
                  color: 'text-red-500', bg: 'bg-red-950/30 border-red-800/40',
                  condition: 'Effective < DC + 16',
                  loot: 'None',
                  gold: 'None',
                  essence: 'None',
                  injury: '100% chance',
                  xp: '×0.25',
                  notes: 'Worst result. Hero is always injured.',
                },
              ].map(o => (
                <div key={o.outcome} className={`border rounded-xl p-4 mb-3 ${o.bg}`}>
                  <h3 className={`font-bold text-base mb-3 ${o.color}`}>{o.outcome}</h3>
                  <div className="grid grid-cols-2 gap-x-6 text-sm">
                    <Row label="Condition" value={o.condition} />
                    <Row label="Injury"    value={o.injury} />
                    <Row label="Loot"      value={o.loot} />
                    <Row label="XP mult"   value={o.xp} />
                    <Row label="Gold"      value={o.gold} />
                    <Row label="Essence"   value={o.essence} />
                  </div>
                  <p className="text-[#7070a0] text-xs mt-2">{o.notes}</p>
                </div>
              ))}

              <H3>Overall Run Outcome</H3>
              <P>The overall run outcome is determined by the last floor attempted:</P>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="All floors success" value="Success" />
                <Row label="Last floor partial" value="Partial Success" />
                <Row label="Any floor failure"  value="Failure (run stops)" sub="loot from previous floors is kept" />
              </div>
            </div>
          )}

          {/* ── XP ── */}
          {section === 'xp' && (
            <div>
              <H2>⭐ XP & Leveling</H2>

              <H3>XP to Next Level</H3>
              <Box color="purple">
                <p className="text-center font-mono text-violet-200 text-base py-1">
                  XP needed = round(100 × level^1.6)
                </p>
              </Box>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                {[
                  [1, 100], [2, 241], [3, 422], [4, 637], [5, 884],
                  [10, 2512], [15, 5743], [20, 10556], [25, 16763], [29, 24149],
                ].map(([lvl, xp]) => (
                  <Row key={lvl} label={`Level ${lvl} → ${Number(lvl)+1}`} value={`${xp} XP`} />
                ))}
              </div>

              <H3>XP per Run</H3>
              <Box color="emerald">
                <p className="text-center font-mono text-violet-200 text-sm py-1">
                  XP = tier × 60 × floorsCompleted × outcomeMultiplier × (1 + INS × 0.02)
                </p>
              </Box>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="Outcome multipliers" value="" />
                <Row label="  Critical Success" value="×1.5" />
                <Row label="  Success"          value="×1.0" />
                <Row label="  Partial"          value="×0.5" />
                <Row label="  Failure"          value="×0.25" />
              </div>

              <H3>Example: 5 floors in Goblin Warrens (Tier 1)</H3>
              <div className="bg-[#0f0f22] rounded-xl p-4 text-sm text-[#9090b8] space-y-1">
                <p>Base: 1 × 60 × 5 = <span className="text-slate-300">300 XP</span></p>
                <p>Success: 300 × 1.0 = <span className="text-emerald-400">300 XP</span></p>
                <p>With INS 10: 300 × 1.2 = <span className="text-emerald-400">360 XP</span></p>
                <p>Critical Success + INS 10: 300 × 1.5 × 1.2 = <span className="text-amber-400">540 XP</span></p>
              </div>

              <H3>Level Cap & Stat Points</H3>
              <div className="bg-[#0f0f22] rounded-xl p-4">
                <Row label="Max level" value="30" />
                <Row label="Stat points per level" value="1" />
                <Row label="Total stat points at 30" value="29" sub="(level 1 starts with some base stats)" />
              </div>

              <H3>Best XP Strategy</H3>
              <Box color="amber">
                <ol className="space-y-1.5 text-sm text-[#9090b8]">
                  <li>1. Run the <span className="text-amber-300">highest tier dungeon</span> you can reliably succeed at</li>
                  <li>2. Invest in <span className="text-amber-300">INS</span> for multiplied XP early on</li>
                  <li>3. Run <span className="text-amber-300">max 10 floors</span> per expedition for most XP per run</li>
                  <li>4. Failures give only ×0.25 XP — <span className="text-amber-300">avoid overreaching</span></li>
                </ol>
              </Box>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
