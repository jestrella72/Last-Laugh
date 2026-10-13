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
            <img src="${s.img}?v=42" alt="${s.alt}">
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
