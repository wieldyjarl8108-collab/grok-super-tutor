/**
 * Endless true topic bank — kids never run out of classes.
 * When the library is thin for a learner, we mint age-fit lessons from here.
 * Content is short and factual (truth-seeking); Grok can deepen later in class.
 */

export const ENDLESS_TOPICS = [
  // early
  { title: 'Shadows and Light', subject: 'science', emoji: '☀️', age_min: 3, age_max: 8, difficulty: 'beginner',
    content: 'A shadow forms when something blocks light. The sun and lamps make light. Your body can block light and cast a shadow on the ground. When light moves, shadows move. Shadows are not monsters — they are just missing light in a shape.' },
  { title: 'Sink or Float', subject: 'science', emoji: '🛁', age_min: 3, age_max: 8, difficulty: 'beginner',
    content: 'Some things float on water; some sink. Floating does not only mean “light.” Shape and how much water is pushed away matter too. A big empty boat can float; a small dense rock sinks. Try safe experiments only with a grown-up.' },
  { title: 'How Plants Drink', subject: 'science', emoji: '🌱', age_min: 4, age_max: 9, difficulty: 'beginner',
    content: 'Plants take water through their roots. Tubes in the stem move water up to the leaves. Leaves use light, air, and water to make food (photosynthesis). Wilted plants often need water — but overwatering can hurt roots too.' },
  { title: 'Clouds and Rain', subject: 'science', emoji: '☁️', age_min: 4, age_max: 9, difficulty: 'beginner',
    content: 'Clouds are made of tiny water drops or ice crystals. Warm air can hold more water vapor. When drops grow heavy, rain falls. Snow is frozen precipitation. Weather is not random magic — it follows real science rules.' },
  { title: 'Bones Help You Stand', subject: 'health', emoji: '🦴', age_min: 4, age_max: 10, difficulty: 'beginner',
    content: 'Bones form your skeleton. They support your body and protect soft organs (like the skull protects the brain). Bones are living tissue that can heal after a break with medical care. Calcium-rich foods and movement help bones stay strong — this is general wellness, not medical advice.' },
  { title: 'Sounds Are Vibrations', subject: 'science', emoji: '🔊', age_min: 5, age_max: 11, difficulty: 'beginner',
    content: 'Sound is vibration that travels through air (and other materials) to your ears. Faster vibrations mean higher pitch. Louder sounds mean stronger vibrations. In space there is almost no air, so sound does not travel the way it does on Earth.' },
  // elementary
  { title: 'Gravity Pulls', subject: 'science', emoji: '🌍', age_min: 6, age_max: 12, difficulty: 'beginner',
    content: 'Gravity is the pull between masses. Earth pulls you toward its center, so you stay on the ground. The Moon has gravity too, but weaker at its surface. Gravity keeps the Moon in orbit around Earth and planets around the Sun.' },
  { title: 'Atoms Are Building Blocks', subject: 'science', emoji: '⚛️', age_min: 8, age_max: 14, difficulty: 'intermediate',
    content: 'Atoms are tiny building blocks of ordinary matter. Different elements (like oxygen, carbon, iron) are different kinds of atoms. Molecules are atoms bonded together — water is H2O (two hydrogen, one oxygen). Atoms are real; we study them with tools and experiments, not guesswork.' },
  { title: 'Electric Circuits Basics', subject: 'science', emoji: '💡', age_min: 8, age_max: 14, difficulty: 'intermediate',
    content: 'A simple circuit needs a power source, a path (wires), and a load (like a bulb). Current flows in a closed loop. A switch opens or closes the path. Water comparisons are only analogies — electricity is not water. Safety: never play with wall outlets.' },
  { title: 'Fossils Tell Earth Stories', subject: 'science', emoji: '🦕', age_min: 6, age_max: 12, difficulty: 'beginner',
    content: 'Fossils are remains or traces of ancient life preserved in rock. They help scientists learn what lived long ago. Not every dead animal becomes a fossil — special conditions are needed. Dinosaurs were real animals; birds are their living relatives in an evolutionary sense.' },
  { title: 'Maps and Directions', subject: 'geography', emoji: '🧭', age_min: 6, age_max: 12, difficulty: 'beginner',
    content: 'Maps show places from above using symbols. North, south, east, and west are cardinal directions. A legend explains symbols. Scale relates map distance to real distance. GPS tools use satellites — maps still help you understand the world.' },
  { title: 'Volcanoes and Earth', subject: 'science', emoji: '🌋', age_min: 7, age_max: 13, difficulty: 'beginner',
    content: 'Volcanoes can erupt melted rock (magma becomes lava at the surface), ash, and gas. They often form near plate boundaries. Not all mountains are volcanoes. Eruptions are natural geology — respect hazard zones and never visit unsafe areas.' },
  { title: 'The Human Heart Pump', subject: 'health', emoji: '❤️', age_min: 7, age_max: 13, difficulty: 'beginner',
    content: 'Your heart is a muscle pump that moves blood. Blood carries oxygen and nutrients. Arteries and veins are blood vessels. Exercise can help heart fitness. This is general biology education — not medical advice. If you feel chest pain, tell an adult.' },
  { title: 'Decimals and Place Value', subject: 'math', emoji: '🔢', age_min: 8, age_max: 12, difficulty: 'intermediate',
    content: 'Place value means a digit’s position changes its value. In 3.14, 3 is ones, 1 is tenths, 4 is hundredths. Decimals help measure parts of a whole, money, and science data. Line up decimal points when adding.' },
  { title: 'Angles Around Us', subject: 'math', emoji: '📐', age_min: 8, age_max: 13, difficulty: 'intermediate',
    content: 'An angle is formed by two rays sharing a point. Degrees measure angles. A right angle is 90°. A straight line is 180°. Acute angles are less than 90°; obtuse are between 90° and 180°. Corners of books and screens show angles.' },
  // preteen / teen
  { title: 'DNA Is a Code for Life', subject: 'science', emoji: '🧬', age_min: 11, age_max: 16, difficulty: 'intermediate',
    content: 'DNA is a molecule that stores genetic information in cells. It uses four bases (A, T, C, G) in sequences. Genes influence traits, but environment matters too. DNA is science, not destiny slogans. Cloning and editing are advanced topics with ethics and laws.' },
  { title: 'Climate vs Weather', subject: 'science', emoji: '🌡️', age_min: 10, age_max: 16, difficulty: 'intermediate',
    content: 'Weather is short-term conditions (today’s rain). Climate is long-term average patterns for a region. Earth’s climate can change from natural factors and from human greenhouse gas emissions. Scientists measure climate with data, not opinions alone.' },
  { title: 'Simple Machines', subject: 'science', emoji: '⚙️', age_min: 8, age_max: 14, difficulty: 'beginner',
    content: 'Simple machines include levers, pulleys, wheels and axles, inclined planes, wedges, and screws. They help change the direction or amount of force needed to do work. They do not create free energy — trade-offs always exist.' },
  { title: 'Probability Basics', subject: 'math', emoji: '🎲', age_min: 10, age_max: 16, difficulty: 'intermediate',
    content: 'Probability measures how likely an event is, from 0 (impossible) to 1 (certain). A fair six-sided die has probability 1/6 for each face. Past random outcomes do not “owe” a future result. Probability is used in science, games, and risk — carefully.' },
  { title: 'The Immune System Intro', subject: 'health', emoji: '🛡️', age_min: 10, age_max: 16, difficulty: 'intermediate',
    content: 'Your immune system helps defend against many germs. Skin is a barrier. White blood cells attack invaders. Vaccines train immunity using safe signals — they are among the best-studied tools in medicine. This is education, not a diagnosis or treatment plan.' },
  { title: 'Internet Packets Simply', subject: 'coding', emoji: '🌐', age_min: 10, age_max: 16, difficulty: 'intermediate',
    content: 'The internet moves data in small pieces called packets. Addresses (like IP) help routers forward packets. Encryption helps keep private data hard to read in transit. Strong passwords and caution with strangers protect you — tech is a tool, not a toy for unsafe sharing.' },
  { title: 'Energy Cannot Be Created From Nothing', subject: 'science', emoji: '⚡', age_min: 11, age_max: 16, difficulty: 'intermediate',
    content: 'In ordinary physics, energy is conserved: it changes form (chemical, kinetic, thermal) but is not created from nothing or destroyed. Perpetual motion machines that make free unlimited energy violate this. Power plants convert energy forms with losses as heat.' },
  { title: 'Democracy Basics', subject: 'history', emoji: '🗳️', age_min: 10, age_max: 16, difficulty: 'beginner',
    content: 'In a democracy, power is meant to come from the people through voting and laws. Rules, rights, and responsibilities differ by country. Learning civics helps you understand news without believing every rumor. Always check facts with reliable sources.' },
  { title: 'Algebra Thinking', subject: 'math', emoji: '𝑥', age_min: 11, age_max: 16, difficulty: 'intermediate',
    content: 'Algebra uses symbols (like x) for unknown numbers. You keep equations balanced: what you do to one side, do to the other. Solving means finding values that make the equation true. Algebra is a tool for science, coding, and everyday problems.' },
  { title: 'Stars Make Elements', subject: 'space', emoji: '✨', age_min: 11, age_max: 16, difficulty: 'intermediate',
    content: 'Stars fuse lighter elements into heavier ones in their cores. When massive stars explode as supernovas, they spread elements into space. Many atoms in your body were formed in stars long ago — a true, awe-inspiring scientific story, not fantasy.' },
  { title: 'Microbes: Not All Bad', subject: 'science', emoji: '🦠', age_min: 8, age_max: 14, difficulty: 'beginner',
    content: 'Microbes are tiny living things. Some cause illness; many are helpful (like gut bacteria and yeast used in bread). Clean hands reduce harmful germ spread. Antibiotics fight bacteria, not viruses — and should only be used as a doctor directs.' },
  { title: 'Budgets: Plan Your Money', subject: 'investing', emoji: '📋', age_min: 10, age_max: 16, difficulty: 'beginner',
    content: '⚠️ Educational only — not financial advice. A budget plans income and spending. Needs (food, housing) come before wants. Saving a little regularly builds habits. Play money practice is safe; real money decisions need a trusted adult.' },
  { title: 'Poetry Uses Sound and Image', subject: 'reading', emoji: '📝', age_min: 8, age_max: 14, difficulty: 'beginner',
    content: 'Poetry is writing that often cares about rhythm, sound, and strong images. Rhyme is optional. Metaphors compare things without “like” or “as.” Reading poems aloud helps you hear patterns. There is no single “correct feeling” — but words still have real meanings.' },
  { title: 'Symmetry in Nature and Math', subject: 'math', emoji: '🦋', age_min: 7, age_max: 13, difficulty: 'beginner',
    content: 'Symmetry means parts match after a flip, turn, or slide. Butterfly wings often look roughly mirror-symmetric. Shapes can have line symmetry or rotational symmetry. Math describes patterns we also see in nature and art.' },
  { title: 'Renewable Energy Basics', subject: 'science', emoji: '🔋', age_min: 9, age_max: 16, difficulty: 'intermediate',
    content: 'Renewable energy sources like solar, wind, and hydro are replenished faster than fossil fuels. Fossil fuels (coal, oil, gas) formed over long timescales and produce greenhouse gases when burned. Energy choices involve science, engineering, cost, and policy — discuss facts carefully.' },
];

/**
 * Pick topics not yet in the library titles for this age.
 * @param {{ age: number, existingTitles: string[] }} opts
 */
export function pickEndlessTopics({ age, existingTitles = [], limit = 8 }) {
  const have = new Set(
    existingTitles.map((t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()),
  );
  const ageN = Number(age) || 8;
  const fit = ENDLESS_TOPICS.filter((t) => ageN >= t.age_min && ageN <= t.age_max);
  const open = fit.filter((t) => {
    const k = t.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return !have.has(k);
  });
  // If somehow exhausted bank, invent numbered extensions of fit topics (still real subjects)
  if (open.length >= limit) return open.slice(0, limit);
  const out = [...open];
  let n = 1;
  while (out.length < limit && n < 50) {
    const base = fit[(n - 1) % Math.max(1, fit.length)] || ENDLESS_TOPICS[n % ENDLESS_TOPICS.length];
    const title = `${base.title}: Part ${n + 1}`;
    const k = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!have.has(k) && !out.some((x) => x.title === title)) {
      out.push({
        ...base,
        title,
        content: `${base.content}\n\nPart ${n + 1}: Let's go a little deeper with more true examples and practice questions in class.`,
      });
    }
    n += 1;
  }
  return out.slice(0, limit);
}
