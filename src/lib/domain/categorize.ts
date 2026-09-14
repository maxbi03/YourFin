import type { Rule } from "./types";

/** Normalise un libellé pour la comparaison : minuscules, sans accents, espaces réduits. */
export function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9&+.' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Dictionnaire de mots-clés -> catégorie système, orienté commerces et services suisses.
 * L'ordre compte : la première correspondance gagne. Les entrées les plus spécifiques sont en tête.
 */
const KEYWORDS: Array<[string, string[]]> = [
  ["salary", ["salaire", "salary", "lohn", "gehalt", "stipendio", "payroll", "traitement mensuel"]],
  ["refund", ["remboursement", "rembours", "ruckerstattung", "rimborso", "refund", "retrocession"]],
  ["taxes", ["impot", "impots", "steuer", "steuern", "administration fiscale", "afc ", "intendance des impots", "imposta", "tasse "]],
  ["savings", ["viac", "finpension", "frankly", "truewealth", "true wealth", "selma", "swissquote", "pilier 3a", "saule 3a", "3a ", "epargne", "sparkonto", "sparen", "invest", "etf", "degiro", "interactive brokers", "ibkr", "neon invest", "yuh invest"]],
  ["housing", ["loyer", "miete", "affitto", "gerance", "regie", "wincasa", "livit", "privera", "apleona", "romande energie", "groupe e", "sig ", "ewz", "bkw", "services industriels", "hypotheque", "hypothek", "nebenkosten", "charges locatives", "iwb", "ewb", "primeo", "alpiq", "eau ", "gaz ", "chauffage", "homegate", "immoscout"]],
  ["health", ["assura", "css ", "css versicherung", "helsana", "swica", "sanitas", "groupe mutuel", "concordia", "kpt", "visana", "atupri", "sympany", "okk", "assurance", "versicherung", "assicurazione", "axa", "allianz", "zurich vers", "mobiliar", "mobiliere", "baloise", "generali", "vaudoise", "helvetia", "smile.direct", "pharmacie", "apotheke", "farmacia", "sunstore", "amavita", "benu", "coop vitality", "medbase", "hopital", "spital", "chuv", "hug ", "dentiste", "zahnarzt", "docteur", "dr. ", "dr ", "clinique", "physio", "opticien", "fielmann", "visilab", "mcoptic"]],
  ["groceries", ["migros", "coop ", "coop-", "denner", "aldi", "lidl", "volg", "spar ", "landi", "alnatura", "manor food", "globus delicatessa", "migrolino", "coop pronto", "avec ", "lecker", "boucherie", "boulangerie", "backerei", "metzgerei", "epicerie", "marche ", "farmy", "coop.ch", "migros online"]],
  ["subscriptions", ["swisscom", "sunrise", "salt", "yallo", "wingo", "upc", "quickline", "init7", "netflix", "spotify", "disney", "apple.com/bill", "apple music", "icloud", "google one", "youtube", "amazon prime", "canal+", "canal plus", "dazn", "sky ", "playstation", "xbox", "nintendo", "adobe", "microsoft 365", "office 365", "chatgpt", "openai", "dropbox", "serafe", "billag", "abonnement", "abo ", "notion", "github", "twint abo"]],
  ["transport", ["sbb", "cff", "ffs", "tpg", "tl ", "vbz", "bvb", "bernmobil", "tpf", "transn", "postauto", "carpostal", "mobility", "uber ", "bolt", "taxi", "migrol", "shell", "bp ", "avia", "socar", "tamoil", "agrola", "parking", "parkhaus", "park ", "vignette", "tcs", "publibike", "velospot", "garage", "pneu", "carrosserie", "ofrou", "amende", "police "]],
  ["restaurants", ["restaurant", "mcdonald", "burger king", "kfc", "starbucks", "cafe", "bar ", "pizzeria", "pizza", "kebab", "subway", "takeaway", "take away", "uber eats", "smood", "just eat", "eat.ch", "tibits", "holy cow", "hitzberger", "sushi", "brasserie", "bistro", "pub ", "tea room", "tearoom", "boulangerie cafe", "gelateria", "grill", "burger", "resto", "bistrot", "auberge", "brunch"]],
  ["shopping", ["galaxus", "digitec", "zalando", "amazon", "h&m", "h & m", "zara", "uniqlo", "manor", "globus", "ikea", "jumbo", "hornbach", "bauhaus", "obi ", "interdiscount", "fust", "mediamarkt", "media markt", "brack", "microspot", "ochsner", "decathlon", "dosenbach", "c&a", "apple store", "aliexpress", "temu", "shein", "ricardo", "tutti", "conforama", "pfister", "micasa", "depot", "mammut", "nike", "adidas", "sephora", "douglas", "marionnaud", "fnac", "boutique", "pharmaplus"]],
  ["leisure", ["cinema", "pathe", "kitag", "arena", "theatre", "musee", "museum", "concert", "ticketcorner", "ticketmaster", "fitness", "gym", "activ fitness", "basefit", "nonstop gym", "holmes place", "piscine", "ski ", "magic pass", "bowling", "steam", "twitch", "epic games", "escape", "zoo", "aquatis", "europapark", "europa park", "festival", "club ", "spa ", "wellness", "bains", "patinoire", "laser", "karting", "golf", "tennis"]],
  ["travel", ["easyjet", "swiss international", "swiss.com", "lufthansa", "booking.com", "booking", "airbnb", "hotel", "expedia", "tripadvisor", "ryanair", "trainline", "sncf", "db bahn", "deutsche bahn", "trenitalia", "flixbus", "hostel", "auberge de jeunesse", "youth hostel", "aeroport", "airport", "vueling", "klm", "air france", "tui ", "hotelplan", "kuoni", "ebookers", "wizz", "rentalcars", "europcar", "hertz", "sixt"]],
  ["education", ["universite", "uni ", "epfl", "eth ", "hes-so", "ecole", "schule", "cours ", "udemy", "coursera", "formation", "payot", "orell fussli", "ex libris", "librairie", "buchhandlung", "duolingo", "skillshare", "masterclass", "creche", "garderie", "kita"]],
  ["kids", ["creche", "garderie", "kita", "babyland", "chicco", "smyths", "franz carl weber", "pampers", "cantine"]],
  ["gifts", ["cadeau", "geschenk", "don ", "spende", "wwf", "croix-rouge", "caritas", "chaine du bonheur", "unicef", "msf", "medecins sans frontieres", "amnesty", "greenpeace", "fleurop", "fleurs", "interflora"]],
  ["fees", ["frais", "gebuhr", "gebuehr", "commission", "spesen", "taxe carte", "cotisation carte", "jahresgebuhr", "interets debiteurs", "frais de tenue"]],
  ["cash", ["bancomat", "atm", "retrait", "bezug", "withdrawal", "prelievo", "cash "]],
];

