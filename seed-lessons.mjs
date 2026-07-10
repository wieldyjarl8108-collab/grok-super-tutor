/**
 * Default Super Tutor lesson library — mirrors BrightMind Learn.jsx + investing seeds.
 * Picture cards for kids. Investing lessons always include official disclaimer.
 */
import { withInvestingDisclaimer, STOCK_MARKET_DISCLAIMER } from './disclaimers.mjs';

export { STOCK_MARKET_DISCLAIMER };

const SUBJECT_COLORS = {
  animals: ['#f59e0b', '#b45309'],
  math: ['#3b82f6', '#1d4ed8'],
  science: ['#22c55e', '#15803d'],
  reading: ['#eab308', '#a16207'],
  history: ['#f97316', '#c2410c'],
  space: ['#6366f1', '#4338ca'],
  art: ['#ec4899', '#be185d'],
  coding: ['#a855f7', '#7e22ce'],
  geography: ['#14b8a6', '#0f766e'],
  health: ['#ef4444', '#b91c1c'],
  investing: ['#10b981', '#047857'],
  music: ['#14b8a6', '#0f766e'],
  life_skills: ['#f43f5e', '#be123c'],
  cooking: ['#fb923c', '#c2410c'],
  quantum: ['#818cf8', '#4f46e5'],
  general: ['#8b5cf6', '#6d28d9'],
};

/** Big colorful poster image (works offline — kids can see the topic). */
export function lessonPicture(emoji, subject, title) {
  const [c1, c2] = SUBJECT_COLORS[subject] || SUBJECT_COLORS.general;
  const safeTitle = String(title || 'Lesson')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 48);
  const safeEmoji = String(emoji || '📚');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="480" fill="url(#g)" rx="24"/>
  <circle cx="120" cy="80" r="60" fill="rgba(255,255,255,0.12)"/>
  <circle cx="700" cy="400" r="90" fill="rgba(255,255,255,0.1)"/>
  <text x="400" y="230" text-anchor="middle" font-size="140">${safeEmoji}</text>
  <text x="400" y="360" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${safeTitle}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function withPicture(lesson) {
  const picture = lesson.picture || lessonPicture(lesson.emoji, lesson.subject, lesson.title);
  const youngTarget = Number(lesson.age_max) <= 8 || Number(lesson.age_min) <= 5;
  const defaultDur = youngTarget ? 12 : 8;
  return {
    ...lesson,
    picture,
    duration_minutes: lesson.duration_minutes || defaultDur,
  };
}

/** Stable-ish id from title (for new packs) */
function slugId(title, subject) {
  const s = String(title || 'lesson')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `seed-${s}-${subject || 'general'}`;
}

