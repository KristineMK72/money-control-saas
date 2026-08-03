/**
 * Colonial trivia — short facts Ben (or the town) can surface as popups.
 * Mix of Franklin, colonial life, early American finance, and light proverbs.
 */

export interface ColonialTrivia {
  id: string;
  /** Short category for filtering / badges */
  category: "franklin" | "money" | "town" | "proverb" | "history" | "curious";
  /** One-liner or two shown in the popup */
  text: string;
  /** Optional source / era tag */
  tag?: string;
}

export const COLONIAL_TRIVIA: ColonialTrivia[] = [
  {
    id: "franklin-penny",
    category: "franklin",
    text: "Franklin once wrote: “A penny saved is a penny earned.” He meant it — he tracked household expenses in ledgers much like thine.",
    tag: "Poor Richard",
  },
  {
    id: "franklin-early",
    category: "franklin",
    text: "“Early to bed and early to rise makes a man healthy, wealthy, and wise.” Franklin published this in Poor Richard’s Almanack in 1735.",
    tag: "1735",
  },
  {
    id: "franklin-library",
    category: "franklin",
    text: "Franklin founded the Library Company of Philadelphia in 1731 — one of America’s first subscription libraries. Knowledge, he held, was a public good.",
    tag: "Philadelphia",
  },
  {
    id: "franklin-fire",
    category: "franklin",
    text: "After a devastating fire, Franklin helped organize the Union Fire Company in 1736 — an early mutual-aid society. Shared risk, shared safety.",
    tag: "1736",
  },
  {
    id: "franklin-lightning",
    category: "franklin",
    text: "The kite experiment of 1752 made Franklin famous, but he also invented the lightning rod — practical science in service of ordinary households.",
    tag: "1752",
  },
  {
    id: "money-pieces-of-eight",
    category: "money",
    text: "Colonial merchants often counted in Spanish pieces of eight. A “bit” was one-eighth of a dollar — hence “two bits” for a quarter.",
    tag: "Currency",
  },
  {
    id: "money-wampum",
    category: "money",
    text: "In some colonies, wampum (shell beads) served as currency alongside coin. Value depended on color, craft, and local agreement.",
    tag: "Trade",
  },
  {
    id: "money-tobacco",
    category: "money",
    text: "In Virginia and Maryland, tobacco was legal tender for taxes and debts. A bad harvest could unsettle an entire ledger.",
    tag: "Virginia",
  },
  {
    id: "money-continentals",
    category: "money",
    text: "During the Revolution, Congress issued “Continentals.” Over-printing led to the phrase “not worth a Continental.” Inflation is an old foe.",
    tag: "Revolution",
  },
  {
    id: "money-interest",
    category: "money",
    text: "Colonial lenders charged interest, though usury laws capped rates in many places. Compound interest was already known as a quiet engine of wealth.",
    tag: "Lending",
  },
  {
    id: "town-crier",
    category: "town",
    text: "The town crier rang a bell and cried “Oyez!” (from Old French, “hear ye”) to announce news, lost goods, and public auctions.",
    tag: "Custom",
  },
  {
    id: "town-market",
    category: "town",
    text: "Market days concentrated trade in the square. Fresh goods, gossip, and the settling of small debts all happened under the same sky.",
    tag: "Commerce",
  },
  {
    id: "town-tavern",
    category: "town",
    text: "Taverns doubled as courtrooms, post offices, and political halls. Many a subscription and partnership began over a shared table.",
    tag: "Society",
  },
  {
    id: "town-church-bell",
    category: "town",
    text: "Church bells marked time, alarm, and celebration. A ringing for debt paid down would have been unusual — but not unwelcome in spirit.",
    tag: "Custom",
  },
  {
    id: "proverb-leak",
    category: "proverb",
    text: "“Beware of little expenses; a small leak will sink a great ship.” — Poor Richard. Idle subscriptions are such leaks.",
    tag: "Poor Richard",
  },
  {
    id: "proverb-diligence",
    category: "proverb",
    text: "“Diligence is the mother of good luck.” Franklin preferred preparation over waiting on fortune.",
    tag: "Poor Richard",
  },
  {
    id: "proverb-excuses",
    category: "proverb",
    text: "“He that is good for making excuses is seldom good for anything else.” A stern note from Poor Richard on delayed bills.",
    tag: "Poor Richard",
  },
  {
    id: "proverb-time",
    category: "proverb",
    text: "“Time is money.” Franklin used the phrase in his 1748 essay Advice to a Young Tradesman — still sharp today.",
    tag: "1748",
  },
  {
    id: "proverb-guest",
    category: "proverb",
    text: "“Guests, like fish, begin to smell after three days.” Franklin on hospitality — and perhaps on lingering debts.",
    tag: "Poor Richard",
  },
  {
    id: "history-almanack",
    category: "history",
    text: "Poor Richard’s Almanack sold roughly 10,000 copies a year at its peak — a colonial bestseller of weather, proverbs, and practical advice.",
    tag: "Print",
  },
  {
    id: "history-post",
    category: "history",
    text: "Franklin served as deputy postmaster and improved colonial mail routes. Faster letters meant faster commerce and news.",
    tag: "Post Office",
  },
  {
    id: "history-bank-of-na",
    category: "history",
    text: "The Bank of North America (1781) was the first commercial bank chartered in the United States — a step toward modern ledgers and credit.",
    tag: "1781",
  },
  {
    id: "history-dollar",
    category: "history",
    text: "The word “dollar” comes from the German thaler. Spanish dollars (pieces of eight) were so common that the U.S. dollar was sized to match them.",
    tag: "Etymology",
  },
  {
    id: "curious-swim",
    category: "curious",
    text: "Franklin was an avid swimmer and invented swim fins for the hands. He believed exercise sharpened both body and accounts.",
    tag: "Franklin",
  },
  {
    id: "curious-glass",
    category: "curious",
    text: "The glass armonica, another Franklin invention, used spinning glass bowls to make music. Mozart and Beethoven later wrote for it.",
    tag: "Invention",
  },
  {
    id: "curious-daylight",
    category: "curious",
    text: "Franklin joked about saving candles by waking with the sun — an early quip often linked (a bit loosely) to daylight saving ideas.",
    tag: "Essay",
  },
  {
    id: "curious-maps",
    category: "curious",
    text: "Franklin’s 1754 “Join, or Die” snake cartoon is among the first political cartoons in America — unity as survival.",
    tag: "1754",
  },
  {
    id: "money-ledger",
    category: "money",
    text: "Double-entry bookkeeping reached the English-speaking world long before independence. Debits and credits kept merchant houses honest — or exposed.",
    tag: "Accounting",
  },
  {
    id: "town-reputation",
    category: "town",
    text: "In a small colony, reputation traveled faster than post. Paying debts promptly was both virtue and practical armor.",
    tag: "Society",
  },
  {
    id: "franklin-virtues",
    category: "franklin",
    text: "Franklin tracked thirteen virtues in a daily chart — temperance, order, frugality among them. He treated character like a ledger to balance.",
    tag: "Autobiography",
  },
];

/** Pick a random trivia item, optionally filtered by category. */
export function randomTrivia(category?: ColonialTrivia["category"]): ColonialTrivia {
  const pool = category
    ? COLONIAL_TRIVIA.filter((t) => t.category === category)
    : COLONIAL_TRIVIA;
  const list = pool.length ? pool : COLONIAL_TRIVIA;
  return list[Math.floor(Math.random() * list.length)]!;
}

/** Pick N unique trivia items. */
export function pickTrivia(count: number, category?: ColonialTrivia["category"]): ColonialTrivia[] {
  const pool = category
    ? COLONIAL_TRIVIA.filter((t) => t.category === category)
    : [...COLONIAL_TRIVIA];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