/**
 * Index de recherche. Les mots-clés courts (≤ 4 lettres) ou terminés par un espace ("bp ", "sig ")
 * sont comparés en mot entier pour éviter les faux positifs (« etf » dans « netflix »).
 */
const KEYWORD_INDEX: Array<{ categoryId: string; needle: string }> = KEYWORDS.flatMap(([categoryId, needles]) =>
  needles.map((needle) => {
    const clean = normalizeLabel(needle);
    const wholeWord = needle.endsWith(" ") || clean.length <= 4;
    return { categoryId, needle: wholeWord ? ` ${clean} ` : clean };
  }),
);

/**
 * Suggère une catégorie pour un libellé.
 * 1. Règles apprises (créées quand l'utilisateur corrige une catégorie) — priorité.
 * 2. Dictionnaire de mots-clés.
 */
export function suggestCategory(payee: string, rules: Rule[] = []): string | undefined {
  const label = ` ${normalizeLabel(payee)} `;
  if (!label.trim()) return undefined;
  // Règles apprises : la plus longue (la plus spécifique) gagne.
  const learned = rules
    .filter((r) => r.pattern && label.includes(r.pattern))
    .sort((a, b) => b.pattern.length - a.pattern.length)[0];
  if (learned) return learned.categoryId;
  for (const { categoryId, needle } of KEYWORD_INDEX) {
    if (label.includes(needle)) return categoryId;
  }
  return undefined;
}

/** Motif de règle à mémoriser à partir d'un libellé : les 2-3 premiers mots significatifs. */
export function rulePatternFor(payee: string): string {
  const words = normalizeLabel(payee)
    .replace(/\b\d{2,}[\d.:/-]*\b/g, " ") // enlève dates, numéros de carte, montants
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1);
  return words.slice(0, 3).join(" ");
}
