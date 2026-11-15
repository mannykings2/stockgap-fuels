/**
 * Corporate website content.
 *
 * Company facts below are drawn from publicly available sources, listed in
 * SOURCES and cited where they appear. Figures reported by third parties are
 * labelled as reported. Operational records inside the portal are sample data
 * and are never presented as company disclosures.
 */

export interface Source {
  id: string;
  publication: string;
  title: string;
  date: string;
  url: string;
}

export const SOURCES: Source[] = [
  {
    id: "stockgap-site",
    publication: "Stockgap Fuels Limited",
    title: "Company website",
    date: "Accessed 2026",
    url: "https://stockgapfuels.com/",
  },
  {
    id: "businessday-2019",
    publication: "BusinessDay",
    title: "NLNG commissions Stockgap's LPG distribution point in PH for S/South",
    date: "10 November 2019",
    url: "https://businessday.ng/energy/oilandgas/article/nlng-commissions-stockgaps-lpg-distribution-point-in-ph-for-s-south",
  },
  {
    id: "nlng-facts",
    publication: "Nigeria LNG Limited",
    title: "Facts and Figures (2019 expansion to Stockgap Terminal, Port Harcourt)",
    date: "2026 edition",
    url: "https://www.nlng.com/documents/2024_NLNG_FACTS_FIGURESB_compressed.pdf",
  },
  {
    id: "independent-2022",
    publication: "Independent Newspaper Nigeria",
    title: "StockGap Fuels embarks on major upgrade of LPG facilities",
    date: "11 October 2022",
    url: "https://independent.ng/stockgap-fuels-embarks-on-major-upgrade-of-lpg-facilities/",
  },
  {
    id: "kristina-2022",
    publication: "Kristina Reports",
    title: "StockGap Fuels embarks on major upgrade of LPG facilities",
    date: "28 September 2022",
    url: "https://www.kristinareports.com/stockgap-fuels-embarks-on-major-upgrade-of-lpg-facilities",
  },
  {
    id: "kiakia",
    publication: "KiakiaGas",
    title: "Overview of Nigeria's LPG downstream sector",
    date: "24 November 2022",
    url: "https://kiakiagas.com/blog/product/overview-nigeria%E2%80%99s-lpg-down-stream-sector",
  },
  {
    id: "nig-lpgas",
    publication: "NIG LP Gas",
    title: "List of LPG depots and terminals in Nigeria",
    date: "Directory listing",
    url: "https://www.niglpgas.com/Blogdetails.aspx?BlogId=40",
  },
];

export const COMPANY = {
  name: "Stockgap Fuels Limited",
  shortName: "Stockgap",
  tagline: "Downstream energy infrastructure from Port Harcourt.",
  address: "Eagle Cement Road, Rumuolumeni, Port Harcourt, Rivers State, Nigeria",
  phone: "+234 (84) 700 149",
  focus: "Trading, storage and distribution of refined petroleum products and LPG",
};

export interface Fact {
  value: string;
  label: string;
  detail: string;
  sourceIds: string[];
}

export const FACTS: Fact[] = [
  {
    value: "8,000 – 15,000 MT",
    label: "Reported LPG storage capacity",
    detail:
      "Reports conflict: the terminal is listed at 8,000 MT around commissioning (2019), while 2022 reporting cites 15,000 MT with expansion planned. Both are third-party figures; no current capacity is asserted.",
    sourceIds: ["nig-lpgas", "kiakia", "independent-2022", "kristina-2022"],
  },
  {
    value: "2019",
    label: "First direct NLNG cargo",
    detail: "Commissioned in November 2019 when NLNG delivered its first DLPG cargo to Port Harcourt.",
    sourceIds: ["businessday-2019", "nlng-facts"],
  },
  {
    value: "3 product lines",
    label: "White products traded",
    detail: "Petrol (PMS), automotive gas oil (AGO) and dual purpose kerosene (DPK), alongside LPG.",
    sourceIds: ["stockgap-site"],
  },
  {
    value: "South-South",
    label: "Direct NLNG LPG offtake",
    detail: "Reported in 2022 as the only terminal in the region able to receive LPG directly from NLNG.",
    sourceIds: ["independent-2022"],
  },
];

export const TIMELINE = [
  {
    year: "2019",
    title: "Port Harcourt terminal commissioned",
    body: "NLNG commissioned Stockgap's LPG distribution point at Rumuolumeni, delivering the first direct DLPG cargo to Port Harcourt and removing the need to truck product back from Lagos.",
    sourceIds: ["businessday-2019", "nlng-facts"],
  },
  {
    year: "2022",
    title: "Reported storage expansion",
    body: "The terminal manager disclosed a programme to expand storage by 50 per cent by 2023 and to double capacity by 2024; stakeholders described the facility as one of the largest LPG storage sites in the country at 15,000 MT.",
    sourceIds: ["independent-2022", "kristina-2022"],
  },
  {
    year: "Today",
    title: "A distribution platform, not just a tank farm",
    body: "Storage, cylinder filling and channel supply are run as one chain, which is what this platform was built to coordinate: demand, stock, production, movement and settlement.",
    sourceIds: ["stockgap-site"],
  },
];