export function defaultLessons() {
  const raw = [
    {
      title: 'Lions: Kings of the Savanna',
      subject: 'animals',
      emoji: '🦁',
      description: 'Meet the majestic lion and learn about pride life!',
      content:
        'Lions are big cats. They are the only cats that live in groups called prides. A pride can have many lions living and resting together.\n\nMale lions often have manes — that thick hair around the neck. A mane can make a lion look bigger and can help protect the neck. Lionesses (the girl lions) do much of the hunting as a team.\n\nLions sleep many hours a day. When they chase prey they can run about 50 mph (about 80 km/h) for a short time. They live in parts of Africa and eat meat. Baby lions are called cubs. Cubs play and learn by watching the adults.\n\nFun fact to remember: pride = lion family group. Cub = baby lion. Teamwork helps them find food.',
      age_min: 3,
      age_max: 12,
      difficulty: 'beginner',
      xp_reward: 12,
      duration_minutes: 12,
      questions: [
        { question: 'What do we call a group of lions?', options: ['Pack', 'Herd', 'Pride', 'Flock'], correct_index: 2, explanation: 'Lions live in groups called prides.' },
        { question: 'Why do male lions often have manes?', options: ['To stay warm only', 'To look bigger and help protect the pride', 'To attract food', 'It has no purpose'], correct_index: 1, explanation: 'Manes help males look larger and can protect the neck.' },
        { question: 'About how fast can lions run when hunting?', options: ['20 mph', '35 mph', '50 mph', '70 mph'], correct_index: 2, explanation: 'Lions can sprint around 50 mph for short bursts.' },
      ],
    },
    {
      title: 'Dolphins: Ocean Super Brains',
      subject: 'animals',
      emoji: '🐬',
      description: 'Why dolphins are among the smartest ocean animals!',
      content:
        'Dolphins are mammals, not fish — they breathe air with lungs. They live in the ocean in groups called pods. Dolphins use echolocation: they make clicking sounds and listen to the echoes to find food and objects underwater. They communicate with whistles and clicks. A baby dolphin is called a calf. Dolphins eat fish and other sea animals and often play near the surface.',
      age_min: 5,
      age_max: 14,
      difficulty: 'beginner',
      xp_reward: 12,
      questions: [
        { question: 'Are dolphins fish or mammals?', options: ['Fish', 'Mammals', 'Amphibians', 'Insects'], correct_index: 1, explanation: 'Dolphins are mammals that breathe air.' },
        { question: 'What do dolphins use to find food underwater?', options: ['Only eyes', 'Echolocation (sound clicks)', 'Smell like dogs', 'Taste only'], correct_index: 1, explanation: 'Echolocation uses sound echoes to locate things.' },
        { question: 'What is a baby dolphin called?', options: ['Pup', 'Calf', 'Foal', 'Kit'], correct_index: 1, explanation: 'A baby dolphin is a calf.' },
      ],
    },
    {
      title: 'Penguins: Birds That Swim',
      subject: 'animals',
      emoji: '🐧',
      description: 'Amazing birds that “fly” through water, not air!',
      content:
        'Penguins are birds — yes, real birds! But most penguins cannot fly in the air. Their wings work like flippers, so they swim very well. In water they look fast and graceful.\n\nMany penguins live in cold places such as Antarctica. Thick fat and dense feathers help them stay warm. On land they often waddle from side to side. It looks funny, but it works for ice and rocks.\n\nPenguins eat fish and tiny shrimp-like animals called krill. Parents care for eggs and chicks. Some penguin dads and moms take turns keeping a chick warm.\n\nRemember: penguin = bird that swims. Flipper-wings help in water. Fat and feathers keep them warm in the cold.',
      age_min: 3,
      age_max: 12,
      difficulty: 'beginner',
      xp_reward: 12,
      duration_minutes: 12,
      questions: [
        { question: 'Can most penguins fly in the air?', options: ['Yes', 'No, but they swim well', 'Only when young', 'Only in summer'], correct_index: 1, explanation: 'Most penguins cannot fly in air; they swim with flipper-wings.' },
        { question: 'What do many penguins eat?', options: ['Only plants', 'Fish and krill', 'Insects on land', 'Seeds'], correct_index: 1, explanation: 'Fish and krill are common penguin foods.' },
        { question: 'What helps penguins stay warm in cold places?', options: ['Bare skin', 'Fat and feathers', 'Metal coats', 'Fire'], correct_index: 1, explanation: 'Fat and dense feathers keep them warm.' },
      ],
    },
    {
      title: 'Elephants: Gentle Giants',
      subject: 'animals',
      emoji: '🐘',
      description: 'The largest land animals and their amazing trunks!',
      content:
        'Elephants are the largest living land animals. They are herbivores — they eat plants, bark, and fruit. An elephant’s trunk is very flexible and has tens of thousands of muscles. They use trunks to breathe, smell, grab food, drink, and show feelings. Elephants are social and often live in family groups led by an older female. A baby elephant is called a calf. They have strong memories and care for family members.',
      age_min: 5,
      age_max: 13,
      difficulty: 'beginner',
      xp_reward: 12,
      questions: [
        { question: 'What do elephants mainly eat?', options: ['Meat', 'Fish', 'Plants and fruit', 'Insects only'], correct_index: 2, explanation: 'Elephants are herbivores.' },
        { question: 'What is a baby elephant called?', options: ['Puppy', 'Calf', 'Foal', 'Joey'], correct_index: 1, explanation: 'A baby elephant is a calf.' },
        { question: 'What is special about an elephant’s trunk?', options: ['It is just decoration', 'It is very flexible with many muscles', 'It cannot move', 'It is made of wood'], correct_index: 1, explanation: 'Trunks have huge numbers of muscles and many uses.' },
      ],
    },
    {
      title: 'Butterflies: Metamorphosis',
      subject: 'animals',
      emoji: '🦋',
      description: 'How a caterpillar becomes a butterfly!',
      content:
        'Butterflies change through metamorphosis: egg → caterpillar (larva) → chrysalis (pupa) → adult butterfly. Adults often drink nectar from flowers with a long tongue-like tube called a proboscis. Their wing colors come from tiny scales. Butterflies help plants by moving pollen. Some species, like monarchs, migrate very long distances.',
      age_min: 5,
      age_max: 12,
      difficulty: 'beginner',
      xp_reward: 11,
      questions: [
        { question: 'What is the change from caterpillar to butterfly called?', options: ['Evolution only', 'Metamorphosis', 'Hibernation', 'Photosynthesis'], correct_index: 1, explanation: 'That life-cycle change is metamorphosis.' },
        { question: 'What do many adult butterflies drink from flowers?', options: ['Sand', 'Nectar', 'Wood', 'Plastic'], correct_index: 1, explanation: 'Nectar is a sugary liquid from flowers.' },
        { question: 'How can butterflies help plants?', options: ['By eating all roots', 'By spreading pollen', 'By blocking sun forever', 'By making metal'], correct_index: 1, explanation: 'Visiting flowers can move pollen between plants.' },
      ],
    },
    {
      title: 'Addition Adventure',
      subject: 'math',
      emoji: '➕',
      description: 'Combine numbers to find a total!',
      content:
        'Addition means putting amounts together. Let’s go slowly.\n\nIf you have 3 apples and get 2 more, you write 3 + 2 = 5. The answer is called the sum — that means the total.\n\nYou can solve addition many ways. You can count on your fingers: start at 3, then count 4, 5. You can use a number line: hop forward. You can make piles of toys and push them together.\n\nTry this story: Mia has 4 red blocks. Dad gives her 3 blue blocks. How many blocks does Mia have now? 4 + 3 = 7.\n\nAdding zero does not change a number: 7 + 0 = 7. Zero means “none more.”\n\nWhen numbers get bigger, group tens and ones. 10 + 5 is one ten and five ones, which is 15.\n\nPractice out loud: 2 + 2 = 4. 5 + 1 = 6. 6 + 3 = 9. Great work when you try!',
      age_min: 4,
      age_max: 8,
      difficulty: 'beginner',
      xp_reward: 12,
      duration_minutes: 12,
      questions: [
        { question: 'What is 3 + 4?', options: ['5', '6', '7', '8'], correct_index: 2, explanation: '3 + 4 = 7.' },
        { question: 'What is 5 + 2?', options: ['6', '7', '8', '9'], correct_index: 1, explanation: '5 + 2 = 7.' },
        { question: 'What is 10 + 5?', options: ['13', '14', '15', '16'], correct_index: 2, explanation: '10 + 5 = 15.' },
      ],
    },
    {
      title: 'Multiplication Magic',
      subject: 'math',
      emoji: '✖️',
      description: 'Fast adding in equal groups!',
      content:
        'Multiplication is repeated addition of equal groups. 3 × 4 means 3 groups of 4, which is 4 + 4 + 4 = 12. The × symbol means “times” or “groups of.” Learning times tables helps you solve bigger problems quickly. Multiplying by 1 leaves a number the same; multiplying by 0 gives 0.',
      age_min: 8,
      age_max: 12,
      difficulty: 'intermediate',
      xp_reward: 15,
      questions: [
        { question: 'What is 6 × 7?', options: ['40', '42', '44', '48'], correct_index: 1, explanation: '6 × 7 = 42.' },
        { question: 'What is 8 × 9?', options: ['63', '70', '72', '81'], correct_index: 2, explanation: '8 × 9 = 72.' },
        { question: 'What is 12 × 12?', options: ['122', '132', '144', '156'], correct_index: 2, explanation: '12 × 12 = 144.' },
      ],
    },
    {
      title: 'The Water Cycle',
      subject: 'science',
      emoji: '💧',
      description: 'How water moves from Earth to sky and back!',
      content:
        'Water moves in a cycle. The Sun heats water so some evaporates into vapor. Vapor rises, cools, and condenses into cloud droplets. Water falls as precipitation (rain, snow, sleet, or hail). It collects in rivers, lakes, oceans, and ground, then the cycle continues. This is real Earth science — water is reused again and again.',
      age_min: 7,
      age_max: 12,
      difficulty: 'beginner',
      xp_reward: 12,
      questions: [
        { question: 'What mainly causes water to evaporate?', options: ['The Moon alone', 'Heat from the Sun', 'Only wind', 'Only rocks'], correct_index: 1, explanation: 'Sunlight heats water so it can evaporate.' },
        { question: 'What is condensation?', options: ['Water becoming vapor', 'Vapor cooling into liquid droplets', 'Rocks melting', 'Wind stopping'], correct_index: 1, explanation: 'Condensation turns vapor into liquid droplets.' },
        { question: 'Rain and snow from clouds are called…', options: ['Evaporation', 'Photosynthesis', 'Precipitation', 'Gravity only'], correct_index: 2, explanation: 'Precipitation is water falling from clouds.' },
      ],
    },
    {
      title: 'Photosynthesis Explained',
      subject: 'science',
      emoji: '🌿',
      description: 'How plants make food from light!',
      content:
        'Plants make food using photosynthesis. They take in carbon dioxide from air, water from roots, and energy from sunlight. In leaves, chlorophyll helps turn these into sugars the plant can use. As a byproduct, plants release oxygen that animals (including humans) need to breathe. Photosynthesis mainly happens in leaves.',
      age_min: 9,
      age_max: 16,
      difficulty: 'intermediate',
      xp_reward: 15,
      questions: [
        { question: 'What gas do plants take from the air for photosynthesis?', options: ['Oxygen', 'Nitrogen only', 'Carbon dioxide', 'Helium'], correct_index: 2, explanation: 'Plants use carbon dioxide (CO₂).' },
        { question: 'Where does photosynthesis mainly happen?', options: ['Roots only', 'Stem only', 'Leaves', 'Flowers only'], correct_index: 2, explanation: 'Leaves hold most of the chlorophyll for light capture.' },
        { question: 'What useful gas do plants release?', options: ['Carbon dioxide only', 'Oxygen', 'Nitrogen gas only', 'Smoke'], correct_index: 1, explanation: 'Oxygen is released as a byproduct.' },
      ],
    },
    {
      title: 'The Magic of Stories',
      subject: 'reading',
      emoji: '📖',
      description: 'Parts of a story and how to read smarter!',
      content:
        'Most stories have characters (who), a setting (where and when), a problem or conflict, and a resolution (how it ends or changes). Good readers ask: Who is this about? Where are we? What is the problem? What happens next? Pictures can help, but words carry the full story. Practice reading out loud and talking about what you understood.',
      age_min: 5,
      age_max: 10,
      difficulty: 'beginner',
      xp_reward: 10,
      questions: [
        { question: 'What is the setting of a story?', options: ['Only the main character', 'Where and when it happens', 'Only the ending', 'Only the title'], correct_index: 1, explanation: 'Setting is where and when.' },
        { question: 'Which is a normal story part?', options: ['A problem or conflict', 'A random phone number required', 'A password', 'A bank code'], correct_index: 0, explanation: 'Stories often center on a problem or conflict.' },
        { question: 'What do good readers often do?', options: ['Never ask questions', 'Ask questions about the text', 'Skip every hard word always', 'Only look at page numbers'], correct_index: 1, explanation: 'Asking questions builds understanding.' },
      ],
    },
    {
      title: 'Ancient Egypt',
      subject: 'history',
      emoji: '🏺',
      description: 'Nile River, pharaohs, and pyramids!',
      content:
        'Ancient Egypt grew along the Nile River, which provided water and fertile soil. Pharaohs were rulers. Egyptians built huge stone monuments, including pyramids used as tombs for some rulers. They used a picture writing system called hieroglyphs. Historians learn this from archaeology and writings — not from myths alone. Always separate legend from evidence.',
      age_min: 8,
      age_max: 14,
      difficulty: 'beginner',
      xp_reward: 12,
      questions: [
        { question: 'Which river was essential to Ancient Egypt?', options: ['Amazon', 'Thames', 'Nile', 'Mississippi'], correct_index: 2, explanation: 'The Nile supported Egyptian civilization.' },
        { question: 'What were pyramids mainly used for?', options: ['Water slides', 'Tombs for some rulers', 'Airports', 'Soccer fields'], correct_index: 1, explanation: 'Many pyramids were royal tombs.' },
        { question: 'What is hieroglyphic writing based on?', options: ['Only numbers', 'Picture symbols', 'Morse code', 'Computer code only'], correct_index: 1, explanation: 'Hieroglyphs used picture symbols.' },
      ],
    },
    {
      title: 'Our Solar System',
      subject: 'space',
      emoji: '🪐',
      description: 'The Sun and the planets that orbit it!',
      content:
        'The solar system includes the Sun and objects that orbit it. The eight planets (in order from the Sun) are Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Earth is the only planet known to support human life. Planets orbit because of gravity. The Moon orbits Earth. Asteroids and comets are other solar-system objects. We learn this from telescopes, space missions, and physics — not from made-up stories.',
      age_min: 6,
      age_max: 14,
      difficulty: 'beginner',
      xp_reward: 12,
      questions: [
        { question: 'What is at the center of our solar system?', options: ['Earth', 'The Moon', 'The Sun', 'Jupiter'], correct_index: 2, explanation: 'The Sun is the central star.' },
        { question: 'How many planets are there in our solar system?', options: ['7', '8', '9', '12'], correct_index: 1, explanation: 'There are eight recognized planets.' },
        { question: 'Which force helps planets stay in orbit?', options: ['Magnetism only', 'Gravity', 'Wind', 'Sound'], correct_index: 1, explanation: 'Gravity keeps planets orbiting the Sun.' },
      ],
    },
    {
      title: 'World Continents',
      subject: 'geography',
      emoji: '🌍',
      description: 'The big land areas of Earth!',
      content:
        'Earth has large land areas called continents. Many maps teach seven continents: Africa, Antarctica, Asia, Europe, North America, South America, and Australia (sometimes Oceania is discussed as a region). Oceans cover most of Earth. Continents have different climates, plants, animals, and cultures. Maps and globes help us understand real places.',
      age_min: 6,
      age_max: 12,
      difficulty: 'beginner',
      xp_reward: 10,
      questions: [
        { question: 'How many continents do many school maps teach?', options: ['3', '5', '7', '20'], correct_index: 2, explanation: 'Seven continents are commonly taught.' },
        { question: 'What covers most of Earth’s surface?', options: ['Deserts only', 'Oceans', 'Cities only', 'Ice only'], correct_index: 1, explanation: 'Oceans cover most of Earth.' },
        { question: 'Which is a continent?', options: ['Pacific Ocean', 'Asia', 'Mount Everest only', 'The Moon'], correct_index: 1, explanation: 'Asia is a continent.' },
      ],
    },
    {
      title: 'Healthy Bodies Basics',
      subject: 'health',
      emoji: '💪',
      description: 'Sleep, food, water, and moving your body!',
      content:
        'Your body needs sleep, water, nutritious food, and movement. Fruits, vegetables, proteins, and whole grains help you grow and stay strong. Hands should be washed to reduce germs. Exercise strengthens muscles and heart health. This is general wellness information — not medical advice. If you feel sick, tell a parent or caregiver.',
      age_min: 5,
      age_max: 12,
      difficulty: 'beginner',
      xp_reward: 10,
      questions: [
        { question: 'What should you do if you feel sick?', options: ['Hide it forever', 'Tell a parent or caregiver', 'Eat only candy', 'Never rest'], correct_index: 1, explanation: 'Trusted adults help when you feel unwell.' },
        { question: 'Why wash hands?', options: ['To remove germs', 'To change skin color', 'To grow taller instantly', 'To stop sleeping'], correct_index: 0, explanation: 'Washing reduces germs you can spread or swallow.' },
        { question: 'What helps your body stay strong?', options: ['No sleep ever', 'Nutritious food, water, movement, sleep', 'Only sugar', 'Never drinking water'], correct_index: 1, explanation: 'Balanced basics support health.' },
      ],
    },
    {
      title: 'What Is Coding?',
      subject: 'coding',
      emoji: '💻',
      description: 'Instructions computers can follow!',
      content:
        'Coding means writing clear instructions a computer can follow. A program is a list of steps. Computers only do what instructions say — they do not “guess” like people. Sequences (step order), loops (repeat), and conditions (if this, then that) are basic ideas. Real coding uses languages like Python or JavaScript. Mistakes are normal; debugging means finding and fixing errors carefully.',
      age_min: 8,
      age_max: 14,
      difficulty: 'beginner',
      xp_reward: 12,
      questions: [
        { question: 'What is coding?', options: ['Only drawing pictures', 'Writing instructions for computers', 'Only playing games', 'Only charging batteries'], correct_index: 1, explanation: 'Coding writes instructions computers run.' },
        { question: 'What is a loop?', options: ['A type of sandwich', 'A way to repeat steps', 'A broken screen', 'A password'], correct_index: 1, explanation: 'Loops repeat instructions.' },
        { question: 'What is debugging?', options: ['Deleting the computer', 'Finding and fixing errors', 'Turning off gravity', 'Painting the keyboard'], correct_index: 1, explanation: 'Debugging fixes program errors.' },
      ],
    },
    // ── From BrightMind Learn.jsx (kept) ──
    {
      title: 'Colors & Emotions in Art', subject: 'art', emoji: '🎨',
      description: 'How artists use color to express feelings',
      content: 'Colors have feelings! 🌈 RED = energy, passion, danger. BLUE = calm, sadness, peace. YELLOW = happiness, warmth. GREEN = nature, growth. Purple = mystery, royalty. Artists choose colors carefully to make you FEEL something when you look at their art.',
      age_min: 5, age_max: 12, difficulty: 'beginner', xp_reward: 10, duration_minutes: 5,
      questions: [
        { question: 'What emotion is most associated with the color red?', options: ['Sadness', 'Energy & Passion', 'Calm', 'Mystery'], correct_index: 1, explanation: 'Red represents energy, passion, and sometimes danger!' },
        { question: 'Which color is associated with calm and peace?', options: ['Yellow', 'Red', 'Blue', 'Orange'], correct_index: 2, explanation: 'Blue is a calm, peaceful color!' },
        { question: 'Why do artists choose specific colors?', options: ['Random chance', 'To create feelings in viewers', 'Because they are cheap', 'Because of rules'], correct_index: 1, explanation: 'Artists use color intentionally to evoke emotions!' },
      ],
    },
    {
      title: 'Reading Music Notes', subject: 'music', emoji: '🎵',
      description: 'Learn to read the language of music!',
      content: 'Music is a language! 🎼 Notes sit on a staff (5 lines). Higher notes = higher position. The treble clef is for higher-pitched instruments. Notes have durations: whole note (4 beats), half note (2 beats), quarter note (1 beat). Musical alphabet: A B C D E F G — then repeats!',
      age_min: 7, age_max: 14, difficulty: 'beginner', xp_reward: 12, duration_minutes: 7,
      questions: [
        { question: 'How many lines are in a musical staff?', options: ['3', '4', '5', '6'], correct_index: 2, explanation: 'A musical staff has exactly 5 lines!' },
        { question: 'How many beats does a whole note get?', options: ['1', '2', '3', '4'], correct_index: 3, explanation: 'A whole note gets 4 beats!' },
        { question: 'What letters make up the musical alphabet?', options: ['A-G', 'A-Z', 'A-H', 'C-G'], correct_index: 0, explanation: 'The musical alphabet is A through G — then repeats!' },
      ],
    },
    {
      title: 'Healthy Habits for Life', subject: 'life_skills', emoji: '💪',
      description: 'Building good habits that last a lifetime',
      content: 'Great health = Body + Mind! 🧠💪\n• SLEEP: Kids need 9-12 hours. Sleep helps your brain learn and grow!\n• EXERCISE: 60 min/day makes your heart strong\n• FOOD: Eat the rainbow 🌈 — colorful fruits & veggies = nutrients\n• WATER: Drink 6-8 glasses daily\n• MINDFULNESS: Take 5 deep breaths when stressed',
      age_min: 6, age_max: 16, difficulty: 'beginner', xp_reward: 10, duration_minutes: 6,
      questions: [
        { question: 'How many hours of sleep do kids need per night?', options: ['6-7 hours', '9-12 hours', '4-5 hours', '13+ hours'], correct_index: 1, explanation: 'Kids need 9-12 hours of sleep for healthy development!' },
        { question: 'How much physical activity should kids get daily?', options: ['15 minutes', '30 minutes', '60 minutes', '2 hours'], correct_index: 2, explanation: '60 minutes of daily activity keeps you strong and healthy!' },
        { question: 'What does "eating the rainbow" mean?', options: ['Eating only colorful candy', 'Eating colorful fruits and vegetables', 'Eating only red food', 'Eating paint'], correct_index: 1, explanation: 'Colorful fruits and veggies = a wide range of nutrients!' },
      ],
    },
    {
      title: 'Fractions Made Fun', subject: 'math', emoji: '🍕',
      description: 'Understand fractions with pizza!',
      content: 'Fractions are parts of a whole! 🍕 If you cut a pizza into 4 slices and eat 1, you ate 1/4 (one quarter). The BOTTOM number (denominator) = total pieces. The TOP number (numerator) = pieces you have. 1/2 = one half, 1/4 = one quarter, 3/4 = three quarters!',
      age_min: 7, age_max: 11, difficulty: 'intermediate', xp_reward: 15, duration_minutes: 8,
      questions: [
        { question: 'In the fraction 3/4, what does the 4 represent?', options: ['Number you have', 'Total equal parts', 'How many you ate', 'The whole number'], correct_index: 1, explanation: 'The denominator (bottom) is the total number of equal parts!' },
        { question: 'Which fraction is bigger: 1/2 or 1/4?', options: ['1/4', '1/2', 'They are equal', 'Cannot tell'], correct_index: 1, explanation: '1/2 is bigger — half a pizza is more than a quarter!' },
        { question: 'What is 1/2 + 1/2?', options: ['1/4', '2/4', '1', '2/2'], correct_index: 2, explanation: '1/2 + 1/2 = 2/2 = 1 whole!' },
      ],
    },
    {
      title: 'How Rockets Work', subject: 'space', emoji: '🚀',
      description: 'Discover how rockets blast into space!',
      content: '🚀 Rockets work using Newton\'s 3rd Law: "Every action has an equal and opposite reaction!" When a rocket burns fuel, hot gases shoot downward — pushing the rocket UP!\n\nRockets need huge amounts of fuel to escape Earth\'s gravity. They have stages — sections that fall away once their fuel is used up, making the rocket lighter.\n\nModern reusable rockets can land boosters to fly again after careful engineering tests.',
      age_min: 7, age_max: 16, difficulty: 'beginner', xp_reward: 15, duration_minutes: 8,
      questions: [
        { question: 'What law of physics explains how rockets move?', options: ['Newton\'s 1st Law', 'Newton\'s 2nd Law', 'Newton\'s 3rd Law', 'Law of Gravity'], correct_index: 2, explanation: 'Newton\'s 3rd Law: gases go down, rocket goes up!' },
        { question: 'Why do rockets have multiple stages?', options: ['To look cool', 'To carry more passengers', 'To drop empty fuel tanks and get lighter', 'To go slower'], correct_index: 2, explanation: 'Dropping empty stages makes the rocket lighter!' },
        { question: 'What do fins on a rocket often help with?', options: ['Make it silent', 'Stabilize during flight', 'Hold extra passengers only', 'Turn off gravity'], correct_index: 1, explanation: 'Fins help stabilize direction during flight.' },
      ],
    },
    {
      title: 'Astronauts in Space', subject: 'space', emoji: '👨‍🚀',
      description: 'What is life like floating in space?',
      content: '👨‍🚀 Astronauts on the International Space Station (ISS) float because they are in microgravity — constant free-fall around Earth!\n\nThe ISS orbits Earth very fast — astronauts see many sunrises each day.\n\nLife in space is different: drinks in pouches, sleep bags on walls, exercise so muscles stay strong, sponge baths instead of showers. Astronauts run science experiments that help people on Earth.',
      age_min: 6, age_max: 14, difficulty: 'beginner', xp_reward: 12, duration_minutes: 7,
      questions: [
        { question: 'Why do astronauts float in the ISS?', options: ['There is no air', 'They are in microgravity (free-fall)', 'The ISS has no floor', 'Space has no temperature'], correct_index: 1, explanation: 'Microgravity from free-fall around Earth makes them float!' },
        { question: 'Why must astronauts exercise a lot in space?', options: ['They are bored', 'To prevent muscles from shrinking', 'For fun only', 'Mission fashion'], correct_index: 1, explanation: 'Without normal gravity loading, muscles weaken — exercise helps!' },
        { question: 'Where do many astronauts live and work in orbit?', options: ['Only on the Moon base always', 'The International Space Station (ISS)', 'Only underwater', 'Only in airplanes'], correct_index: 1, explanation: 'The ISS is a major orbiting lab and home for crews.' },
      ],
    },
    {
      title: 'Black Holes & Galaxies', subject: 'space', emoji: '🌌',
      description: 'Explore mysterious objects in the universe!',
      content: '🌌 Galaxies are huge collections of stars, gas, and dust. Our galaxy is the Milky Way with hundreds of billions of stars.\n\nBlack holes are regions where gravity is so strong that not even light can escape. They can form when very massive stars collapse.\n\nA light-year is how far light travels in one year — a huge distance used to measure space. Telescopes help us study galaxies far away.',
      age_min: 9, age_max: 16, difficulty: 'intermediate', xp_reward: 18, duration_minutes: 9,
      questions: [
        { question: 'What is our galaxy called?', options: ['Andromeda only', 'The Milky Way', 'The Big Dipper', 'Orion only'], correct_index: 1, explanation: 'We live in the Milky Way galaxy!' },
        { question: 'What makes a black hole special?', options: ['It is always very bright', 'Gravity so strong nothing can escape, not even light', 'It is made of ice cream', 'It has no mass'], correct_index: 1, explanation: 'Extreme gravity — even light cannot escape.' },
        { question: 'What is a light-year?', options: ['A bright year on Earth', 'The distance light travels in one year', 'A unit of temperature', 'A type of planet'], correct_index: 1, explanation: 'A light-year measures distance, not time.' },
      ],
    },
    {
      title: 'Quantum Physics Class',
      subject: 'quantum',
      emoji: '⚛️',
      description: 'True basics of quantum physics — atoms, light packets, and why the tiny world is strange (but real).',
      content:
        'Quantum physics is the science of the very small: atoms, electrons, and particles of light called photons. “Quantum” means a smallest packet. Energy often comes in those packets, not as any amount you want.\n\nLight can behave like a wave (spread out patterns) and like a particle (little packets). That dual picture is supported by many careful experiments — it is not magic, and it is not “anything goes.”\n\nElectrons around atoms do not orbit like tiny planets on free paths. They occupy allowed energy levels. When an electron changes level, it can absorb or emit a photon with a matching energy.\n\nScientists use probability and math to predict measurement outcomes. That does not mean “belief creates reality” for everyday objects. Your desk does not behave like a single electron. Quantum ideas matter a lot for chips, lasers, MRI magnets, and LED light.\n\nWe keep this class honest: quantum physics is real, tested science. We simplify language, not the truth.',
      age_min: 10,
      age_max: 16,
      difficulty: 'intermediate',
      xp_reward: 20,
      duration_minutes: 12,
      questions: [
        {
          question: 'What does “quantum” often mean in physics?',
          options: ['A magic spell', 'A smallest packet of something (like energy)', 'Only a video game mode', 'A type of dinosaur'],
          correct_index: 1,
          explanation: 'A quantum is a discrete packet — energy comes in steps, not any random amount.',
        },
        {
          question: 'What are photons?',
          options: ['Tiny packets of light', 'Only rain drops', 'Only sound waves', 'Planets'],
          correct_index: 0,
          explanation: 'Photons are particles (packets) of light energy.',
        },
        {
          question: 'Which statement is true?',
          options: [
            'Quantum physics is fake science made for movies',
            'Quantum physics is real, tested science of the very small',
            'Your whole desk jumps randomly like an electron all day',
            'Quantum means “anything you believe becomes true”',
          ],
          correct_index: 1,
          explanation: 'It is experimental science about atoms, light, and tiny particles — not movie magic.',
        },
      ],
    },
    // ── Investing (BrightMind seeds + official disclaimer — do not remove) ──
    {
      title: 'What is Money?', subject: 'investing', emoji: '💵',
      description: 'Where does money come from and why does it have value?',
      content: withInvestingDisclaimer('💵 Money is anything people agree has value! Long ago, people traded chickens for bread — that\'s called "barter." But carrying chickens everywhere was hard!\n\nSo humans invented money — first as gold and silver coins, then paper bills, now digital numbers on a screen!\n\n🔑 Money has three jobs:\n1️⃣ MEDIUM OF EXCHANGE — makes trading easy\n2️⃣ STORE OF VALUE — you can save it for later\n3️⃣ UNIT OF ACCOUNT — lets us measure prices\n\nToday\'s money is called "fiat currency" — it has value because the government says so and everyone agrees! The US Dollar, Euro, and Yen are all fiat currencies.'),
      age_min: 8, age_max: 16, difficulty: 'beginner', xp_reward: 10, duration_minutes: 6,
      questions: [
        { question: 'What is "barter"?', options: ['Using coins to buy things', 'Trading goods directly without money', 'A type of bank', 'Saving money'], correct_index: 1, explanation: 'Barter means trading things directly — like chickens for bread!' },
        { question: 'What are the 3 jobs of money?', options: ['Earn, Spend, Lose', 'Medium of exchange, store of value, unit of account', 'Print, Save, Spend', 'Gold, Silver, Paper'], correct_index: 1, explanation: 'Money lets us trade, save, and measure prices!' },
        { question: 'What is "fiat currency"?', options: ['Money made of gold', 'A type of car', 'Money that has value because everyone agrees it does', 'Digital coins'], correct_index: 2, explanation: 'Fiat money works because governments and people agree on its value!' },
      ],
    },
    {
      title: 'What is a Stock?', subject: 'investing', emoji: '📊',
      description: 'Learn how owning a piece of a company works!',
      content: withInvestingDisclaimer('📊 Imagine your friend wants to open a lemonade stand but needs $100 to start. You give her $50 and your other friend gives $50. Now you BOTH own 50% of the lemonade stand!\n\nThat\'s exactly how stocks work! 🍋\n\n🏢 A STOCK is a tiny piece of ownership in a real company. When you buy a stock, you become a part-owner (called a SHAREHOLDER).\n\nIf the lemonade stand makes a profit, you get a share of it! If it fails... you could lose your $50.\n\n📈 Why do companies sell stocks? To raise money to grow! Apple, Disney, and McDonald\'s all have millions of people who own tiny pieces of them.\n\nThe price of a stock goes UP when more people want to buy it, and DOWN when more people want to sell.'),
      age_min: 9, age_max: 16, difficulty: 'beginner', xp_reward: 15, duration_minutes: 8,
      questions: [
        { question: 'What does it mean to own a stock?', options: ['You lend money to a company', 'You own a tiny piece of a company', 'You work for a company', 'You borrow from a company'], correct_index: 1, explanation: 'A stock = ownership! Shareholders are part-owners of the company.' },
        { question: 'What is a shareholder?', options: ['Someone who sells stocks', 'A company employee', 'A person who owns stock in a company', 'A bank manager'], correct_index: 2, explanation: 'Shareholders own shares (stocks) and are part-owners!' },
        { question: 'Why do stock prices go up?', options: ['The company prints more stocks', 'More people want to buy the stock than sell', 'The government raises the price', 'Stocks always go up'], correct_index: 1, explanation: 'Prices rise when demand (buyers) exceeds supply (sellers)!' },
      ],
    },
    {
      title: 'Why Markets Go Up & Down', subject: 'investing', emoji: '🎢',
      description: 'Understand what makes prices rise and fall!',
      content: withInvestingDisclaimer('🎢 Stock prices are like a giant auction happening every second! Millions of people are constantly buying and selling.\n\n📰 Here\'s what makes prices MOVE:\n\n🟢 PRICES GO UP when:\n• The company makes more profit than expected\n• Good news (new product launch, big contract)\n• People feel confident about the economy\n• Lots of buyers but few sellers\n\n🔴 PRICES GO DOWN when:\n• The company earns less money\n• Bad news (lawsuit, product failure, scandal)\n• People are scared or uncertain\n• Lots of sellers but few buyers\n\n😨 Fear vs. Greed: When people are GREEDY, they rush to buy → prices rise. When people are FEARFUL, they rush to sell → prices fall. Smart investors try not to let emotions control them!\n\nThis is why the news affects the stock market — information changes what people think a company is worth!'),
      age_min: 10, age_max: 16, difficulty: 'intermediate', xp_reward: 18, duration_minutes: 9,
      questions: [
        { question: 'What usually makes a stock price go UP?', options: ['Bad company news', 'More sellers than buyers', 'Good news and strong profits', 'The government'], correct_index: 2, explanation: 'Good earnings and positive news attract more buyers, pushing prices up!' },
        { question: 'What emotion causes people to sell stocks quickly, crashing prices?', options: ['Greed', 'Happiness', 'Fear', 'Boredom'], correct_index: 2, explanation: 'Fear causes panic selling — everyone rushes for the exit at once!' },
        { question: 'Why does news affect stock prices?', options: ['It doesn\'t', 'News changes what people think a company is worth', 'Only financial news matters', 'News is fake'], correct_index: 1, explanation: 'Information changes investor expectations, which changes prices!' },
      ],
    },
    {
      title: 'What is Cryptocurrency?', subject: 'investing', emoji: '₿',
      description: 'Digital money explained — Bitcoin, Ethereum & more!',
      content: withInvestingDisclaimer('₿ Cryptocurrency is digital money that exists only on computers — no coins, no paper bills! It was invented in 2009 by someone named "Satoshi Nakamoto" with Bitcoin.\n\n🔐 The secret sauce: BLOCKCHAIN technology! Every transaction is recorded in a public list (like a giant receipt book) that thousands of computers check simultaneously. Nobody can fake it!\n\n🌟 Key cryptos to know:\n• BITCOIN (BTC) — the original, often called "digital gold"\n• ETHEREUM (ETH) — powers apps and "smart contracts"\n• Many others: Dogecoin, Solana, etc.\n\n⚠️ Why is crypto so VOLATILE (up and down a lot)?\n• It\'s still new — people disagree on its true value\n• Less regulated than regular money\n• Smaller market = big swings with big buyers/sellers\n• News and tweets can move prices dramatically!\n\nCrypto can double in a week... or drop 50%. Always remember: NEVER invest money you can\'t afford to lose!'),
      age_min: 11, age_max: 16, difficulty: 'intermediate', xp_reward: 18, duration_minutes: 10,
      questions: [
        { question: 'What technology makes cryptocurrency secure?', options: ['The internet', 'Blockchain', 'Banks', 'The government'], correct_index: 1, explanation: 'Blockchain is a shared public record checked by thousands of computers!' },
        { question: 'Which cryptocurrency was the FIRST ever created?', options: ['Ethereum', 'Dogecoin', 'Bitcoin', 'Solana'], correct_index: 2, explanation: 'Bitcoin was created in 2009 and is the original cryptocurrency!' },
        { question: 'Why is crypto more volatile than stocks?', options: ['It\'s more popular', 'It\'s newer, less regulated, and has a smaller market', 'Crypto never goes down', 'Only one person controls it'], correct_index: 1, explanation: 'Smaller markets + less regulation = bigger price swings in crypto!' },
      ],
    },
    {
      title: 'Diversification — Don\'t Put All Eggs in One Basket!', subject: 'investing', emoji: '🧺',
      description: 'The golden rule of smart investing',
      content: withInvestingDisclaimer('🧺 Imagine you have $100. You put ALL of it into one lemonade stand. A storm comes and destroys the stand. You lose everything! 😭\n\nBut what if you split it?\n• $25 in the lemonade stand\n• $25 in a cookie shop\n• $25 in a pizza place\n• $25 in a toy store\n\nIf the storm destroys the lemonade stand, you still have $75 left! That\'s DIVERSIFICATION!\n\n📈 In the real world:\n• Don\'t buy just 1 stock — buy many\n• Mix different types: stocks, crypto, bonds, real estate\n• Mix different industries: tech, food, healthcare, energy\n\n🔑 The rule: If one investment fails, others can make up for it!\n\nIndex funds are a popular way to auto-diversify — they own tiny pieces of hundreds of companies at once. Warren Buffett (one of the richest investors ever) recommends index funds for most people!'),
      age_min: 10, age_max: 16, difficulty: 'intermediate', xp_reward: 15, duration_minutes: 8,
      questions: [
        { question: 'What does "diversification" mean in investing?', options: ['Putting all money in one stock', 'Spreading money across many different investments', 'Only buying crypto', 'Saving in a bank only'], correct_index: 1, explanation: 'Diversification = spreading risk across many investments!' },
        { question: 'What is an "index fund"?', options: ['A savings account', 'A fund that owns tiny pieces of hundreds of companies', 'A type of crypto', 'A government bond'], correct_index: 1, explanation: 'Index funds auto-diversify by holding small pieces of many companies!' },
        { question: 'Why is diversification the "golden rule" of investing?', options: ['It guarantees profits', 'If one investment fails, others can make up for it', 'It\'s required by law', 'It makes you rich fast'], correct_index: 1, explanation: 'Diversification protects you from losing everything if one investment fails!' },
      ],
    },
    {
      title: 'The Power of Compound Interest', subject: 'investing', emoji: '🌱',
      description: 'How your money can grow on its own over time!',
      content: withInvestingDisclaimer('🌱 Compound interest is one of the most powerful forces in money — Albert Einstein called it the "eighth wonder of the world!"\n\nHere\'s how it works:\n💰 You put $100 in an account earning 10% per year.\n• Year 1: $100 → $110 (earned $10)\n• Year 2: $110 → $121 (earned $11 — more than before!)\n• Year 3: $121 → $133.10 (earning MORE each year!)\n\n🚀 The secret: you earn interest on your interest! Your money makes MORE money automatically!\n\nIf you invest just $1,000 at age 10 and never touch it:\n• At age 20 → ~$2,594\n• At age 40 → ~$17,449\n• At age 65 → ~$117,390!\n\n⏰ TIME IS YOUR SUPERPOWER! The younger you start investing, the more time compound interest has to work its magic. Starting at 20 vs. 30 can mean DOUBLE the retirement savings!\n\nThis is why smart investors say: "The best time to invest was yesterday. The second best time is today."'),
      age_min: 10, age_max: 16, difficulty: 'intermediate', xp_reward: 20, duration_minutes: 10,
      questions: [
        { question: 'What makes compound interest special?', options: ['It\'s guaranteed', 'You earn interest on your interest', 'Banks give it for free', 'It only works with crypto'], correct_index: 1, explanation: 'Compound interest means your interest earns MORE interest — snowball effect!' },
        { question: 'Why does starting young matter so much in investing?', options: ['Young people get better rates', 'More time = more compounding = way more money', 'It\'s required by law', 'Young people are smarter'], correct_index: 1, explanation: 'Time is the key ingredient — the longer you wait, the slower compound interest works!' },
        { question: 'Who called compound interest the "eighth wonder of the world"?', options: ['Elon Musk', 'Warren Buffett', 'Albert Einstein', 'Isaac Newton'], correct_index: 2, explanation: 'Albert Einstein reportedly called compound interest the eighth wonder of the world!' },
      ],
    },

    // ═══════════════════════════════════════════════════════════
    // YOUNG KIDS PACK (ages 3–8) — more lessons, longer class time
    // ═══════════════════════════════════════════════════════════
    ...youngKidsLessonPack(),
  ];

  // Stable IDs from title+subject (never index-based — index shifts create duplicates)
  return raw.map((l) =>
    withPicture({
      ...l,
      id: l.id || slugId(l.title, l.subject),
      seeded: true,
      createdAt: l.createdAt || new Date().toISOString(),
    })
  );
}

