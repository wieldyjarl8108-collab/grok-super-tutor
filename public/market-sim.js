/**
 * Age-growing market lab — evolves with the learner.
 * Little kids: trade eggs, bread, apples (barter).
 * Older kids: play dollars + simple shops.
 * Teens/adults: stock market language + deeper teaching.
 * Always fake. Always educational.
 */

export const MARKET_DISCLAIMER =
  'This is a simulation using fictional goods or companies and play money (or play trades). It is for educational purposes only and does not constitute financial advice. No real money is involved. Past simulated performance does not reflect real market outcomes.';

/** @typedef {'little'|'kid'|'teen'|'adult'} MarketTier */

function tierFromAge(age) {
  const a = Number(age) || 8;
  if (a <= 7) return 'little';
  if (a <= 12) return 'kid';
  if (a <= 17) return 'teen';
  return 'adult';
}

function tierLabel(tier) {
  return {
    little: 'Market stall (trade food & goods)',
    kid: 'Shop shares (play dollars)',
    teen: 'Stock market (play dollars)',
    adult: 'Investing lab (play dollars · advanced)',
  }[tier] || 'Market lab';
}

/** Little kids — barter goods (eggs, bread, …) */
const GOODS = [
  { ticker: 'EGGS', name: 'Farm Eggs', emoji: '🥚', sector: 'Food', base: 3, unit: 'carton', vol: 0.04, blurb: 'Chickens lay more when happy. Bad weather → fewer eggs → harder to trade for.' },
  { ticker: 'BREAD', name: 'Fresh Bread', emoji: '🍞', sector: 'Food', base: 4, unit: 'loaf', vol: 0.035, blurb: 'Bakery needs flour and heat. Flour short = bread costs more eggs.' },
  { ticker: 'MILK', name: 'Fresh Milk', emoji: '🥛', sector: 'Food', base: 3.5, unit: 'bottle', vol: 0.038, blurb: 'Cows need grass. Dry fields → less milk → higher trade price.' },
  { ticker: 'APPLE', name: 'Crisp Apples', emoji: '🍎', sector: 'Food', base: 2, unit: 'bag', vol: 0.045, blurb: 'Harvest season = lots of apples. Winter = fewer apples.' },
  { ticker: 'CORN', name: 'Sweet Corn', emoji: '🌽', sector: 'Farm', base: 2.5, unit: 'basket', vol: 0.04, blurb: 'Sun and rain grow corn. Storms can hurt the crop.' },
  { ticker: 'HONEY', name: 'Bee Honey', emoji: '🍯', sector: 'Farm', base: 5, unit: 'jar', vol: 0.05, blurb: 'Bees make honey slowly. Rare treat → people trade more for it.' },
];

const GOODS_NEWS = [
  { text: '🌧️ Big rain helped the grass — more milk coming!', effect: { MILK: -6 }, why: 'When more milk is available, traders ask for fewer eggs (or tokens) per bottle. More supply → lower trade price.' },
  { text: '🐔 Chickens are happy — extra eggs this week!', effect: { EGGS: -8 }, why: 'Lots of eggs means each carton is easier to get. More eggs → you trade fewer other goods for eggs.' },
  { text: '🔥 Oven broke at the bakery — less bread today.', effect: { BREAD: 12 }, why: 'Less bread available. People trade more eggs or corn to get a loaf. Less supply → higher price.' },
  { text: '❄️ Early frost hurt the apple trees.', effect: { APPLE: 10 }, why: 'Fewer apples. Traders pay more (in other goods) for each bag.' },
  { text: '🐝 Bees found new flowers — honey is easier to make.', effect: { HONEY: -7 }, why: 'More honey jars around. Honey becomes a bit cheaper to trade for.' },
  { text: '🌽 Perfect sunny week for corn fields!', effect: { CORN: -9 }, why: 'Good harvest talk means more corn baskets. Price softens.' },
  { text: '😱 Storm warning! People grab bread and eggs fast.', effect: { BREAD: 8, EGGS: 7, MILK: 5 }, why: 'When everyone wants the same goods at once (demand up), trade prices rise.' },
  { text: '☀️ Calm market day — trading is steady.', effect: { EGGS: 1, BREAD: 1, APPLE: -1 }, why: 'Quiet days have small moves. That is normal.' },
];