export interface ProductFamily {
  id: string;
  name: string;
  summary: string;
  description: string;
  specs: { label: string; value: string }[];
  uses: string[];
}

export const PRODUCT_FAMILIES: ProductFamily[] = [
  {
    id: "lpg-bulk",
    name: "Liquefied petroleum gas",
    summary: "Bulk LPG for bottling plants, industrial users and marketers.",
    description:
      "Bulk LPG is stored at the Port Harcourt terminal and lifted by road for onward distribution. Terminal handling, tanker scheduling and documentation are coordinated by the operations team.",
    specs: [
      { label: "Product", value: "LPG (butane-rich cooking gas)" },
      { label: "Supply route", value: "Direct offtake from NLNG, plus coastal lifting" },
      { label: "Handling", value: "Pressurised storage, road tanker loading" },
      { label: "Commercial unit", value: "Metric tonne (MT)" },
    ],
    uses: ["Cylinder filling plants", "Industrial heat and process fuel", "Marketer and reseller supply"],
  },
  {
    id: "cylinders",
    name: "LPG cylinders",
    summary: "Filled and empty cylinders for households and retail channels.",
    description:
      "Cylinders move through filling, inspection and release before they reach a retail point. Each batch carries a quality record so a failed shell never returns to a customer.",
    specs: [
      { label: "Pack sizes", value: "12.5 kg and 50 kg cylinders" },
      { label: "Condition", value: "Filled, or empty shell for refill" },
      { label: "Assurance", value: "Batch inspection before release" },
      { label: "Commercial unit", value: "Unit (cylinder)" },
    ],
    uses: ["Household cooking", "Small business and food service", "Retail and distributor channels"],
  },
  {
    id: "pms",
    name: "Premium motor spirit (PMS)",
    summary: "Petrol for retail outlets and commercial resellers.",
    description:
      "PMS is traded and stored for channel supply. Orders are allocated against confirmed stock before dispatch so a commitment is never made against product that is not there.",
    specs: [
      { label: "Product", value: "Premium motor spirit" },
      { label: "Storage", value: "Terminal tankage, Port Harcourt" },
      { label: "Distribution", value: "Bridging by road tanker" },
      { label: "Commercial unit", value: "Litre (L)" },
    ],
    uses: ["Retail station supply", "Commercial fleet fuelling", "Reseller volume contracts"],
  },
  {
    id: "ago",
    name: "Automotive gas oil (AGO)",
    summary: "Diesel for logistics, industry and power generation.",
    description:
      "AGO serves generators, haulage and industrial plants. Deliveries are scheduled against the customer's operating pattern rather than a fixed calendar.",
    specs: [
      { label: "Product", value: "Automotive gas oil (diesel)" },
      { label: "Storage", value: "Terminal and depot tankage" },
      { label: "Distribution", value: "Road tanker, bulk delivery" },
      { label: "Commercial unit", value: "Litre (L)" },
    ],
    uses: ["Standby and prime power generation", "Haulage and fleet operations", "Industrial and construction plant"],
  },
  {
    id: "dpk",
    name: "Dual purpose kerosene (DPK)",
    summary: "Kerosene for household and small commercial use.",
    description:
      "DPK is handled as a white product through terminal storage and road bridging, with the same allocation discipline as the rest of the petroleum range.",
    specs: [
      { label: "Product", value: "Dual purpose kerosene" },
      { label: "Storage", value: "White product tankage" },
      { label: "Distribution", value: "Road tanker and drummed supply" },
      { label: "Commercial unit", value: "Litre (L)" },
    ],
    uses: ["Household fuel", "Small commercial burners", "Reseller supply"],
  },
];

export interface Service {
  title: string;
  body: string;
  points: string[];
}

