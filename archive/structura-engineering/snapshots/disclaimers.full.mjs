/**
 * Unified Grok Agent disclaimers
 * Spark Path Learn (BrightMind) + Structura AI — keep wording strong, never weaken.
 */

/** Exact Spark Path / StockMarket.jsx disclaimer */
export const STOCK_MARKET_DISCLAIMER =
  'This is a simulation using fictional companies and play money. It is for educational purposes only and does not constitute financial advice. No real money is involved. Past simulated performance does not reflect real market outcomes.';

export const STOCK_MARKET_DISCLAIMER_HTML =
  `⚠️ <strong>Educational Disclaimer:</strong> ${STOCK_MARKET_DISCLAIMER}`;

/** Educational content (lessons, quizzes, market, code lab) */
export const EDUCATIONAL_CONTENT_DISCLAIMER =
  'All lessons, quizzes, stock market simulations, coding challenges, and investing materials are for educational purposes only. They do not constitute professional financial, legal, medical, or investment advice. The stock market simulator uses fictional data and play money and is not connected to real markets.';

/** Homeschool (Spark Path) */
export const HOMESCHOOL_DISCLAIMER =
  'This agent is an educational supplement — it is not a state-accredited school and does not issue diplomas, official transcripts, or accredited credits. Parents are solely responsible for ensuring their homeschool program complies with their state\'s laws.';

/** Structura structural / AI engineering */
export const STRUCTURAL_ENGINEERING_DISCLAIMER =
  'Structural models, stress estimates, material properties, load simulations, and AI design analysis are educational / preliminary only. They are not a PE stamp, not construction documents, and not code compliance. Always have licensed professionals review real-world designs.';

export const BLUEPRINT_DISCLAIMER =
  'Paper-to-blueprint plans, ballpark costs, and contractor search tips are educational build-partner tools only. They are not stamped drawings, not a permit set, not a bid, and not a contractor referral service. Verify licenses, insurance, codes, and prices with licensed professionals in your area.';

export const MATERIAL_DATA_DISCLAIMER =
  'Material catalog values (density, E, fy, cost) are typical textbook / order-of-magnitude values for learning. Verify manufacturer data and codes for real projects.';

export const SIMULATION_DISCLAIMER =
  'Physics / deflection simulations are simplified visual teaching tools, not finite-element analysis.';

/** One agent identity */
export const AGENT_IDENTITY = {
  name: 'Grok Agent',
  tagline: 'Structura + Spark Path Learn — one local agent',
  pillars: [
    {
      id: 'learn',
      from: 'Spark Path Learn / BrightMind',
      title: 'Super Tutor',
      blurb: 'Kids & adults · age-adaptive lessons · truth-first quizzes · market lab · code lab · parent briefs',
    },
    {
      id: 'struct',
      from: 'Structura AI',
      title: 'Structure',
      blurb: 'Beams · bridges · frames · materials · loads · force/heat/sim modes · engineering analysis',
    },
    {
      id: 'ask',
      from: 'Both',
      title: 'Ask Grok',
      blurb: 'Anything else — school, design, ideas — same memory, same truth rules',
    },
  ],
  rules: [
    'Local only — no Base44 backend',
    'Truth-seeking — no fake facts for kids or fake PE stamps for structures',
    'One Grok · one desktop shortcut · one agent',
  ],
};

export function withInvestingDisclaimer(body) {
  const text = String(body || '');
  if (/educational purposes only|not constitute financial|play money/i.test(text)) {
    return text;
  }
  return `⚠️ EDUCATIONAL DISCLAIMER: ${STOCK_MARKET_DISCLAIMER}\n\n${text}`;
}

export function withEngineeringDisclaimer(body) {
  const text = String(body || '');
  if (/not a PE stamp|educational.*only|not construction/i.test(text)) {
    return text;
  }
  return `${text}\n\n⚠️ ${STRUCTURAL_ENGINEERING_DISCLAIMER}`;
}