/** Ages ~8–12 play dollar shops */
const SHOPS = [
  { ticker: 'COOKIE', name: 'Cookie Shop', emoji: '🍪', sector: 'Food', base: 12, unit: 'share', vol: 0.03, blurb: 'Sells cookies. Holidays = more buyers of the shop piece.' },
  { ticker: 'TOYS', name: 'Toy Corner', emoji: '🧸', sector: 'Fun', base: 15, unit: 'share', vol: 0.035, blurb: 'Toys and games. Birthday season can lift the price.' },
  { ticker: 'BOOKY', name: 'Book Nook', emoji: '📚', sector: 'Learn', base: 10, unit: 'share', vol: 0.025, blurb: 'Books and learning apps. Steady when school is busy.' },
  { ticker: 'LEMO', name: 'Lemonade Stand Co', emoji: '🍋', sector: 'Food', base: 8, unit: 'share', vol: 0.04, blurb: 'Hot days = more lemonade sales talk.' },
  { ticker: 'BIKE', name: 'Bike Fix Shop', emoji: '🚲', sector: 'Sport', base: 18, unit: 'share', vol: 0.032, blurb: 'Repairs bikes. Springtime usually busier.' },
];

const SHOP_NEWS = [
  { text: '🍪 Cookie Shop sold out on holiday weekend!', effect: { COOKIE: 10 }, why: 'Good sales news makes people want a piece of the shop → share price up.' },
  { text: '🌧️ Rainy week — fewer lemonade customers.', effect: { LEMO: -9 }, why: 'Bad weather hurts lemonade sales talk → some people sell their shares → price down.' },
  { text: '🧸 New toy launch is a hit!', effect: { TOYS: 12 }, why: 'Exciting products bring buyers of shop shares.' },
  { text: '📚 Schools ordered more books.', effect: { BOOKY: 8 }, why: 'Steady good news can lift a shop’s share price.' },
  { text: '🚲 Spring bike rides are starting!', effect: { BIKE: 7 }, why: 'Seasonal demand can nudge prices up.' },
  { text: '😱 Allowance day delayed in the game — kids spend less.', effect: { COOKIE: -4, TOYS: -5, LEMO: -3 }, why: 'When people have less play cash, fewer buyers → prices can soften.' },
];

/** Teens + adults */
const STOCKS = [
  { ticker: 'COOKIE', name: 'Cookie Corp', emoji: '🍪', sector: 'Consumer', base: 42.5, unit: 'share', vol: 0.028, blurb: 'Snack brand. Seasonal demand moves the stock.' },
  { ticker: 'RKTSHIP', name: 'Rocket Ship Inc', emoji: '🚀', sector: 'Tech', base: 118, unit: 'share', vol: 0.04, blurb: 'Aerospace tech. Contract news can swing price hard.' },
  { ticker: 'DINO', name: 'Dino Park Co', emoji: '🦕', sector: 'Leisure', base: 64, unit: 'share', vol: 0.032, blurb: 'Theme parks. Weather and travel moods matter.' },
  { ticker: 'RAINBOW', name: 'Rainbow Tech', emoji: '🌈', sector: 'Tech', base: 89, unit: 'share', vol: 0.035, blurb: 'Consumer gadgets. Product launches drive demand.' },
  { ticker: 'BOOKY', name: 'Booky Reads', emoji: '📚', sector: 'Education', base: 31, unit: 'share', vol: 0.022, blurb: 'Learning apps. Usually steadier (lower drama).' },
  { ticker: 'SPORTZ', name: 'Sportz Gear', emoji: '⚽', sector: 'Consumer', base: 55, unit: 'share', vol: 0.03, blurb: 'Sports gear. Event hype can lift short-term demand.' },
  { ticker: 'GREENY', name: 'GreenGrid Energy', emoji: '⚡', sector: 'Energy', base: 47, unit: 'share', vol: 0.033, blurb: 'Clean energy stories. Policy and weather headlines matter.' },
  { ticker: 'HEALTHX', name: 'HealthX Labs', emoji: '💊', sector: 'Health', base: 72, unit: 'share', vol: 0.038, blurb: 'Health tech. Research news can move prices a lot (sim only).' },
];

