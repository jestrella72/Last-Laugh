// =============================================================
//  LAST LAUGH — Story scenes
//
//  A picture shown right after you beat certain opponents in Story mode.
//  To add one: drop the image in images/ and add an entry below, keyed by
//  the character's id. Preview any of them with  index.html?scene=c_carl
// =============================================================
const STORY_SCENES = {
  c_carl: {
    kicker: 'Curious Carl is out!', title: '🎹 Piano problems',
    img: 'images/carl-defeat.webp', alt: 'Curious Carl flattened under a grand piano, waving a white flag',
    caption: "That's all, folks!",
  },
  c_casey: {
    kicker: 'Cautious Casey is out!', title: '😵 Fainted from fright',
    img: 'images/casey-defeat.webp', alt: 'Cautious Casey lying flat on the pavement, seeing stars, while her scared twin looks on',
    caption: '',
  },
  c_nina: {
    kicker: 'Naive Nina is out!', title: '🚓 Busted!',
    img: 'images/nina-defeat.webp', alt: 'Naive Nina in handcuffs, dragged off by two police pigs, a dropped bag of money on the pavement',
    caption: '',
  },
  c_bella: {
    kicker: 'Bold Bella is out!', title: '🪢 Caught in the net',
    img: 'images/bella-defeat.webp', alt: 'Bold Bella the bunny dangling in a rope net from a tree branch, kicking and shouting',
    caption: '',
  },
  c_luke: {
    kicker: 'Lucky Luke is out!', title: '💸 Out of luck',
    img: 'images/luke-defeat.webp', alt: 'Lucky Luke tumbling off the pier as a shark leaps up with its jaws open, dollar bills flying',
    caption: '',
  },
  c_rosie: {
    kicker: 'Reckless Rosie is out!', title: '😵 Down for the count',
    img: 'images/rosie-defeat.webp', alt: 'Reckless Rosie flat on the boxing ring floor, seeing stars, while a snorting bull stands over her',
    caption: '',
  },
  c_mel: {
    kicker: 'Melo Mel is out!', title: '🪢 All tied up',
    img: 'images/mel-defeat.webp', alt: 'Melo Mel tied up in rope while a man in a top hat pulls it tight',
    caption: '',
  },
  c_franky: {
    kicker: 'Franky Ice is out!', title: '🌳 Tree trouble',
    img: 'images/franky-defeat.webp', alt: 'Franky Ice the polar bear slammed against a tree, seeing stars, while a boy runs off',
    caption: '',
  },
  c_lou: {
    kicker: 'Grumpy Lou is out!', title: '🥊 Lights out',
    img: 'images/lou-defeat.webp', alt: 'Grumpy Lou the bull knocked flat on his back by a girl boxer',
    caption: '',
  },
  c_rick: {
    kicker: 'Slick Rick is out!', title: '🕸️ Caught in the net',
    img: 'images/rick-defeat.webp', alt: 'Slick Rick tangled in a rope net while a boy laughs beside him',
    caption: '',
  },
  c_fester: {
    kicker: 'Fester the Cat is out!', title: '🃏 Dealt a bad hand',
    img: 'images/fester-defeat.webp', alt: 'Fester the Cat flattened under a grand piano, poker chips and cards scattered on the floor',
    caption: '',
  },
  c_lenny: {
    kicker: 'Lenny the Shark is out!', title: '⚓ Anchors away',
    img: 'images/lenny-defeat.webp', alt: 'A boy cuts a rope and a heavy weight drops onto Lenny the Shark',
    caption: '',
  },
  c_leo: {
    kicker: 'Leo the Lion is out!', title: '🎰 The house is closed',
    img: 'images/leo-defeat.webp', alt: 'Leo the Lion knocked out in front of a closed casino, crown and dice on the ground',
    caption: '',
  },
  c_pete: {
    kicker: 'Prankster Pete is out!', title: '🥧 Pie to the face',
    img: 'images/pete-defeat.webp', alt: 'Prankster Pete getting a cream pie to the face from a boxing glove, his hat flying off',
    caption: '',
  },
};

// The picture itself (null if this opponent has none). Story mode puts it
// on the "Level cleared!" screen right after the win.
function storySceneHTML(id, small = false) {
  const s = STORY_SCENES[id];
  if (!s) return '';
  return `<div class="scene-wrap${small ? ' small' : ''}">
            <img src="${s.img}?v=45" alt="${s.alt}">
            ${s.caption ? `<div class="scene-cap">${s.caption}</div>` : ''}
          </div>`;
}

// Stand-alone pop-up (used by the ?scene= preview)
async function playStoryScene(id) {
  const s = STORY_SCENES[id];
  if (!s) return;
  await askLocal({
    kicker: s.kicker, title: s.title, html: storySceneHTML(id),
    buttons: [{ label: 'Continue ▶', cls: 'btn-yellow btn-big', value: true }],
  });
}
const playCarlDefeat = () => playStoryScene('c_carl');

window.addEventListener('load', () => {
  const id = new URLSearchParams(location.search).get('scene');
  if (id === 'carl') setTimeout(() => playStoryScene('c_carl'), 500);
  else if (STORY_SCENES[id]) setTimeout(() => playStoryScene(id), 500);
});
