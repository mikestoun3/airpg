const BANNED_WORDS = [
  // Russian mat
  'хуй','хуе','хуя','хую','хуев','хуйн','хуйня','пизд','пизда','пиздец','пиздеж',
  'пиздат','пиздит','пиздобол','пиздюк','ёбан','ебан','еблан','ебло','ебать','ебут',
  'ебёт','ебет','ёбнут','ебнут','нахуй','нахер','сука','суки','сукин','блядь','блять',
  'блядск','шлюха','шлюх','залупа','залуп','мудак','мудил','мудоз','пидор','пидар',
  'пидрил','педик','педор','гандон','гандош','ублюдок','ублюдк','долбоёб','долбоеб',
  'долбан','ёбаный','ёбарь','выёбыв','выебыв','проёб','проеб','уёбищ','уебищ',
  'уёбок','уебок','уёбан','уебан','ёбнутый','ёбнут','манда','мандав','пиздюк',
  'шалава','шалав','дрочит','дрочер','дрочун','дрочил','залупин','залупен',
  'конч','кончит','кончил','спермот','cперм','очков','очкун',
  // English
  'fuck','fuk','fck','shit','shyt','cunt','cock','dick','ass','arse','bitch',
  'nigger','nigga','faggot','fag','whore','slut','pussy','prick','bastard',
  'retard','moron','twat','wank','spunk','cum','porn','sex',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some(word => lower.includes(word));
}

export function validateNickname(name: string): { ok: boolean; error?: string } {
  if (!name || name.trim().length === 0) return { ok: false, error: 'Никнейм не может быть пустым' };
  const trimmed = name.trim();
  if (trimmed.length < 3) return { ok: false, error: 'Минимум 3 символа' };
  if (trimmed.length > 13) return { ok: false, error: 'Максимум 13 символов' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { ok: false, error: 'Только латиница, цифры и _' };
  if (/^_+$/.test(trimmed)) return { ok: false, error: 'Нельзя использовать только нижние подчёркивания' };
  if (containsProfanity(trimmed)) return { ok: false, error: 'Никнейм содержит запрещённые слова' };
  return { ok: true };
}