const CRYPTOS = [
  { ticker: 'STARCOIN', name: 'StarCoin', emoji: '⭐', sector: 'Crypto', base: 1.35, unit: 'coin', vol: 0.07, blurb: 'Play crypto. Faster swings teach volatility risk.' },
  { ticker: 'MOONBYTE', name: 'MoonByte', emoji: '🌙', sector: 'Crypto', base: 0.09, unit: 'coin', vol: 0.09, blurb: 'Tiny price, big % moves. Easy to gain or lose play value fast.' },
  { ticker: 'DRGNCOIN', name: 'DragonCoin', emoji: '🐉', sector: 'Crypto', base: 3.2, unit: 'coin', vol: 0.08, blurb: 'Hype-driven in the sim. Can spike and crash.' },
];

/** Adult-only extra “funds” (still fake) */
const FUNDS = [
  { ticker: 'SAFEBASKET', name: 'Safe Basket Fund', emoji: '🧺', sector: 'Fund', base: 50, unit: 'unit', vol: 0.012, blurb: 'Pretend mix of many shops. Diversification = smoother ride (not zero risk).' },
  { ticker: 'GROWTHX', name: 'Growth Explorers Fund', emoji: '📈', sector: 'Fund', base: 65, unit: 'unit', vol: 0.03, blurb: 'Pretend growth mix. Higher swings than Safe Basket.' },
];

const STOCK_NEWS = [
  { text: '🍪 Cookie Corp sold out a new flavor — buyers pile in.', effect: { COOKIE: 9 }, why: 'Positive demand news → more buyers than sellers → price tends to rise.' },
  { text: '🌧️ Storms closed Dino Parks — visitors stay home.', effect: { DINO: -8 }, why: 'Weaker business outlook → sellers increase → price tends to fall.' },
  { text: '🚀 Rocket Ship won a pretend contract!', effect: { RKTSHIP: 14 }, why: 'Future sales optimism attracts buyers → price up.' },
  { text: '📱 Rainbow Tech launch sold out.', effect: { RAINBOW: 11 }, why: 'Strong product demand can lift the stock as people bid more.' },
  { text: '⚡ Clean energy story boosts GreenGrid chatter.', effect: { GREENY: 8 }, why: 'Sector narratives can move related stocks together.' },
  { text: '💊 HealthX trial rumor (sim only) stirs trading.', effect: { HEALTHX: 12 }, why: 'Uncertainty + hope can create big swings — risk teaching moment.' },
  { text: '📚 Schools order more Booky apps.', effect: { BOOKY: 7 }, why: 'Steady good news often lifts prices more gently.' },
  { text: '⚽ Big sports weekend — Sportz Gear in headlines.', effect: { SPORTZ: 8 }, why: 'Attention can create temporary buying excitement.' },
  { text: '🏦 Confidence is high — many stocks tick up.', effect: { COOKIE: 3, DINO: 3, RKTSHIP: 4, RAINBOW: 3, BOOKY: 2, SPORTZ: 3, GREENY: 3 }, why: 'Broad optimism increases demand across assets.' },
  { text: '😱 Fear day — many sell at once.', effect: { COOKIE: -5, DINO: -6, RKTSHIP: -7, RAINBOW: -5, HEALTHX: -8, STARCOIN: -10, DRGNCOIN: -12, GROWTHX: -6 }, why: 'Fear hits many prices. Diversified baskets can soften (not erase) the blow.' },
  { text: '⭐ StarCoin listed on a new pretend exchange.', effect: { STARCOIN: 18 }, why: 'Easier access can increase demand → sharp crypto jumps (and later dumps).' },
  { text: '🐛 MoonByte bug scare.', effect: { MOONBYTE: -15 }, why: 'Fear selling is fast in small, hype markets.' },
  { text: '🐉 DragonCoin viral hype (still fake).', effect: { DRGNCOIN: 22 }, why: 'Hype spikes are fragile — prices can reverse hard.' },
  { text: '🧺 Safe Basket holds up better than hot stocks today.', effect: { SAFEBASKET: 1, COOKIE: -3, RKTSHIP: -4 }, why: 'Spreading risk can mean smaller daily swings than single stocks.' },
];

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtPrice(n, tier) {
  const x = Number(n);
  if (tier === 'little') return x.toFixed(1);
  if (x < 1) return `$${x.toFixed(4)}`;
  return `$${x.toFixed(2)}`;
}