export const SERVICES: Service[] = [
  {
    title: "Terminal storage & throughput",
    body: "Pressurised LPG storage and white product tankage at Port Harcourt, with loading coordination for road tankers.",
    points: ["Bulk LPG storage", "White product tankage", "Tanker loading windows"],
  },
  {
    title: "Bulk LPG distribution",
    body: "Supply to bottling plants, industrial consumers and marketers across the South-South and beyond.",
    points: ["Direct NLNG offtake", "Scheduled bulk lifts", "Marketer supply programmes"],
  },
  {
    title: "Cylinder filling & release",
    body: "Filling against inspected shells, batch quality checks and controlled release into the channel.",
    points: ["12.5 kg and 50 kg packs", "Batch inspection records", "Fill-weight discipline"],
  },
  {
    title: "Petroleum product supply",
    body: "PMS, AGO and DPK supply for retail networks, industry and commercial resellers.",
    points: ["Allocation before dispatch", "Road bridging", "Volume contracts"],
  },
  {
    title: "Channel & distributor support",
    body: "Order management for distributors, retailers and institutional buyers, with visibility from order to delivery.",
    points: ["Order and approval workflow", "Delivery confirmation", "Invoicing and settlement"],
  },
  {
    title: "Safety and compliance",
    body: "Incident reporting, corrective action tracking and inspection records held against the operating site.",
    points: ["HSE incident register", "Corrective action closure", "Quality inspection trail"],
  },
];

export const OPERATING_PRINCIPLES = [
  {
    title: "Confirm the stock before the promise",
    body: "An order is only allocated when the product is physically available, so a customer commitment is backed by inventory rather than hope.",
  },
  {
    title: "One record from order to cash",
    body: "Order, allocation, dispatch, delivery, invoice and payment are links in a single chain. Nothing is re-keyed between them.",
  },
  {
    title: "Safety is a record, not a poster",
    body: "Every incident, inspection result and corrective action is logged against the site and remains visible until it is closed.",
  },
];

/** Demonstration network — these sites exist in the prototype only. */
export const DEMO_NETWORK = [
  { name: "Lagos depot", role: "Coastal receiving and Lagos-axis supply", type: "Depot" },
  { name: "Abuja warehouse", role: "Northern cylinder stocking point", type: "Warehouse" },
  { name: "Rumuokoro retail outlet", role: "Last-mile cylinder retail", type: "Retail" },
];

export interface NewsItem {
  slug: string;
  category: string;
  date: string;
  title: string;
  summary: string;
  paragraphs: string[];
}

/**
 * Illustrative insight notes written for this build. They discuss how the
 * business is reported to operate and how the platform records it; they are
 * not company announcements or publications.
 */
export const NEWS: NewsItem[] = [
  {
    slug: "capacity-figures-that-disagree",
    category: "Research note",
    date: "12 November 2026",
    title: "Why the terminal's capacity figures disagree",
    summary:
      "Public reporting cites 8,000 MT at commissioning and 15,000 MT two years later. Both can be true, and neither should be quoted without its date.",
    paragraphs: [
      "Storage capacity is one of those numbers that travels further than its source. The Port Harcourt terminal is listed at 8,000 MT in LPG terminal directories compiled around its 2019 commissioning, and at 15,000 MT in 2022 reporting that also describes an expansion programme. The two figures are not necessarily in conflict: one describes what was built, the other what was reported after work to increase it.",
      "The practical rule is that a capacity figure is only meaningful with a date and a source attached. A terminal is a set of tanks, and tanks are added, re-rated and taken out of service. Strip away the date and the number becomes a claim rather than a measurement.",
      "That is why this site presents both figures together, labelled as reported, and why the platform treats storage as measured stock by tank and batch rather than a headline capacity. Capacity tells you what the site can hold; available stock tells you what can be promised today.",
    ],
  },
  {
    slug: "one-record-from-jetty-to-cylinder",
    category: "Operations",
    date: "28 October 2026",
    title: "From jetty to cylinder: the case for one record",
    summary:
      "A quantity entered at discharge should be the same quantity a distributor sees and the same figure finance reconciles against.",
    paragraphs: [
      "A discharge at the jetty, a tank allocation, a reserved order, a dispatch note and an invoice are usually described as separate activities. Operationally they are one chain, and the weakest link is whichever handoff is re-keyed by a person.",
      "Keeping a single record per movement removes most of that exposure. The measured quantity becomes the batch, the batch is what gets reserved, the reservation is what gets dispatched, and delivery confirmation is what raises the invoice. Every step references the one before it instead of restating it.",
      "The audit trail then has something worth reading: status transitions with an actor, a timestamp and a reason, all attached to the same batch. Reconciliation stops being a monthly argument and becomes a query.",
    ],
  },
  {
    slug: "what-a-walk-down-records",
    category: "Safety",
    date: "7 October 2026",
    title: "What a terminal walk-down actually records",
    summary:
      "Inspection is only assurance if the observation, the owner and the close-out are written down against the site.",
    paragraphs: [
      "Walking a terminal produces observations faster than most systems can absorb them. A leaking flange noted verbally is not an inspection finding; a finding with an owner, a due date and a close-out is.",
      "The discipline is not complicated: record what was seen, where, by whom and what was done about it. What is difficult is keeping that record visible until it closes, and keeping the ones that do not close visible longest.",
      "HSE registers tend to fail in the opposite direction: too much detail, too little ownership. A short record that survives to closure is worth more than a long one that nobody reads.",
    ],
  },
  {
    slug: "why-bottling-capacity-matters",
    category: "Company",
    date: "19 September 2026",
    title: "Why bottling capacity changes the shape of supply",
    summary:
      "Bulk storage earns its return at the nozzle. Cylinder filling is where a terminal position becomes a household product.",
    paragraphs: [
      "A terminal with bulk storage and no filling line sells to distributors, who own the last mile and the customer relationship. Adding cylinder filling moves the terminal closer to the household: filled cylinders, inspected shells and a batch record become part of the operation.",
      "That changes what has to be tracked. Bulk stock is measured in metric tonnes at a tank; cylinder stock is counted in units, in shells, in tests and in quarantine. The two inventories behave differently and cannot share a single ledger without losing exactly the detail that matters.",
      "It also changes quality risk. A cylinder that fails inspection after filling is a safety event and a stock write-off at the same time, which is why batch inspection has to happen before release rather than after dispatch.",
    ],
  },
];

