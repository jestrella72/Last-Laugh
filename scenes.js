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
};

async function playStoryScene(id) {
  const s = STORY_SCENES[id];
  if (!s) return;
  await askLocal({
    kicker: s.kicker,
    title: s.title,
    html: `<div class="scene-wrap">
             <img src="${s.img}?v=41" alt="${s.alt}">
             ${s.caption ? `<div class="scene-cap">${s.caption}</div>` : ''}
           </div>`,
    buttons: [{ label: 'Continue ▶', cls: 'btn-yellow btn-big', value: true }],
  });
}
const playCarlDefeat = () => playStoryScene('c_carl');

window.addEventListener('load', () => {
  const id = new URLSearchParams(location.search).get('scene');
  if (id === 'carl') setTimeout(() => playStoryScene('c_carl'), 500);
  else if (STORY_SCENES[id]) setTimeout(() => playStoryScene(id), 500);
});