function sparkline(history, color) {
  if (!history?.length) return '';
  const w = 120; const h = 36;
  const min = Math.min(...history); const max = Math.max(...history);
  const span = max - min || 1;
  const pts = history.map((v, i) => {
    const x = (i / (history.length - 1 || 1)) * w;
    const y = h - ((v - min) / span) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="mkt-spark" viewBox="0 0 ${w} ${h}" width="120" height="36"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`;
}

/**
 * @param {HTMLElement} root
 * @param {{ getChildName?: () => string, getAge?: () => number }} opts
 */
export function createMarketSim(root, { getChildName, getAge } = {}) {
  const state = {
    tier: 'kid',
    tab: 'main', // main | extra (crypto/funds)
    cash: 1000, // little tier: trade tokens (same number, called tokens)
    prices: {},
    costBasis: {},
    shares: {},
    history: {},
    log: [],
    selected: null,
    timer: null,
    newsTimer: null,
    lastNews: null,
  };

  function age() {
    return Number(getAge?.() ?? 10) || 10;
  }

  function refreshTier() {
    const t = tierFromAge(age());
    if (t !== state.tier) {
      state.tier = t;
      // soft reset inventory when age band changes so UI matches world
      state.prices = {};
      state.history = {};
      state.shares = {};
      state.costBasis = {};
      state.cash = t === 'little' ? 40 : t === 'kid' ? 200 : 1000; // starting play capital
      state.tab = 'main';
      state.log = [];
      initPrices();
      pushLog(welcomeMessage(t), 'teach');
    } else {
      state.tier = t;
    }
  }

  function welcomeMessage(tier) {
    const name = getChildName?.() || 'friend';
    if (tier === 'little') {
      return `Welcome ${esc(name)}! This is the <strong>market stall</strong>. You trade eggs, bread, milk, and more with play tokens. <em>Teacher:</em> When something is scarce, you need more tokens to get it. When there is lots, it costs less.`;
    }
    if (tier === 'kid') {
      return `Welcome ${esc(name)}! You have play dollars to buy <strong>pieces of shops</strong>. <em>Teacher:</em> Buy low, sell high. News changes how many people want a shop piece.`;
    }
    if (tier === 'teen') {
      return `Welcome ${esc(name)}! This is a full <strong>practice stock market</strong> with play money. <em>Teacher:</em> I will explain every gain and loss — paper vs real (when you sell).`;
    }
    return `Welcome ${esc(name)}! Advanced <strong>investing lab</strong> (still 100% play money). Includes stocks, optional crypto, and practice funds to learn diversification. <em>Teacher:</em> Risk, reward, and emotions — still educational only.`;
  }

  function assetUniverse() {
    const t = state.tier;
    if (t === 'little') return { main: GOODS, extra: [], news: GOODS_NEWS, currency: 'tokens', buyVerb: 'Trade for', sellVerb: 'Trade away' };
    if (t === 'kid') return { main: SHOPS, extra: [], news: SHOP_NEWS, currency: 'play $', buyVerb: 'Buy', sellVerb: 'Sell' };
    if (t === 'teen') return { main: STOCKS, extra: CRYPTOS, news: STOCK_NEWS, currency: 'play $', buyVerb: 'Buy', sellVerb: 'Sell' };
    return { main: STOCKS, extra: [...CRYPTOS, ...FUNDS], news: STOCK_NEWS, currency: 'play $', buyVerb: 'Buy', sellVerb: 'Sell' };
  }

  function allListed() {
    const u = assetUniverse();
    return state.tab === 'extra' && u.extra.length ? u.extra : u.main;
  }

  function initPrices() {
    for (const a of [...GOODS, ...SHOPS, ...STOCKS, ...CRYPTOS, ...FUNDS]) {
      if (state.prices[a.ticker] == null) state.prices[a.ticker] = a.base;
      if (!state.history[a.ticker]) state.history[a.ticker] = [a.base];
      if (state.shares[a.ticker] == null) state.shares[a.ticker] = 0;
      if (state.costBasis[a.ticker] == null) state.costBasis[a.ticker] = 0;
    }
  }

  function pushLog(html, type = 'info') {
    state.log.unshift({ html, type, t: Date.now() });
    if (state.log.length > 50) state.log.length = 50;
  }

  function portfolioValue() {
    let v = 0;
    for (const [t, q] of Object.entries(state.shares)) {
      v += (state.prices[t] || 0) * q;
    }
    return v;
  }

  function unitWord(asset) {
    if (state.tier === 'little') return asset.unit || 'item';
    return asset.unit || 'share';
  }

  function teachBuy(asset, price) {
    const tier = state.tier;
    if (tier === 'little') {
      pushLog(
        `<strong>You traded for 1 ${asset.emoji} ${asset.name}</strong> using ${fmtPrice(price, tier)} tokens. ` +
        `<em>Teacher:</em> You spent tokens now. You “win” later only if you trade it away for <strong>more</strong> tokens than you paid. ` +
        `If its trade price falls, that ${unitWord(asset)} is worth less on paper until the price rises again.`,
        'buy',
      );
      pushLog(`<em>Why prices change:</em> ${esc(asset.blurb)}`, 'teach');
      return;
    }
    pushLog(
      `<strong>You bought 1 ${asset.ticker}</strong> at ${fmtPrice(price, tier)}. Cash down by that amount. ` +
      `<em>Teacher:</em> You make play money only if you later sell higher than your average buy price. Until you sell, gains/losses are “on paper.”`,
      'buy',
    );
    pushLog(`<em>About this asset:</em> ${esc(asset.blurb)}`, 'teach');
  }

  function teachSell(asset, price, avgCost) {
    const pnl = price - avgCost;
    const win = pnl >= 0;
    const tier = state.tier;
    if (tier === 'little') {
      pushLog(
        `<strong>You traded away 1 ${asset.name}</strong> for ${fmtPrice(price, tier)} tokens (you paid about ${fmtPrice(avgCost, tier)}). ` +
        `<em>Teacher:</em> ${win
          ? `You <strong>gained ${fmtPrice(pnl, tier)} tokens</strong> because you got more than you paid. That is a smart trade!`
          : `You <strong>lost ${fmtPrice(Math.abs(pnl), tier)} tokens</strong> because you got less than you paid. Losses teach us to watch prices.`}`,
        win ? 'win' : 'loss',
      );
      return;
    }
    pushLog(
      `<strong>You sold 1 ${asset.ticker}</strong> at ${fmtPrice(price, tier)} (avg buy ${fmtPrice(avgCost, tier)}). ` +
      `<em>Teacher:</em> ${win
        ? `You <strong>made ${fmtPrice(pnl, tier)}</strong>. Profit = sell price − buy price.`
        : `You <strong>lost ${fmtPrice(Math.abs(pnl), tier)}</strong>. Loss = buy price − sell price.`}`,
      win ? 'win' : 'loss',
    );
  }

  function teachHoldMove(ticker, oldP, newP, reason) {
    const q = state.shares[ticker] || 0;
    if (q <= 0) return;
    const asset = [...GOODS, ...SHOPS, ...STOCKS, ...CRYPTOS, ...FUNDS].find((a) => a.ticker === ticker);
    if (!asset) return;
    const up = newP >= oldP;
    const delta = (newP - oldP) * q;
    const tier = state.tier;
    if (tier === 'little') {
      pushLog(
        `${asset.emoji} <strong>${asset.name}</strong> trade price ${up ? 'went up' : 'went down'} ` +
        `(${fmtPrice(oldP, tier)} → ${fmtPrice(newP, tier)}). You hold ${q}. On paper you ${up ? 'gained' : 'lost'} about ${fmtPrice(Math.abs(delta), tier)} tokens. ` +
        `<em>Teacher:</em> ${up ? 'It became more valuable — but only counts when you trade it away for more tokens.' : 'It became less valuable on paper. You can wait or trade it anyway — your choice.'}`,
        up ? 'up' : 'down',
      );
    } else {
      pushLog(
        `${asset.emoji} <strong>${ticker}</strong> ${up ? 'rose' : 'fell'} ` +
        `(${fmtPrice(oldP, tier)} → ${fmtPrice(newP, tier)}). You own ${q}; paper ${up ? 'gain' : 'loss'} ~${fmtPrice(Math.abs(delta), tier)}. ` +
        `<em>Teacher:</em> ${up ? 'Paper gains become real only when you sell higher than you paid.' : 'Paper losses become real only if you sell lower than you paid.'}`,
        up ? 'up' : 'down',
      );
    }
    if (reason) pushLog(`<em>Why:</em> ${esc(reason)}`, 'teach');
  }

  function buy(ticker) {
    refreshTier();
    const asset = allListed().find((a) => a.ticker === ticker) || [...GOODS, ...SHOPS, ...STOCKS, ...CRYPTOS, ...FUNDS].find((a) => a.ticker === ticker);
    if (!asset) return;
    const price = state.prices[ticker];
    if (state.cash < price) {
      pushLog(
        state.tier === 'little'
          ? `Not enough tokens for ${asset.name}. <em>Teacher:</em> Trade away something else first to get more tokens.`
          : `Not enough cash for ${ticker}. <em>Teacher:</em> You can only spend play money you still have.`,
        'warn',
      );
      render();
      return;
    }
    const oldShares = state.shares[ticker] || 0;
    const oldBasis = state.costBasis[ticker] || 0;
    const newShares = oldShares + 1;
    state.costBasis[ticker] = oldShares === 0 ? price : (oldBasis * oldShares + price) / newShares;
    state.shares[ticker] = newShares;
    state.cash = Math.round((state.cash - price) * 100) / 100;
    state.selected = ticker;
    teachBuy(asset, price);
    render();
  }

  function sell(ticker) {
    refreshTier();
    const asset = [...GOODS, ...SHOPS, ...STOCKS, ...CRYPTOS, ...FUNDS].find((a) => a.ticker === ticker);
    if (!asset || (state.shares[ticker] || 0) <= 0) return;
    const price = state.prices[ticker];
    const avg = state.costBasis[ticker] || price;
    state.shares[ticker] -= 1;
    state.cash = Math.round((state.cash + price) * 100) / 100;
    if (state.shares[ticker] === 0) state.costBasis[ticker] = 0;
    state.selected = ticker;
    teachSell(asset, price, avg);
    render();
  }

  function tickPrices() {
    refreshTier();
    const listed = [...assetUniverse().main, ...assetUniverse().extra];
    for (const a of listed) {
      const old = state.prices[a.ticker];
      const change = (Math.random() - 0.48) * old * a.vol;
      const floor = a.base < 1 ? 0.001 : state.tier === 'little' ? 0.5 : 0.5;
      const next = Math.max(floor, old + change);
      state.prices[a.ticker] = next;
      const h = state.history[a.ticker];
      h.push(next);
      if (h.length > 30) h.shift();
      if ((state.shares[a.ticker] || 0) > 0 && Math.abs((next - old) / old) > 0.025) {
        teachHoldMove(a.ticker, old, next, null);
      }
    }
    render();
  }

  function fireNews() {
    refreshTier();
    const newsPool = assetUniverse().news;
    const n = newsPool[Math.floor(Math.random() * newsPool.length)];
    state.lastNews = n;
    for (const [t, pct] of Object.entries(n.effect || {})) {
      const old = state.prices[t];
      if (old == null) continue;
      const next = Math.max(0.001, old * (1 + pct / 100));
      state.prices[t] = next;
      if (!state.history[t]) state.history[t] = [old];
      state.history[t].push(next);
      if (state.history[t].length > 30) state.history[t].shift();
      if ((state.shares[t] || 0) > 0) teachHoldMove(t, old, next, n.why);
    }
    pushLog(`📰 <strong>News:</strong> ${esc(n.text)} <em>${esc(n.why)}</em>`, 'news');
    render();
  }

  function reset() {
    refreshTier();
    const t = state.tier;
    state.cash = t === 'little' ? 40 : t === 'kid' ? 200 : 1000;
    state.shares = {};
    state.costBasis = {};
    state.prices = {};
    state.history = {};
    state.log = [];
    initPrices();
    pushLog(welcomeMessage(t), 'teach');
    render();
  }

  function render() {
    refreshTier();
    initPrices();
    const tier = state.tier;
    const u = assetUniverse();
    const assets = allListed();
    const pv = portfolioValue();
    const startCash = tier === 'little' ? 40 : tier === 'kid' ? 200 : 1000;
    const total = state.cash + pv;
    const pnl = total - startCash;
    const cashLabel = tier === 'little' ? 'Tokens' : 'Cash';
    const holdLabel = tier === 'little' ? 'Basket value' : 'Holdings';
    const hasExtra = u.extra.length > 0;

    root.innerHTML = `
      <div class="tutor-disclaimer">⚠️ <strong>Educational Disclaimer:</strong> ${esc(MARKET_DISCLAIMER)}</div>
      <div class="mkt-tier-bar">
        <span class="pill">Age ${age()} · ${esc(tierLabel(tier))}</span>
        <span class="sub">Grows with the learner — goods → shops → stocks${tier === 'adult' ? ' → funds' : ''}</span>
      </div>
      <div class="mkt-layout">
        <div class="mkt-main">
          <div class="tutor-market-summary">
            <div class="stat"><div class="lbl">${cashLabel}</div><div class="val">${tier === 'little' ? state.cash.toFixed(1) : fmtPrice(state.cash, tier)}</div></div>
            <div class="stat"><div class="lbl">${holdLabel}</div><div class="val">${tier === 'little' ? pv.toFixed(1) : fmtPrice(pv, tier)}</div></div>
            <div class="stat"><div class="lbl">Total</div><div class="val ${pnl >= 0 ? 'up' : 'down'}">${tier === 'little' ? total.toFixed(1) : fmtPrice(total, tier)} (${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)})</div></div>
          </div>
          <div class="row gap wrap" style="margin-bottom:8px">
            <button type="button" class="btn soft mkt-tab ${state.tab === 'main' ? 'active' : ''}" data-tab="main">${tier === 'little' ? '🥚 Goods' : '📈 Main list'}</button>
            ${hasExtra ? `<button type="button" class="btn soft mkt-tab ${state.tab === 'extra' ? 'active' : ''}" data-tab="extra">${tier === 'adult' ? '₿ Crypto & funds' : '₿ Crypto (wilder)'}</button>` : ''}
            <button type="button" class="btn soft" id="mktReset">Reset play balance</button>
          </div>
          ${state.lastNews ? `<p class="tutor-market-event">📰 ${esc(state.lastNews.text)}</p>` : ''}
          <div class="tutor-market-list">
            ${assets.map((a) => {
              const price = state.prices[a.ticker];
              const hist = state.history[a.ticker] || [price];
              const base = hist[0] || a.base;
              const chg = ((price - base) / base) * 100;
              const owned = state.shares[a.ticker] || 0;
              const avg = state.costBasis[a.ticker] || 0;
              const paper = owned ? (price - avg) * owned : 0;
              return `
                <div class="market-asset-card ${state.selected === a.ticker ? 'sel' : ''}">
                  <div class="top">
                    <div>
                      <h4>${a.emoji} ${esc(tier === 'little' ? a.name : a.ticker)}</h4>
                      <div class="sub" style="margin:0">${esc(tier === 'little' ? a.sector : a.name)} · ${esc(a.sector)}</div>
                    </div>
                    <div style="text-align:right">
                      <div class="price">${fmtPrice(price, tier)}${tier === 'little' ? ' tok' : ''}</div>
                      <div class="chg ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%</div>
                    </div>
                  </div>
                  ${sparkline(hist, chg >= 0 ? '#34d399' : '#fb7185')}
                  <p class="desc">${esc(a.blurb)}</p>
                  ${owned ? `<span class="pill">Have ${owned} ${unitWord(a)}${owned > 1 ? 's' : ''} · avg ${fmtPrice(avg, tier)} · paper ${paper >= 0 ? '+' : ''}${fmtPrice(paper, tier)}</span>` : ''}
                  <div class="actions">
                    <button type="button" class="btn primary mkt-buy" data-t="${a.ticker}">${u.buyVerb} 1</button>
                    <button type="button" class="btn soft mkt-sell" data-t="${a.ticker}" ${owned ? '' : 'disabled'}>${u.sellVerb} 1</button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>
        <div class="mkt-coach">
          <h3>👩‍🏫 Market teacher</h3>
          <p class="sub">Explains every trade and big move for age ${age()} — grows with ${esc(getChildName?.() || 'the learner')}.</p>
          <div class="mkt-log">
            ${state.log.length ? state.log.map((e) => `<div class="mkt-log-item ${e.type}">${e.html}</div>`).join('')
              : '<div class="mkt-log-item teach">Make a trade to start. I will coach after every click.</div>'}
          </div>
        </div>
      </div>
    `;

    root.querySelectorAll('.mkt-tab').forEach((b) => {
      b.onclick = () => { state.tab = b.dataset.tab; render(); };
    });
    root.querySelector('#mktReset')?.addEventListener('click', () => {
      if (confirm('Reset play balance and clear what you hold?')) reset();
    });
    root.querySelectorAll('.mkt-buy').forEach((b) => { b.onclick = () => buy(b.dataset.t); });
    root.querySelectorAll('.mkt-sell').forEach((b) => { b.onclick = () => sell(b.dataset.t); });
  }

  function start() {
    refreshTier();
    initPrices();
    if (!state.log.length) pushLog(welcomeMessage(state.tier), 'teach');
    render();
    stop();
    state.timer = setInterval(tickPrices, 3500);
    state.newsTimer = setInterval(fireNews, 14000);
  }

  function stop() {
    if (state.timer) clearInterval(state.timer);
    if (state.newsTimer) clearInterval(state.newsTimer);
    state.timer = null;
    state.newsTimer = null;
  }

  return { start, stop, reset, render, refreshTier };
}
