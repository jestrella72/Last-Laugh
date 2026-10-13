// =============================================================
//  LAST LAUGH — Story scenes
//
//  Picture shown at special moments in Story mode.
//  Curious Carl's defeat: flattened under a piano, waving a white flag,
//  with a "That's all, folks!" caption.
//  Preview it any time with  index.html?scene=carl
// =============================================================
async function playCarlDefeat() {
  await askLocal({
    kicker: 'Curious Carl is out!',
    title: '🎹 Piano problems',
    html: `<div class="scene-wrap">
             <img src="images/carl-defeat.webp?v=40" alt="Curious Carl flattened under a grand piano, waving a white flag">
             <div class="scene-cap">That's all, folks!</div>
           </div>`,
    buttons: [{ label: 'Continue ▶', cls: 'btn-yellow btn-big', value: true }],
  });
}

window.addEventListener('load', () => {
  if (new URLSearchParams(location.search).get('scene') === 'carl') setTimeout(playCarlDefeat, 500);
});
