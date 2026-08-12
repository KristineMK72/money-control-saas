/**
 * Colonial trivia — short facts Ben (or the town) can surface as popups.
 * The raw list stays easy to edit while COLONIAL_TRIVIA preserves the
 * categorized object shape used by existing dialogue and popup components.
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

export const colonialTrivia = [
  "In Virginia and Maryland, tobacco was legal tender for taxes and debts. A bad harvest could unsettle an entire ledger.",
  "Wampum—shell beads—served as currency between colonists and Native nations. Its value rose and fell with supply.",
  "Paper money in the colonies was often called “bills of credit.” Too many printed, and the whole colony felt the inflation.",
  "Benjamin Franklin argued that a moderate amount of paper currency could stimulate trade—too little starved the economy.",
  "Spanish pieces of eight were the most trusted coin in the colonies. A single piece was often cut into eight “bits.”",
  "A “bit” was worth 12½ cents. Two bits made a quarter—language that still lives in American speech.",
  "Colonial governments sometimes paid soldiers and suppliers in land grants instead of hard cash.",
  "In Massachusetts, pine-tree shillings were minted in the 1650s—one of the first coins struck in English America.",
  "Many shopkeepers kept accounts in pounds, shillings, and pence even when the coins in the till were Spanish or Portuguese.",
  "Barter never fully disappeared. A farmer might settle a debt with a side of bacon, a cord of wood, or a day’s labor.",
  "Counterfeit bills were so common that some colonies printed intricate designs and warnings: “To counterfeit is death.”",
  "The Continental Congress issued so much paper money during the Revolution that “not worth a Continental” became a common insult.",
  "Interest rates in the colonies often ran 6 to 8 percent—higher than in England—because capital was scarce.",
  "A skilled artisan’s daily wage might be two or three shillings; a laborer’s closer to one.",
  "Lotteries were a respectable way for colonies and churches to raise money for bridges, schools, and roads.",
  "In some towns, tavern keepers acted as informal bankers, holding deposits and extending small credit.",
  "The Navigation Acts required many colonial goods to be shipped only on English vessels—raising the cost of trade.",
  "Indigo, rice, and tobacco were the great cash crops of the South; their prices could make or break a planter’s year.",
  "Franklin’s Poor Richard’s Almanack repeatedly warned: “A penny saved is a penny earned.”",
  "When hard money was scarce, some colonies accepted country produce at fixed rates for tax payments.",
  "A piece of eight weighed roughly one ounce of silver—making it a convenient international standard.",
  "Colonial merchants kept two sets of books: one in local currency, another in sterling for dealings with London.",
  "The first American paper money was issued by Massachusetts in 1690 to pay soldiers returning from a campaign.",
  "Debts could follow a family for generations; insolvency sometimes meant the loss of tools, livestock, even the family Bible.",
  "Franklin believed that time was the true currency: “Do you love life? Then do not squander time, for that is the stuff life is made of.”",
  "In Pennsylvania, the colony once paid bounties in land for wolf scalps and squirrel heads.",
  "A good riding horse could cost as much as a small house in some frontier counties.",
  "Apprentices often received only room, board, and a suit of clothes at the end of their term—no cash wages.",
  "Women in port cities sometimes ran shops and kept ledgers while their husbands were at sea.",
  "The phrase “mind your business” appeared on early American cent coins—Franklin’s idea.",
  "In New England, fish and timber were as good as cash in many foreign ports.",
  "A barrel of rum could buy more goodwill (and information) than a purse of silver in some trading posts.",
  "Colonial post riders were sometimes paid by the mile—and expected to carry private letters for extra fees.",
  "Franklin helped create the first American fire insurance company; neighbors literally shared the risk.",
  "A pair of good shoes might cost a week’s wages for a common laborer.",
  "In the Carolinas, rice planters measured wealth in both acres and enslaved laborers.",
  "Some colonies taxed bachelors and luxuries like silver shoe buckles.",
  "The Boston Tea Party was as much about taxes and monopolies as it was about tea.",
  "Quakers in Pennsylvania often refused to take oaths, complicating court debts and contracts.",
  "A “joiner” (carpenter) who owned his own tools was considered a man of substance.",
  "Winter ice from New England was shipped as far as the Caribbean and sold as a luxury.",
  "Franklin’s kite experiment cost almost nothing—just a silk handkerchief, a key, and curiosity.",
  "In many towns the church bell also served as the public clock and alarm.",
  "A bushel of wheat could settle a doctor’s bill or a schoolmaster’s salary.",
  "Colonial almanacs mixed weather predictions with interest tables and moral advice.",
  "The first American banknotes sometimes carried the motto “Mind Your Business.”",
  "Privateers during wartime could turn a modest ship into a floating fortune—or a total loss.",
  "In Virginia, the House of Burgesses once paid its members in tobacco.",
  "A good feather bed was a major household asset, often listed in wills.",
  "Franklin printed money for several colonies and understood both its power and its dangers.",
  "Some frontier stores kept a running tab that might not be settled for years.",
  "The cost of shipping a letter by post could exceed the value of the paper it was written on.",
  "Indentured servants traded years of labor for passage across the Atlantic.",
  "A set of carpenter’s tools could be worth more than the cabin they built.",
  "In Philadelphia, Franklin’s library company let members borrow books for a modest subscription.",
  "Whale oil lit the lamps of the wealthy; tallow candles served everyone else.",
  "Colonial governments sometimes issued “loan office” bills backed by land mortgages.",
  "A single successful voyage to the West Indies could make a merchant’s reputation—and fortune.",
  "Children as young as seven might be bound out to learn a trade and earn their keep.",
  "The phrase “paying through the nose” may trace back to harsh tax punishments in earlier centuries.",
  "In some colonies, tobacco notes (receipts for deposited tobacco) circulated as money.",
  "Franklin advised young tradesmen to keep exact accounts—or risk ruin.",
  "A well-made spinning wheel was both a tool and a status symbol for a household.",
  "Military land bounties after wars created whole new waves of westward settlement.",
  "The first American lottery to fund a college helped establish Yale.",
  "Salt was so valuable that it was sometimes called “white gold” on the frontier.",
  "A colonial printer’s most profitable work was often government contracts and almanacs.",
  "In New York, beaver pelts had once been the primary medium of exchange.",
  "Franklin’s Junto club discussed both moral improvement and practical schemes for making money.",
  "A good umbrella was a rare and somewhat flashy possession in the mid-1700s.",
  "Some colonies banned the export of raw hides to protect local tanners.",
  "The cost of a transatlantic passage could be paid by selling oneself into temporary servitude.",
  "In the backcountry, a rifle was both a hunting tool and a form of stored wealth.",
  "Colonial courts sometimes ordered debtors to wear special badges or sit in the stocks.",
  "Franklin’s famous “early to bed…” proverb was as much about productivity as health.",
  "A hogshead of tobacco weighed roughly a thousand pounds and was a standard unit of trade.",
  "Many colonial women managed complex household economies that included dairying, poultry, and textiles.",
  "The first American silver dollar designs still lay decades in the future; colonists used foreign coin.",
  "A successful blacksmith could name his price when tools and horseshoes were scarce.",
  "Wartime inflation made some fortunes and destroyed others overnight.",
  "Franklin once published a satirical plan for a paper currency backed by land.",
  "In port cities, captains and merchants settled accounts over Madeira wine.",
  "A set of surveying instruments could open the door to land speculation wealth.",
  "Colonial children learned arithmetic with problems about hogsheads, barrels, and interest.",
  "The Crown tried to ban colonial paper money—colonists largely ignored the ban.",
  "A good clock was a luxury item that advertised both wealth and punctuality.",
  "Some taverns kept a slate behind the bar listing who owed for drinks.",
  "Franklin believed a good reputation was the most valuable capital a tradesman could hold.",
  "In the Chesapeake, the price of tobacco in London could dictate whether a planter expanded or retrenched.",
  "A pair of imported silk stockings marked a person of fashion—and disposable income.",
  "Colonial fire companies were often mutual-aid societies that also socialized and networked.",
  "The first American commercial banks did not appear until after the Revolution.",
  "A well-stocked apothecary shop was both a medical resource and a profitable business.",
  "Franklin’s own rise from runaway apprentice to prosperous printer was a living advertisement for thrift and industry.",
  "On the frontier, a kettle or an axe might be borrowed, lent, or traded more readily than coin.",
  "Some colonies paid bounties for flax and hemp to encourage domestic textile production.",
  "The phrase “to coin money” originally carried a stronger sense of creating value from almost nothing.",
  "A colonial merchant’s credit network often stretched from Boston to Barbados to London.",
  "Franklin’s last public act included a petition against slavery—linking moral and economic questions.",
  "In the end, the most reliable colonial currency was reputation: keep your word and the ledger stayed balanced.",
] as const;

const MONEY_TERMS = /money|currency|coin|cash|credit|debt|ledger|account|bank|bill|tax|wage|price|interest|wealth|fortune|payment|tobacco|wampum|shilling|pence|dollar|silver|barter|trade|merchant|inflation|mortgage|lotter|bount|cost|paid|paying|profit|financial|capital/i;
const TOWN_TERMS = /town|tavern|church|shop|artisan|carpenter|blacksmith|apothecary|post rider|fire compan|household|schoolmaster|colonial women|port cities/i;
const CURIOUS_TERMS = /kite|umbrella|clock|feather bed|spinning wheel|shoes|stockings|rum|ice from New England|wolf scalps|squirrel heads/i;
const PROVERB_TERMS = /penny saved|do you love life|mind your business|early to bed|paying through the nose|to coin money/i;

function triviaCategory(text: string): ColonialTrivia["category"] {
  if (PROVERB_TERMS.test(text)) return "proverb";
  if (/Franklin|Poor Richard/i.test(text)) return "franklin";
  if (MONEY_TERMS.test(text)) return "money";
  if (TOWN_TERMS.test(text)) return "town";
  if (CURIOUS_TERMS.test(text)) return "curious";
  return "history";
}

const STABLE_IDS: Partial<Record<number, string>> = {
  18: "franklin-penny",
  61: "proverb-diligence",
  74: "franklin-early",
};

export const COLONIAL_TRIVIA: ColonialTrivia[] = colonialTrivia.map((text, index) => {
  const category = triviaCategory(text);
  return {
    id: STABLE_IDS[index] ?? `colonial-${String(index + 1).padStart(3, "0")}`,
    category,
    text,
    tag: category === "franklin" || category === "proverb" ? "Poor Richard" : "Colonial Ledger",
  };
});

/** Pick a random trivia item, optionally filtered by category. */
export function randomTrivia(category?: ColonialTrivia["category"]): ColonialTrivia {
  const pool = category
    ? COLONIAL_TRIVIA.filter((trivia) => trivia.category === category)
    : COLONIAL_TRIVIA;
  const list = pool.length ? pool : COLONIAL_TRIVIA;
  return list[Math.floor(Math.random() * list.length)]!;
}

/** Pick N unique trivia items. */
export function pickTrivia(count: number, category?: ColonialTrivia["category"]): ColonialTrivia[] {
  const pool = category
    ? COLONIAL_TRIVIA.filter((trivia) => trivia.category === category)
    : [...COLONIAL_TRIVIA];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