/**
 * Extra lessons for little learners — longer, gentle, true, picture-friendly.
 */
function youngKidsLessonPack() {
  const q = (question, options, correct_index, explanation) => ({
    question, options, correct_index, explanation,
  });

  const pack = [
    {
      title: 'Counting 1 to 10',
      subject: 'math',
      emoji: '🔢',
      description: 'Count slowly with me — fingers, toys, and stars!',
      content:
        'Counting means saying numbers in order. Let’s go slowly: one, two, three, four, five, six, seven, eight, nine, ten!\n\nYou can count fingers on your hands. Hold up one finger for 1. Hold up two for 2. When both hands show all fingers, that is 10.\n\nTry counting toys on a table. Touch each toy once. Do not skip. Do not count the same toy twice. That is careful counting.\n\nNumbers tell us “how many.” If you have 3 cars and 2 more cars, you can count all of them: 1, 2, 3, 4, 5.\n\nPractice rhyme: 1 little, 2 little, 3 little numbers — all the way to 10. When you finish, smile — your brain is growing!\n\nRemember: count in order, touch each thing once, and stop when you are done.',
      age_min: 3, age_max: 6, difficulty: 'beginner', xp_reward: 10, duration_minutes: 12,
      questions: [
        q('What number comes after 3?', ['2', '4', '6', '1'], 1, 'After 3 comes 4.'),
        q('How many fingers on one hand for most kids?', ['3', '5', '10', '2'], 1, 'Most hands have 5 fingers.'),
        q('When you count toys, you should…', ['Skip some', 'Touch each once carefully', 'Count the same toy ten times', 'Never look'], 1, 'Careful counting means once each.'),
      ],
    },
    {
      title: 'Shapes All Around Us',
      subject: 'math',
      emoji: '⬛',
      description: 'Circles, squares, triangles — find them in your room!',
      content:
        'Shapes are everywhere. A circle is round like a ball or a plate. A square has four equal sides, like many tiles or crackers. A triangle has three sides, like a slice of pizza or a roof tip.\n\nA rectangle has four sides too, but two long and two short — like a door or a book.\n\nLook around the room. Can you find a circle? A square? A triangle? Point to them with your finger. Saying the name out loud helps your brain remember.\n\nShapes can be big or small. A button can be a circle. The moon can look like a circle in the sky. Same shape, different size.\n\nArtists and builders use shapes. Houses use rectangles. Wheels use circles. Road signs often use triangles and octagons.\n\nRemember: circle = round, square = four equal sides, triangle = three sides.',
      age_min: 3, age_max: 7, difficulty: 'beginner', xp_reward: 10, duration_minutes: 12,
      questions: [
        q('How many sides does a triangle have?', ['2', '3', '4', '5'], 1, 'Triangle means three sides.'),
        q('A circle is…', ['Pointy', 'Round', 'Only square', 'Only a line'], 1, 'Circles are round.'),
        q('A square has how many equal sides?', ['3', '4', '1', '8'], 1, 'A square has four equal sides.'),
      ],
    },
    {
      title: 'More and Less',
      subject: 'math',
      emoji: '⚖️',
      description: 'Which pile is bigger? Which is smaller?',
      content:
        'More means a bigger amount. Less means a smaller amount. Same means equal — not more, not less.\n\nIf you have 5 grapes and your friend has 2 grapes, you have more. Your friend has less.\n\nYou can line things up to compare. Put snacks in two rows. See which row is longer. The longer row has more.\n\nStory time: Sam has 3 stickers. Jo has 6 stickers. Who has more? Jo. Who has less? Sam.\n\nWhen numbers match — 4 and 4 — they are the same. Nobody has more.\n\nPractice: clap 2 times, then clap 5 times. Which was more claps? Five. Great comparing!',
      age_min: 3, age_max: 6, difficulty: 'beginner', xp_reward: 10, duration_minutes: 11,
      questions: [
        q('Which is more: 2 or 5?', ['2', '5', 'Same', 'Zero'], 1, '5 is more than 2.'),
        q('Same means…', ['Bigger always', 'Equal amounts', 'Nothing', 'Only zero'], 1, 'Same means equal.'),
        q('If you have 1 toy and a friend has 4, who has less?', ['Friend', 'You', 'Both more', 'Neither'], 1, '1 is less than 4.'),
      ],
    },
    {
      title: 'Letters and Sounds',
      subject: 'reading',
      emoji: '🔤',
      description: 'A, B, C — letters make sounds we can say!',
      content:
        'Letters are symbols we use for reading and writing. The alphabet starts A, B, C… and goes all the way to Z.\n\nEach letter can stand for a sound. Letter M often says “mmm,” like in mom. Letter S often says “sss,” like in sun.\n\nWhen we put letter sounds together, we build words. C-A-T can become cat. That is reading!\n\nPractice slowly. Point to a letter. Say its name. Say its sound. Clap when you get it right.\n\nBooks are made of letters put into words, then sentences. Every page you look at helps your reading brain grow.\n\nRemember: letters → sounds → words → stories.',
      age_min: 3, age_max: 7, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('What do letters help us do?', ['Only jump', 'Read and write', 'Only sleep', 'Only draw circles'], 1, 'Letters are for reading and writing.'),
        q('Sounds of letters can build…', ['Words', 'Clouds only', 'Metal', 'Nothing'], 0, 'Sounds join to make words.'),
        q('The alphabet starts with…', ['Z', 'A', 'M', 'Q'], 1, 'A is first.'),
      ],
    },
    {
      title: 'Rhyming Words Are Fun',
      subject: 'reading',
      emoji: '🎤',
      description: 'Cat, hat, bat — words that sound the same at the end!',
      content:
        'Rhyming words sound the same at the end. Cat rhymes with hat. Hat rhymes with bat. Fun!\n\nListen carefully to the ending sound. Dog and log rhyme. Sun and run rhyme. Blue and shoe rhyme.\n\nSongs and poems use rhymes so they feel musical. Your brain loves patterns. Rhymes are sound patterns.\n\nGame: I say “cake.” You think of a rhyme — maybe “lake” or “bake.” There can be more than one right answer.\n\nNot all words rhyme. Cat and dog do not rhyme. That is okay — comparing helps you hear the difference.\n\nPractice out loud with a parent: tree / bee / free. You are training your reading ears!',
      age_min: 4, age_max: 7, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('Which rhymes with cat?', ['Hat', 'Cup', 'Book', 'Fish'], 0, 'Hat ends like cat.'),
        q('Rhyming words sound the same…', ['At the start only', 'At the end', 'Never', 'Only in numbers'], 1, 'Rhymes match ending sounds.'),
        q('Do cat and dog rhyme?', ['Yes', 'No', 'Always', 'Only on Mondays'], 1, 'Different endings — not a rhyme.'),
      ],
    },
    {
      title: 'Feelings We All Have',
      subject: 'life_skills',
      emoji: '😊',
      description: 'Happy, sad, mad, calm — name your feelings!',
      content:
        'Feelings are real. Happy, sad, mad, scared, calm, and excited are all normal feelings kids (and adults) have.\n\nIt helps to name the feeling. You can say, “I feel sad,” or “I feel excited.” Naming a feeling is smart, not weak.\n\nBodies give clues. A smile can mean happy. Tears can mean sad. A fast heart can mean scared or excited.\n\nWhen feelings get big, try: take three slow breaths. Tell a trusted adult. Squeeze a pillow. Ask for a hug if you want one.\n\nOther people have feelings too. If a friend is sad, you can be kind. Kindness helps everyone.\n\nRemember: all feelings are okay. What we do with them matters. Safe choices help.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('Is it okay to feel sad sometimes?', ['No never', 'Yes, feelings are normal', 'Only adults', 'Only on holidays'], 1, 'Everyone has sad days sometimes.'),
        q('What can help when feelings get big?', ['Three slow breaths and a trusted adult', 'Break things', 'Hide forever', 'Never talk'], 0, 'Breathing and trusted adults help.'),
        q('Naming a feeling is…', ['Silly only', 'Smart and helpful', 'Not allowed', 'Only for teachers'], 1, 'Naming feelings helps your brain.'),
      ],
    },
    {
      title: 'Sharing and Taking Turns',
      subject: 'life_skills',
      emoji: '🤝',
      description: 'Friends wait, share, and play fair!',
      content:
        'Sharing means letting someone use something with you or after you. Taking turns means one person goes, then another person goes.\n\nWaiting can feel hard. That is normal. You can count slowly, sing a tiny song, or watch the timer.\n\nWhen two friends want the same toy, fair choices help: take turns, play together, or pick another toy for a while.\n\nWords help: “Can I have a turn when you finish?” Kind words work better than grabbing.\n\nIf someone shares with you, say “thank you.” Gratitude makes play feel good.\n\nRemember: taking turns is a superpower for friends.',
      age_min: 3, age_max: 7, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('Taking turns means…', ['Only one person forever', 'One person, then another', 'Grabbing first', 'Never playing'], 1, 'Turns go one after another.'),
        q('A kind thing to say is…', ['Give it now only', 'Can I have a turn when you finish?', 'Never talk', 'Mine forever always'], 1, 'Polite words help.'),
        q('If a friend shares, you can say…', ['Thank you', 'Nothing ever', 'No', 'Only goodbye'], 0, 'Thank you shows kindness.'),
      ],
    },
    {
      title: 'My Five Senses',
      subject: 'science',
      emoji: '👀',
      description: 'See, hear, smell, taste, touch — how we learn about the world!',
      content:
        'You have five main senses. Seeing uses your eyes. Hearing uses your ears. Smelling uses your nose. Tasting uses your tongue. Touching uses your skin — especially fingers.\n\nSenses help keep you safe. You see a red light. You hear a car. You smell smoke and tell an adult. You feel something hot and move away carefully.\n\nSenses also make life fun. You hear music. You taste a sweet strawberry. You see colors in a rainbow. You feel soft blankets.\n\nNot everyone senses the same way. Some people use glasses. Some people use hearing aids. That is okay — brains and bodies are different.\n\nTry a sense walk: name one thing you see, one you hear, one you can touch gently.\n\nRemember: five senses help you learn about the world.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('Which sense uses your ears?', ['Taste', 'Hearing', 'Smell', 'Sight'], 1, 'Ears are for hearing.'),
        q('How many main senses do we usually learn?', ['2', '5', '10', '20'], 1, 'Five main senses.'),
        q('Touch mostly uses…', ['Only hair', 'Skin and fingers', 'Only teeth', 'Only elbows'], 1, 'Skin senses touch.'),
      ],
    },
    {
      title: 'Day and Night',
      subject: 'science',
      emoji: '🌙',
      description: 'Why we have sunny days and dark nights!',
      content:
        'Earth is a big ball. It spins like a slow top. That spin is why we have day and night.\n\nWhen your part of Earth faces the Sun, it is daytime. The sky looks bright. When your part of Earth turns away from the Sun, it is nighttime. The sky looks dark.\n\nThe Sun does not “go to bed.” Earth is turning. The Moon and stars can shine at night. Sometimes clouds hide them.\n\nDay is a good time for play and learning. Night is a good time for rest and sleep. Your body needs both.\n\nRemember: Earth spins. Day = facing the Sun. Night = turned away.',
      age_min: 4, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 12,
      questions: [
        q('Why do we have day and night?', ['Earth spins', 'The Sun turns off', 'Clouds only', 'Birds decide'], 0, 'Earth’s spin makes day and night.'),
        q('Daytime is when…', ['We face the Sun', 'We face away forever', 'There is no Sun ever', 'Only rain'], 0, 'Facing the Sun makes day.'),
        q('Night is a good time for…', ['Only homework forever', 'Rest and sleep', 'Never resting', 'Only shouting'], 1, 'Bodies need rest at night.'),
      ],
    },
    {
      title: 'Plants Need Light and Water',
      subject: 'science',
      emoji: '🌱',
      description: 'How plants grow — roots, stems, leaves, and sun!',
      content:
        'Plants are living things. Many plants need light, water, air, and soil or another place for roots.\n\nRoots drink water from the ground. Stems hold the plant up. Leaves catch sunlight. Flowers can make seeds so new plants can grow.\n\nIf a plant has no water for a long time, it can wilt. If a plant has no light for a long time, it can grow weak. That is why people water plants and put them near windows or outside sun.\n\nYou can grow a bean in a cup with soil, water, and light. Watch it each day. Measuring growth is real science.\n\nRemember: plants need light and water to grow strong. Be gentle with living plants.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('What do many plants need?', ['Only rocks', 'Light and water', 'Only plastic', 'Only noise'], 1, 'Light and water help plants grow.'),
        q('Roots mostly…', ['Catch sun', 'Drink water from soil', 'Sing songs', 'Make thunder'], 1, 'Roots take up water.'),
        q('Leaves help catch…', ['Sunlight', 'Only mud', 'Only wind', 'Cars'], 0, 'Leaves catch light.'),
      ],
    },
    {
      title: 'Weather We Feel',
      subject: 'science',
      emoji: '☔',
      description: 'Sunny, rainy, windy, snowy — dress for the day!',
      content:
        'Weather is what the air is doing outside today. It can be sunny, cloudy, rainy, windy, hot, cold, or snowy.\n\nSunny days feel bright and warm. Rainy days bring water from clouds. Windy days push trees and can fly a kite. Snow is frozen water that falls when air is cold enough.\n\nClothes help. Coat for cold. Raincoat or umbrella for rain. Hat for strong sun. Listen to a trusted adult about safe weather clothes.\n\nWeather changes. Morning can be cool and afternoon warmer. That is normal.\n\nMeteorologists study weather with tools and science — not magic. We can learn simple weather words and stay safe.\n\nRemember: weather is outside air today. Dress for the weather. Stay safe in storms with adults.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('Rain comes from…', ['Clouds', 'Shoes', 'Only the ground', 'Only the Moon'], 0, 'Rain falls from clouds.'),
        q('Snow needs air that is…', ['Hot like soup always', 'Cold enough', 'Only windy', 'Only dark'], 1, 'Snow needs cold air.'),
        q('In a big storm you should…', ['Go outside alone', 'Stay safe with a trusted adult', 'Climb the tallest tree', 'Ignore adults'], 1, 'Adults help keep you safe.'),
      ],
    },
    {
      title: 'Animals and Their Homes',
      subject: 'animals',
      emoji: '🏠',
      description: 'Nests, dens, shells, and hives — where animals live!',
      content:
        'Animals live in many kinds of homes. Birds often build nests. Bears may use dens. Bees live in hives. Some crabs use shells. People build houses.\n\nHomes keep animals safe and help them raise babies. A nest holds eggs. A den can be warm and hidden.\n\nDifferent animals need different homes. A fish needs water. A camel can live in dry places. A polar bear lives where it is cold and icy.\n\nWe should respect animal homes in nature. Do not break nests. Watch quietly. Take only pictures if an adult says it is okay.\n\nRemember: animals need safe homes, just like people do.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('Birds often live in…', ['Nests', 'Hives only', 'Cars', 'Only caves always'], 0, 'Many birds use nests.'),
        q('Bees live in…', ['Hives', 'Only nests in trees always', 'Only water', 'Only shoes'], 0, 'Bees live in hives.'),
        q('We should…', ['Break nests', 'Respect animal homes', 'Chase every animal', 'Take eggs'], 1, 'Respect nature homes.'),
      ],
    },
    {
      title: 'Dogs and Cats as Pets',
      subject: 'animals',
      emoji: '🐶',
      description: 'How to be kind and gentle with pets!',
      content:
        'Dogs and cats can be loving pets. They need food, water, a safe place, and kind people.\n\nGentle hands matter. Pet soft and slow if a trusted adult says the animal is friendly. Never pull tails or ears. If a pet walks away, give space.\n\nDogs often need walks. Cats often use a litter box. Both need clean water every day.\n\nPets can feel scared or happy. Soft voices help. Loud yelling can scare them.\n\nNot every animal wants to be a pet. Wild animals should stay wild. Always ask an adult before touching any animal.\n\nRemember: food, water, safety, and kindness keep pets healthy and happy.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 10, duration_minutes: 12,
      questions: [
        q('Pets need…', ['Food and water', 'Only toys forever', 'No care', 'Only noise'], 0, 'Food and water are basic needs.'),
        q('Gentle petting means…', ['Pulling tails', 'Soft and slow with adult OK', 'Hitting', 'Yelling'], 1, 'Soft and slow is kind.'),
        q('Before touching an animal…', ['Always ask a trusted adult', 'Never ask', 'Only run at it', 'Ignore rules'], 0, 'Ask an adult first.'),
      ],
    },
    {
      title: 'Frogs and Tadpoles',
      subject: 'animals',
      emoji: '🐸',
      description: 'How a tadpole becomes a frog!',
      content:
        'Frogs begin as eggs in water. Tiny tadpoles hatch. Tadpoles live in water and have tails for swimming. Many tadpoles eat tiny water plants.\n\nAs they grow, legs appear. The tail gets smaller. Lungs develop so they can breathe air better on land. Finally they become frogs that can hop.\n\nThis big change is a life cycle. Egg → tadpole → frog. Some frogs live near ponds. Their skin needs moisture.\n\nFrogs help gardens by eating insects. Please be gentle if you see one. Hands can be dirty or dry, so watch more than touch unless an adult helps.\n\nRemember: tadpoles swim, frogs hop, and the change is a real life cycle.',
      age_min: 4, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('What hatches from frog eggs?', ['Tadpoles', 'Birds', 'Cats', 'Cars'], 0, 'Tadpoles hatch from frog eggs.'),
        q('Adult frogs often…', ['Hop', 'Only fly always', 'Only bark', 'Only dig metal'], 0, 'Frogs hop.'),
        q('Egg to tadpole to frog is a…', ['Life cycle', 'Rocket', 'Only a song', 'House plan'], 0, 'It is a life cycle.'),
      ],
    },
    {
      title: 'The Sun Helps Earth',
      subject: 'space',
      emoji: '☀️',
      description: 'Light and warmth from our star!',
      content:
        'The Sun is a star. It is very big and very hot. Earth gets light and heat from the Sun.\n\nSunlight helps plants grow. Sunlight helps us see during the day. Sunlight warms land, air, and water.\n\nNever look straight at the Sun. It can hurt your eyes. Wear a hat and use safe sun care that adults choose for you when outside a long time.\n\nEarth moves around the Sun once each year. That is a real orbit. Seasons connect to Earth’s path and tilt — you will learn more as you grow.\n\nRemember: the Sun is our daytime star. It gives light and heat. Protect your eyes.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('The Sun is a…', ['Star', 'Planet only', 'Moon only', 'Cloud'], 0, 'The Sun is a star.'),
        q('The Sun gives Earth…', ['Light and heat', 'Only snow', 'Only darkness', 'Only rocks'], 0, 'Light and heat come from the Sun.'),
        q('Looking straight at the Sun is…', ['Safe always', 'Not safe for eyes', 'Required', 'Only for nights'], 1, 'Never stare at the Sun.'),
      ],
    },
    {
      title: 'The Moon We See',
      subject: 'space',
      emoji: '🌕',
      description: 'Why the Moon looks different on different nights!',
      content:
        'The Moon is Earth’s neighbor in space. It goes around Earth. That path is called an orbit.\n\nThe Moon does not make its own light like the Sun. We see the Moon because sunlight hits it and bounces toward our eyes.\n\nSometimes the Moon looks full and round. Sometimes it looks like a banana shape called a crescent. The shape we see is called a phase. Phases change across the month as the Moon moves.\n\nAstronauts have walked on the Moon. The Moon has dust and craters. There is no air to breathe like on Earth, so space suits are needed.\n\nRemember: Moonlight is reflected sunlight. Phases change. The Moon orbits Earth.',
      age_min: 4, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('Moon light we see is mostly…', ['Reflected sunlight', 'Fire on the Moon', 'Only city lights', 'Flashlights'], 0, 'Sunlight reflects off the Moon.'),
        q('The Moon goes around…', ['Earth', 'Only Mars', 'Only the Sun as our planet', 'A car'], 0, 'The Moon orbits Earth.'),
        q('A crescent Moon looks…', ['Like a banana curve', 'Like a perfect square always', 'Like a house', 'Invisible always'], 0, 'Crescent is a curved slice shape.'),
      ],
    },
    {
      title: 'Maps Show Places',
      subject: 'geography',
      emoji: '🗺️',
      description: 'A map is a picture that helps us find where things are!',
      content:
        'A map is a drawing of places. A globe is a round model of Earth. Maps help us find towns, roads, parks, and oceans.\n\nSymbols on maps stand for real things. A blue area may mean water. A line may mean a road. A star may mark a capital city on some maps.\n\nA map key (legend) explains symbols. Always look for the key when you learn a new map.\n\nNorth is a direction. Many maps show an arrow or compass rose for north, south, east, and west.\n\nYou can make a simple map of your room: bed, door, window. That is real map thinking!\n\nRemember: maps show where. Keys explain symbols. Directions help you orient.',
      age_min: 4, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('A map helps you…', ['Find places', 'Cook soup only', 'Only sleep', 'Only sing'], 0, 'Maps show locations.'),
        q('Blue on many maps often means…', ['Water', 'Fire', 'Candy', 'Only mountains'], 0, 'Blue often shows water.'),
        q('A map key explains…', ['Symbols', 'Only jokes', 'Only time', 'Only music'], 0, 'The key explains map symbols.'),
      ],
    },
    {
      title: 'Community Helpers',
      subject: 'life_skills',
      emoji: '🚒',
      description: 'Firefighters, teachers, doctors, and more!',
      content:
        'Community helpers are people who help others in a town or city.\n\nTeachers help you learn. Doctors and nurses help when you are sick or hurt. Firefighters help with fires and rescue. Police officers help keep people safe. Farmers grow food. Mail carriers bring letters and packages.\n\nYou can be a helper too: pick up trash, hold a door, use kind words, and listen to safety rules.\n\nIf there is a real emergency, adults call emergency numbers. Kids should get a trusted adult for emergencies.\n\nThank-you notes and kind waves make helpers feel appreciated.\n\nRemember: many jobs help a community. You can help in small kind ways every day.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('Who helps put out fires?', ['Firefighters', 'Only bakers', 'Only painters', 'Only pilots always'], 0, 'Firefighters fight fires.'),
        q('Teachers help you…', ['Learn', 'Only run forever', 'Only sleep in class always', 'Ignore books'], 0, 'Teachers help learning.'),
        q('In an emergency kids should…', ['Get a trusted adult', 'Handle it alone always', 'Hide the phone', 'Ignore everyone'], 0, 'Trusted adults help in emergencies.'),
      ],
    },
    {
      title: 'Brush Your Teeth',
      subject: 'health',
      emoji: '🪥',
      description: 'Healthy teeth need cleaning morning and night!',
      content:
        'Teeth help you chew food and smile. Plaque is a sticky film that can hurt teeth if it stays too long. Brushing helps clean it away.\n\nBrush morning and night for about two minutes. Gentle circles on front, back, and chewing surfaces. Do not forget the tongue gently if an adult shows you how.\n\nUse a small amount of toothpaste that adults choose for your age. Spit out toothpaste. Ask an adult if you should rinse.\n\nSugary snacks and drinks can be hard on teeth. Water is a tooth-friendly drink. Visit a dentist when adults schedule checkups.\n\nThis is general dental hygiene information — not medical advice. Ask a parent or dentist for personal care rules.\n\nRemember: brush twice a day, be gentle, and take care of your smile!',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 10, duration_minutes: 11,
      questions: [
        q('How often should you brush?', ['Morning and night', 'Once a year', 'Never', 'Only on birthdays'], 0, 'Twice a day is the usual habit.'),
        q('Brushing helps clean…', ['Plaque', 'Only hair', 'Only shoes', 'Only windows'], 0, 'Brushing removes plaque.'),
        q('A tooth-friendly drink is…', ['Water', 'Only soda always', 'Only candy juice always', 'Only syrup'], 0, 'Water is kind to teeth.'),
      ],
    },
    {
      title: 'Washing Hands the Right Way',
      subject: 'health',
      emoji: '🧼',
      description: 'Soap, water, and singing a short song!',
      content:
        'Clean hands help stop germs from spreading. Germs are tiny and can make people sick. We cannot see most germs, but washing still helps.\n\nWet hands. Add soap. Scrub all over — palms, backs, between fingers, under nails — for about 20 seconds. That is long enough to sing the ABCs once or “Happy Birthday” twice. Rinse. Dry with a clean towel.\n\nWash before eating, after using the bathroom, after playing outside, and after blowing your nose.\n\nHand sanitizer can help when soap and water are not available, but soap and water are best when hands are dirty with mud or food.\n\nThis is general hygiene information — not medical advice.\n\nRemember: soap + scrub + rinse + dry = cleaner hands.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 10, duration_minutes: 11,
      questions: [
        q('About how long should you scrub with soap?', ['2 seconds', 'About 20 seconds', '2 hours', 'No scrubbing'], 1, 'About 20 seconds of scrubbing.'),
        q('Wash hands before…', ['Eating', 'Only sleeping always', 'Never', 'Only jumping'], 0, 'Wash before eating.'),
        q('Soap and water are best when hands are…', ['Muddy or food-dirty', 'Only clean already', 'Only gloved always', 'Never dirty'], 0, 'Soap and water clean dirty hands best.'),
      ],
    },
    {
      title: 'Colors of the Rainbow',
      subject: 'art',
      emoji: '🌈',
      description: 'Red, orange, yellow, green, blue, indigo, violet!',
      content:
        'A rainbow shows beautiful colors. Many people remember ROYGBIV: red, orange, yellow, green, blue, indigo, violet.\n\nYou can mix some colors. Red and yellow make orange. Blue and yellow make green. Red and blue make purple. White can lighten a color. Black can darken a color.\n\nArtists choose colors on purpose. Warm colors like red and orange can feel energetic. Cool colors like blue and green can feel calm.\n\nLook for colors outside: green leaves, blue sky, yellow sun, brown soil. Nature is a free art teacher.\n\nTry a color hunt: find three red things and three blue things in your home with a parent.\n\nRemember: colors can mix, colors can feel different, and rainbows show many colors together.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 10, duration_minutes: 12,
      questions: [
        q('Red + yellow make…', ['Orange', 'Green', 'Black', 'Only white'], 0, 'Red and yellow make orange.'),
        q('Blue + yellow make…', ['Green', 'Purple', 'Brown always', 'Silver'], 0, 'Blue and yellow make green.'),
        q('A rainbow has…', ['Many colors', 'No colors', 'Only gray', 'Only black'], 0, 'Rainbows show many colors.'),
      ],
    },
    {
      title: 'Clap the Beat',
      subject: 'music',
      emoji: '👏',
      description: 'Steady beat — clap, tap, and feel the music!',
      content:
        'A beat is a steady pulse in music, like a heartbeat. Clap, clap, clap, clap — even and calm.\n\nYou can tap toes, pat knees, or tap a table gently. Keep the space between claps the same. That is a steady beat.\n\nSongs can be fast (quick beat) or slow (relaxed beat). Try clapping slow like a turtle, then faster like a bunny hop — still even.\n\nRhythm is the pattern of long and short sounds on top of the beat. For little learners, first master the steady beat, then play simple patterns: clap-clap-rest.\n\nMusic is for everyone. You do not need a fancy instrument to start. Your body is instrument number one!\n\nRemember: steady beat = even pulse. Clap together. Have fun.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 10, duration_minutes: 11,
      questions: [
        q('A beat is…', ['A steady pulse', 'Only a color', 'Only a smell', 'Only a number 100'], 0, 'Beat is a steady pulse.'),
        q('You can keep a beat by…', ['Clapping evenly', 'Only sleeping', 'Only whispering random words', 'Never moving'], 0, 'Even clapping keeps a beat.'),
        q('A fast song has a beat that feels…', ['Quicker', 'Stopped forever', 'Only silent', 'Only color'], 0, 'Fast music feels quicker.'),
      ],
    },
    {
      title: 'Kitchen Safety for Kids',
      subject: 'cooking',
      emoji: '🍳',
      description: 'Help in the kitchen the safe way with an adult!',
      content:
        'Kitchens can be fun places to learn — and they need careful rules.\n\nAlways cook with a trusted adult. Hot stoves, ovens, and sharp tools are for adults or for kids only with close adult help.\n\nWash hands before helping with food. Keep raw meat away from ready-to-eat foods — adults handle that safely.\n\nKid jobs can include washing fruit, tearing lettuce, stirring cold ingredients, setting the table, and measuring with help.\n\nIf something spills, tell an adult. Wipe carefully so no one slips.\n\nFood allergies are serious. Never share food if an adult says someone cannot eat it.\n\nRemember: adult supervision, clean hands, no touching hot or sharp things alone.',
      age_min: 4, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('Who should be with you in the kitchen for cooking?', ['A trusted adult', 'No one ever', 'Only a pet', 'Only a TV'], 0, 'Adults supervise kitchen work.'),
        q('Before helping with food…', ['Wash hands', 'Never wash', 'Only run outside', 'Only shout'], 0, 'Wash hands first.'),
        q('Hot stoves are…', ['Dangerous without adult help', 'Toys', 'Always cold', 'For kids alone always'], 0, 'Hot tools need adults.'),
      ],
    },
    {
      title: 'Patterns Everywhere',
      subject: 'math',
      emoji: '🔁',
      description: 'Red-blue-red-blue — what comes next?',
      content:
        'A pattern repeats in a regular way. Red, blue, red, blue… Next is red. Clap, stomp, clap, stomp… Next is clap.\n\nPatterns can use colors, shapes, sounds, and numbers. 2, 4, 6, 8… is a number pattern counting by twos (for kids ready for that).\n\nFinding patterns helps your brain predict what comes next. That skill helps in math, music, and reading later.\n\nMake a pattern with toys: car, block, car, block. Ask a friend what comes next.\n\nIf the pattern breaks, notice it: car, block, car, dinosaur — the dinosaur broke the pattern!\n\nRemember: patterns repeat. Look for what comes next. You can build your own patterns.',
      age_min: 3, age_max: 7, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('In red-blue-red-blue, what comes next?', ['Red', 'Green only', 'Stop', 'Seven'], 0, 'The pattern continues with red.'),
        q('A pattern…', ['Repeats in a regular way', 'Never repeats', 'Only uses food', 'Only uses cars'], 0, 'Patterns repeat regularly.'),
        q('Clap-stomp-clap-stomp next is…', ['Clap', 'Silence forever', 'Only stomp stomp stomp only', 'A number 100'], 0, 'Next is clap.'),
      ],
    },
    {
      title: 'Subtraction: Taking Away',
      subject: 'math',
      emoji: '➖',
      description: 'Start with some, take some away, find how many left!',
      content:
        'Subtraction means taking away. If you have 5 cookies and eat 2, you write 5 − 2 = 3. Three cookies are left.\n\nThe minus sign “−” means take away. The answer is how many remain.\n\nYou can use fingers: hold up 5, fold down 2, count what is still up. You can cross out pictures. You can hop backward on a number line.\n\nStory: There are 6 birds on a fence. 1 bird flies away. How many birds are left? 6 − 1 = 5.\n\nZero is special. 4 − 4 = 0 means none left. 4 − 0 = 4 means you took nothing away.\n\nPractice: 3 − 1 = 2. 7 − 2 = 5. 10 − 5 = 5. You are learning real math!',
      age_min: 5, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('What is 5 − 2?', ['3', '7', '2', '0'], 0, '5 take away 2 is 3.'),
        q('The minus sign means…', ['Take away', 'Add more only', 'Multiply only', 'Do nothing always'], 0, 'Minus means take away.'),
        q('What is 4 − 0?', ['4', '0', '1', '40'], 0, 'Taking zero leaves the number the same.'),
      ],
    },
    {
      title: 'Telling Time: O’Clock',
      subject: 'math',
      emoji: '🕐',
      description: 'When the long hand is on 12, read the short hand!',
      content:
        'Clocks help us know when things happen — school, lunch, bedtime.\n\nOn an analog clock, the short hand shows the hour. The long hand shows the minutes. When the long hand points to 12, we say o’clock. If the short hand points to 3 and the long hand to 12, it is 3 o’clock.\n\nDigital clocks show numbers like 3:00. That also means 3 o’clock.\n\nPractice with a toy clock or drawing. Move the short hand to 1, long hand to 12 — 1 o’clock. Then 2 o’clock. Go slowly.\n\nMorning and afternoon both use hours. Adults help with a.m. and p.m. as you grow.\n\nRemember: long hand on 12 → o’clock. Short hand tells the hour.',
      age_min: 5, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('At o’clock, the long hand is on…', ['12', '6 only always', '3 only always', '9 only always'], 0, 'Long hand on 12 for o’clock.'),
        q('The short hand shows the…', ['Hour', 'Only seconds always', 'Only year', 'Only color'], 0, 'Short hand is the hour hand.'),
        q('3:00 on a digital clock means…', ['3 o’clock', '12 o’clock', 'Only midnight always', 'No time'], 0, '3:00 is 3 o’clock.'),
      ],
    },
    {
      title: 'Dinosaurs Were Real',
      subject: 'science',
      emoji: '🦕',
      description: 'Giant reptiles from long ago — known from fossils!',
      content:
        'Dinosaurs were real animals that lived long ago, before people. We know about them from fossils — bones, teeth, and footprints preserved in rock.\n\nSome dinosaurs were huge. Some were small. Some ate plants. Some ate meat. Scientists study fossils carefully; ideas can change when new fossils are found.\n\nTyrannosaurus rex had strong jaws. Triceratops had three horns. Long-necked dinosaurs ate high leaves.\n\nDinosaurs are not walking around cities today. Birds are related to a group of dinosaurs in modern science — that is an advanced idea you can grow into later.\n\nMuseums show real and replica fossils. Visit with a parent if you can.\n\nRemember: dinosaurs = ancient reptiles known from fossils. Evidence matters more than movies.',
      age_min: 4, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('How do we know dinosaurs were real?', ['Fossils', 'Only cartoons', 'Only toys', 'Only dreams'], 0, 'Fossils are evidence.'),
        q('Did dinosaurs live with people?', ['No, long before people', 'Yes always', 'Only last year', 'Only in malls'], 0, 'Dinosaurs lived long before people.'),
        q('Some dinosaurs ate…', ['Plants or meat', 'Only plastic', 'Only cars', 'Only ice cream'], 0, 'Diets included plants or meat.'),
      ],
    },
    {
      title: 'Under the Ocean',
      subject: 'science',
      emoji: '🐠',
      description: 'Fish, coral, and the deep blue sea!',
      content:
        'Oceans are huge bodies of salt water. They cover most of Earth. Many animals live in oceans: fish, whales, dolphins, crabs, starfish, and more.\n\nFish use gills to take oxygen from water. Whales and dolphins are mammals — they breathe air at the surface.\n\nCoral reefs are special underwater places full of life. They need clean water and care. People should not litter; trash can hurt ocean animals.\n\nThe ocean can be shallow near the beach and very deep far out. Sunlight is stronger near the top of the water.\n\nIf you visit a beach, stay with an adult. Waves and currents can be strong.\n\nRemember: oceans are salty and full of life. Protect them by not littering.',
      age_min: 4, age_max: 8, difficulty: 'beginner', xp_reward: 12, duration_minutes: 13,
      questions: [
        q('Oceans are mostly…', ['Salt water', 'Only juice', 'Only fresh pond water always', 'Only sand'], 0, 'Oceans are salt water.'),
        q('Fish often use gills to…', ['Get oxygen from water', 'Fly', 'Bark', 'Make fire'], 0, 'Gills help fish breathe in water.'),
        q('Litter in the ocean can…', ['Hurt animals', 'Help always', 'Make fish smarter magically', 'Do nothing ever'], 0, 'Trash can harm ocean life.'),
      ],
    },
    {
      title: 'Being a Good Friend',
      subject: 'life_skills',
      emoji: '💛',
      description: 'Listen, include, and use kind words!',
      content:
        'Good friends are kind. They listen when someone talks. They take turns. They include others in games when they can.\n\nKind words help: “Do you want to play?” “Nice try!” “Are you okay?” Mean words and pushing hurt feelings and bodies.\n\nFriends can disagree and still be respectful. You can say, “I want a turn next,” without yelling.\n\nIf a friend is left out, invite them. If you need space, say so kindly.\n\nTell a trusted adult if someone is being unsafe or unkind again and again. Asking for help is brave.\n\nRemember: listen, include, be kind, and get help when needed.',
      age_min: 3, age_max: 8, difficulty: 'beginner', xp_reward: 11, duration_minutes: 12,
      questions: [
        q('A good friend often…', ['Listens and is kind', 'Only grabs toys', 'Only yells', 'Never shares a turn'], 0, 'Kind listening builds friendship.'),
        q('If someone is left out you can…', ['Invite them', 'Laugh only', 'Ignore always', 'Hide toys forever'], 0, 'Including is kind.'),
        q('If play becomes unsafe…', ['Tell a trusted adult', 'Never tell', 'Only make it worse', 'Keep a secret forever always'], 0, 'Adults help with safety.'),
      ],
    },
  ];

  return pack.map((l) => ({
    ...l,
    id: slugId(l.title, l.subject),
  }));
}

export function ensurePicture(lesson) {
  if (lesson.picture) return lesson;
  return {
    ...lesson,
    picture: lessonPicture(lesson.emoji || '📚', lesson.subject || 'general', lesson.title || 'Lesson'),
  };
}