export interface Partner {
  abbr: string;
  name: string;
  role: string;
}

/**
 * Counterparties and bodies named in public reporting about the company. The
 * tiles are typographic placeholders — no official logos are reproduced — and
 * inclusion does not imply endorsement.
 */
export const PARTNERS: Partner[] = [
  { abbr: "NLNG", name: "Nigeria LNG Limited", role: "LPG supply partnership; first direct DPGL cargo, 2019" },
  { abbr: "NNPC", name: "Nigerian National Petroleum Corporation", role: "Coastal lifting under a strategic alliance" },
  { abbr: "NMDPRA", name: "Midstream & Downstream Petroleum Regulatory Authority", role: "Downstream regulator" },
  { abbr: "NUPRC", name: "Upstream Petroleum Regulatory Commission", role: "Upstream regulator" },
  { abbr: "SON", name: "Standards Organisation of Nigeria", role: "Cylinder and product standards" },
  { abbr: "NALPGAM", name: "Nigerian Association of LPG Marketers", role: "Industry association" },
  { abbr: "RVSG", name: "Rivers State Government", role: "Host state" },
];

export interface Vacancy {
  id: string;
  title: string;
  team: string;
  location: string;
  type: string;
  summary: string;
  responsibilities: string[];
}

/** Illustrative vacancies for the demonstration build — not live listings. */
export const VACANCIES: Vacancy[] = [
  {
    id: "terminal-operations-supervisor",
    title: "Terminal operations supervisor",
    team: "Operations",
    location: "Port Harcourt",
    type: "Full-time",
    summary:
      "Run the shift on the jetty and tank farm: receipt, storage, loading windows and the records that prove each movement.",
    responsibilities: [
      "Coordinate tanker loading and jetty discharge against the daily plan",
      "Sign off stock movements and reconcile tank readings at shift handover",
      "Escalate availability, quality and safety exceptions before they reach a customer",
    ],
  },
  {
    id: "hse-officer",
    title: "HSE officer",
    team: "Assurance",
    location: "Port Harcourt",
    type: "Full-time",
    summary:
      "Own the incident, inspection and corrective-action registers, and keep them closed on time.",
    responsibilities: [
      "Lead documented walk-downs across the terminal and filling areas",
      "Record observations with an owner, due date and close-out evidence",
      "Support permit-to-work control for maintenance activity",
    ],
  },
  {
    id: "cylinder-plant-technician",
    title: "Cylinder plant technician",
    team: "Production",
    location: "Port Harcourt",
    type: "Full-time",
    summary:
      "Fill, inspect and release cylinders to the standard, and keep every serial traceable to its batch.",
    responsibilities: [
      "Operate filling and inspection equipment within approved parameters",
      "Record test results per cylinder serial and quarantine failures",
      "Maintain fill-weight and batch documentation for release",
    ],
  },
  {
    id: "commercial-analyst",
    title: "Commercial analyst, LPG & white products",
    team: "Commercial",
    location: "Port Harcourt",
    type: "Full-time",
    summary:
      "Turn confirmed stock and delivery capacity into supply commitments the terminal can keep.",
    responsibilities: [
      "Track open orders, allocations and delivery performance by customer",
      "Prepare availability positions for the commercial desk",
      "Reconcile invoiced volumes against dispatched quantities",
    ],
  },
];

export function sourceById(id: string): Source {
  const found = SOURCES.find((source) => source.id === id);
  return found ?? SOURCES[0]!;
}
