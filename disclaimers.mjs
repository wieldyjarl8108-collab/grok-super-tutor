/**
 * Grok Super Tutor — education disclaimers
 * Engineering disclaimers archived in archive/structura-engineering/snapshots/
 */

export const STOCK_MARKET_DISCLAIMER =
  'This is a simulation using fictional companies and play money. It is for educational purposes only and does not constitute financial advice. No real money is involved. Past simulated performance does not reflect real market outcomes.';

export const STOCK_MARKET_DISCLAIMER_HTML =
  `⚠️ <strong>Educational Disclaimer:</strong> ${STOCK_MARKET_DISCLAIMER}`;

export const EDUCATIONAL_CONTENT_DISCLAIMER =
  'All lessons, quizzes, stock market simulations, coding challenges, and investing materials are for educational purposes only. They do not constitute professional financial, legal, medical, or investment advice. The stock market simulator uses fictional data and play money and is not connected to real markets.';

export const HOMESCHOOL_DISCLAIMER =
  'This agent is an educational supplement — it is not a state-accredited school and does not issue diplomas, official transcripts, or accredited credits. Parents are solely responsible for ensuring their homeschool program complies with their state\'s laws.';

export const AGENT_IDENTITY = {
  name: 'Grok Super Tutor',
  tagline: 'Truth-seeking education — local Super Tutor',
  pillars: [
    {
      id: 'learn',
      from: 'Spark Path Learn / BrightMind',
      title: 'Super Tutor',
      blurb: 'Kids & adults · age-adaptive lessons · truth-first quizzes · market lab · code lab · parent briefs',
    },
    {
      id: 'ask',
      from: 'Grok',
      title: 'Ask Grok',
      blurb: 'Homework help and honest answers — same memory, same truth rules',
    },
  ],
  rules: [
    'Local only — no Base44 backend',
    'Truth-seeking — no fake facts for kids',
    'Education focus — engineering archived for later rebuild',
    'One Grok Tutor · one desktop shortcut · one agent',
  ],
};

export function withInvestingDisclaimer(body) {
  const text = String(body || '');
  if (/educational purposes only|not constitute financial|play money/i.test(text)) {
    return text;
  }
  return `⚠️ EDUCATIONAL DISCLAIMER: ${STOCK_MARKET_DISCLAIMER}\n\n${text}`;
}
