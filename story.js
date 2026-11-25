import { mouthTrack, workoutTiming } from './motion-anchors.js';

const story = document.querySelector('.story');
const stagePanel = story.querySelector('.stage');
const stage = stagePanel.querySelector('.stage-mat');
const sceneWindow = stage.querySelector('.scene-window');
const sceneLayer = sceneWindow.querySelector('.scene-video-layer');
let poster = sceneLayer.querySelector('.stage-poster');
let posterPath = poster.getAttribute('src');
let pendingPoster;
const stageSpeech = stage.querySelector('.speech');
const speechText = stageSpeech.firstElementChild;
const fitnessLine = story.querySelector('.fitness-line');
const fitnessText = fitnessLine.textContent;
const flyingLine = fitnessLine.cloneNode(true);
const flyingInk = flyingLine.firstElementChild;
flyingLine.className = 'fitness-flight';
flyingLine.hidden = true;
flyingLine.setAttribute('aria-hidden', 'true');
for (const side of ['left', 'right', 'top', 'bottom']) {
  const fold = document.createElement('i');
  fold.className = 'paper-fold paper-fold-' + side;
  flyingLine.append(fold);
}
const paperTrail = document.createElement('canvas');
paperTrail.className = 'paper-trail';
paperTrail.hidden = true;
paperTrail.setAttribute('aria-hidden', 'true');
const trailBrush = paperTrail.getContext('2d');
const placeLabel = stagePanel.querySelector('.chapter-place');
const actionLabel = stagePanel.querySelector('.chapter-action');
const watchIntro = stagePanel.querySelector('.watch-intro');
const watchIntroIcon = watchIntro.querySelector('i');
const watchIntroLabel = watchIntro.querySelector('span');
const mobile = matchMedia('(max-width: 760px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.masthead');
const nav = [...header.querySelectorAll('[data-nav]')];

const sections = [
  ['start', 'arrival', 'work'],
  ['work', 'gym', 'work'],
  ['projects', 'track', 'projects'],
  ['writing', 'kitchen', 'writing'],
  ['contact', 'finish', 'contact'],
].map(([id, clip, group]) => ({ element: document.getElementById(id), clip, group }));

const clips = {
  arrival: { start: 0, still: 'opener', place: 'The gym', action: 'The workout begins' },
  gym: { start: workoutTiming.gym, still: 'opener', place: 'The gym', action: 'Strength training', loop: true },
  'to-track': { start: workoutTiming.trackWalk, still: 'stocker', place: 'The track', action: 'Heading to the track' },
  track: { start: workoutTiming.track, still: 'stocker', place: 'The track', action: 'Running', loop: true },
  'to-kitchen': { start: workoutTiming.kitchenWalk, still: 'cook', place: 'The kitchen', action: 'Heading to the kitchen' },
  kitchen: { start: workoutTiming.kitchen, still: 'cook', place: 'The kitchen', action: 'Cooking', loop: true },
  finish: { start: workoutTiming.finish, still: 'finish', place: 'The finish', action: 'Session complete' },
};
const chains = { arrival: 'gym', 'to-track': 'track', 'to-kitchen': 'kitchen' };
const preloadNext = { ...chains, gym: 'to-track', track: 'to-kitchen', kitchen: 'finish' };
const foldStart = 1.72;
const releaseAt = foldStart + .71;
const unfoldStart = releaseAt + .63;
const unfoldEnd = unfoldStart + .42;
const workoutLine = 'Have a look, I will get a workout in.';
const lines = [
  [foldStart, workoutTiming.arrivalWalk, workoutLine],
  [workoutTiming.track + .18, workoutTiming.track + 2.18, 'time for some VO2maxxing'],
  [workoutTiming.kitchen + .18, workoutTiming.kitchen + 2.18, 'time to get that protein in'],
  [workoutTiming.finish + 2.68, workoutTiming.finish + 3.68, 'tough one'],
  [workoutTiming.finish + 3.68, workoutTiming.finish + 5.68, 'lets workout together'],
];

const videos = new Map();
let activeSection = -1;
let activeVideo;
let outgoingVideo;
let clipEvents;
let navigationFrame;
let speechFrame;
let settleTimer;
let settlingSection;
let paused = false;

document.documentElement.classList.add('js');

function findSection() {
  if (scrollY <= 1) return 0;
  const top = header.offsetHeight + (mobile.matches ? stagePanel.offsetHeight : 0);
  const point = top + Math.min(56, (innerHeight - top) * .15);
  return sections.reduce((current, { element }, index) => element.getBoundingClientRect().top <= point ? index : current, 0);
}

function updateStage(key) {
  const { still, place, action } = clips[key];
  updatePoster('/stills/' + still + '.webp');
  stage.dataset.world = key === 'to-track' ? 'track' : key === 'to-kitchen' ? 'kitchen' : key;
  placeLabel.textContent = place;
  actionLabel.textContent = action;
}

function updatePoster(src) {
  if (pendingPoster?.src === src) return;
  pendingPoster = undefined;
  if (posterPath === src && (!poster.complete || poster.naturalWidth)) return;

  const image = new Image(900, 650);
  image.className = poster.className;
  image.alt = '';
  const request = { src };
  pendingPoster = request;

  async function load(retry = false) {
    image.src = retry ? src + '?retry=' + Date.now() : src;
    try {
      await image.decode();
    } catch {
      if (pendingPoster !== request) return;
      if (!retry) return load(true);
      pendingPoster = undefined;
      return;
    }
    if (pendingPoster !== request) return;
    poster.replaceWith(image);
    poster = image;
    posterPath = src;
    pendingPoster = undefined;
  }
  load();
}

function prepareClip(key) {
  const cached = videos.get(key);
  if (cached && !cached.error) return cached;
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = !!clips[key].loop;
  video.preload = 'auto';
  video.dataset.scene = key;
  video.setAttribute('aria-hidden', 'true');
  video.addEventListener('ended', () => {
    if (video !== activeVideo || !video.ended || reduced.matches) return;
    if (chains[key]) showClip(chains[key], 120);
    else {
      updateControl();
      stageSpeech.hidden = true;
    }
  });
  if (cached) video.dataset.retry = '';
  video.src = '/clips/scroll-' + key + '.mp4' + (cached ? '?retry=' + Date.now() : '');
  videos.set(key, video);
  return video;
}

function clearOutgoing() {
  if (!outgoingVideo) return;
  outgoingVideo.getAnimations().forEach(animation => animation.cancel());
  outgoingVideo.pause();
  outgoingVideo.remove();
  outgoingVideo.classList.remove('scene-handoff');
  outgoingVideo = undefined;
}

function detachActive(held) {
  clipEvents?.abort();
  clearOutgoing();
  cancelAnimationFrame(speechFrame);
  speechFrame = undefined;
  stageSpeech.hidden = true;
  flyingLine.hidden = true;
  paperTrail.hidden = true;
  fitnessLine.classList.remove('is-with-character');
  fitnessLine.style.transform = '';
  if (activeVideo && activeVideo !== held) {
    activeVideo.pause();
    activeVideo.remove();
  }
  activeVideo = undefined;
  if (held) {
    outgoingVideo = held;
    held.classList.add('scene-handoff');
  }
}

function showClip(key, dissolve = 0) {
  updateStage(key);
  if (reduced.matches) return;
  const video = prepareClip(key);
  const previous = activeVideo;
  if (video === previous) return;
  const held = dissolve && previous?.classList.contains('is-ready') && previous.readyState >= 2 && !previous.seeking
    ? previous : undefined;
  detachActive(held);
  if (video.currentTime) video.currentTime = 0;
  activeVideo = video;
  video.classList.remove('is-ready');
  sceneLayer.append(video);
  clipEvents = new AbortController();
  const { signal } = clipEvents;
  const ready = () => {
    if (video.error || video.seeking || video.readyState < 2 || video.classList.contains('is-ready')) return;
    video.classList.add('is-ready');
    if (held) {
      const animation = held.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: dissolve, easing: 'ease-in-out', fill: 'forwards',
      });
      animation.onfinish = () => {
        if (outgoingVideo === held) clearOutgoing();
      };
    }
    const next = preloadNext[key];
    if (next && !navigator.connection?.saveData) prepareClip(next);
    renderSpeech();
  };
  for (const event of ['loadeddata', 'seeked', 'canplay']) video.addEventListener(event, ready, { signal });
  const recover = () => {
    video.classList.remove('is-ready');
    clearOutgoing();
    if (chains[key]) return showClip(chains[key]);
    if (!('retry' in video.dataset)) return showClip(key);
    stageSpeech.hidden = true;
    updateControl();
  };
  video.addEventListener('error', recover, { signal, once: true });
  video.addEventListener('pause', renderSpeech, { signal });
  video.addEventListener('playing', renderSpeech, { signal });
  if (video.error) return recover();
  ready();
  updateControl();
  syncMotion();
}

function selectSection(index) {
  clearTimeout(settleTimer);
  settlingSection = undefined;
  if (index === activeSection) return;
  activeSection = index;
  const { clip, group } = sections[index];
  nav.forEach((link) => {
    if (link.dataset.nav === group) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const previous = activeVideo?.dataset.scene;
  const canDepart = activeVideo?.loop && activeVideo.classList.contains('is-ready') && !outgoingVideo;
  const incoming = canDepart && previous === 'gym' && clip === 'track' ? 'to-track'
    : canDepart && previous === 'track' && clip === 'kitchen' ? 'to-kitchen' : clip;
  const walking = incoming !== clip || (canDepart && previous === 'kitchen' && clip === 'finish');
  showClip(incoming, walking ? 300 : 0);
}

function queueNavigation() {
  if (navigationFrame) return;
  navigationFrame = requestAnimationFrame(() => {
    navigationFrame = undefined;
    const index = findSection();
    if (index === activeSection || reduced.matches) selectSection(index);
    else if (index !== settlingSection) {
      clearTimeout(settleTimer);
      settlingSection = index;
      settleTimer = setTimeout(() => {
        const latest = findSection();
        if (latest === index) selectSection(index);
        else {
          settlingSection = undefined;
          queueNavigation();
        }
      }, 120);
    }
  });
}

function updateSpeech(video) {
  const time = clips[video.dataset.scene].start + video.currentTime;
  const spoken = lines.find(([start, end]) => time >= start && time < end);
  stageSpeech.hidden = !spoken || reduced.matches || video.seeking || video.readyState < 2 || !!outgoingVideo;
  const greeting = video.dataset.scene === 'arrival' && !video.seeking;
  const throwingPaper = greeting && !stageSpeech.hidden && time < unfoldEnd;
  fitnessLine.classList.toggle('is-with-character', greeting && !stageSpeech.hidden);
  fitnessLine.style.transform = greeting && time < foldStart
    ? 'translateY(' + (-3 * Math.sin(Math.PI * time / foldStart)) + 'px)' : '';
  if (!throwingPaper) {
    flyingLine.hidden = true;
    paperTrail.hidden = true;
  }
  stageSpeech.classList.toggle('is-intro-paper', greeting);
  stageSpeech.classList.remove('is-forming');
  if (stageSpeech.hidden) return;
  if (speechText.textContent !== spoken[2]) speechText.textContent = spoken[2];
  const frame = time * 15;
  const index = Math.min(mouthTrack.length - 1, Math.floor(frame));
  const point = mouthTrack[index];
  const following = mouthTrack[Math.min(index + 1, mouthTrack.length - 1)];
  const fraction = frame - Math.floor(frame);
  const { clientWidth: width, clientHeight: height, videoWidth, videoHeight } = video;
  const ratio = Math.min(width / videoWidth, height / videoHeight);
  const x = (point[0] + (following[0] - point[0]) * fraction) / 1000;
  const y = (point[1] + (following[1] - point[1]) * fraction) / 1000;
  const mouthX = width / 2 + (x - .5) * videoWidth * ratio;
  const headTop = height / 2 + (y - .5) * videoHeight * ratio;
  const bubbleWidth = stageSpeech.offsetWidth;
  const left = Math.max(7, Math.min(width - bubbleWidth - 7, mouthX - bubbleWidth / 2));
  const top = Math.max(7, headTop - stageSpeech.offsetHeight - 9);
  const tailOffset = Math.max(10, Math.min(bubbleWidth - 10, mouthX - left));
  stageSpeech.style.setProperty('--tail-left', tailOffset + 'px');
  stageSpeech.style.transform = 'translate(' + Math.round(left) + 'px, ' + Math.round(top) + 'px)';
  if (throwingPaper) positionFlyingLine(time, tailOffset);
  if (greeting) stageSpeech.style.setProperty('--paper-tail', progressBetween(time, unfoldEnd, unfoldEnd + .12));
}

function progressBetween(time, start, end) {
  return Math.max(0, Math.min(1, (time - start) / (end - start)));
}

function easeBetween(time, start, end) {
  const fraction = progressBetween(time, start, end);
  return fraction * fraction * (3 - 2 * fraction);
}

function positionFlyingLine(time, tailOffset) {
  const origin = fitnessLine.getBoundingClientRect();
  const readingTop = mobile.matches ? stagePanel.getBoundingClientRect().bottom : header.getBoundingClientRect().bottom;
  if (origin.top < readingTop || origin.bottom > innerHeight) {
    flyingLine.hidden = true;
    paperTrail.hidden = true;
    return;
  }

  const destination = stageSpeech.getBoundingClientRect();
  const opening = easeBetween(time, unfoldStart, unfoldEnd);
  const leftFold = easeBetween(time, foldStart, releaseAt - .24) * (1 - opening);
  const rightFold = easeBetween(time, foldStart + .13, releaseAt - .08) *
    (1 - easeBetween(time, unfoldStart + .10, unfoldEnd));
  const topFold = easeBetween(time, foldStart + .23, releaseAt - .035) *
    (1 - easeBetween(time, unfoldStart, unfoldEnd - .08));
  const bottomFold = easeBetween(time, foldStart + .34, releaseAt) *
    (1 - easeBetween(time, unfoldStart + .06, unfoldEnd - .03));
  const bunch = easeBetween(time, foldStart + .18, releaseAt) * (1 - opening);
  const windup = easeBetween(time, foldStart + .27, releaseAt);
  const travel = progressBetween(time, releaseAt, unfoldStart);
  const width = origin.width + (destination.width - origin.width) * travel;
  const height = origin.height + (destination.height - origin.height) * travel;
  const startX = origin.left + origin.width / 2;
  const startY = origin.top + origin.height / 2;
  const endX = destination.left + tailOffset;
  const endY = destination.top + destination.height / 2;
  const launchX = startX + (mobile.matches ? 38 : -22);
  const launchY = startY + 12;
  const apex = Math.min(launchY, endY, Math.max(
    header.getBoundingClientRect().bottom + 14, endY - (mobile.matches ? 42 : 100),
  ));
  const rise = Math.sqrt(launchY - apex);
  const fall = Math.sqrt(endY - apex);
  const pathX = u => launchX + (endX - launchX) * u;
  const pathY = u => apex + (rise - (rise + fall) * u) ** 2;
  const x = pathX(travel) + (startX - launchX) * (1 - windup) +
    (destination.width / 2 - tailOffset) * opening - width / 2;
  const y = pathY(travel) + (startY - launchY) * (1 - windup) -
    height / 2 + 5 * Math.sin(Math.PI * opening);
  const recoil = 7 * Math.sin(Math.PI * topFold) - 8 * Math.sin(Math.PI * bottomFold);
  const angle = -22 * windup * (1 - travel) + 360 * travel + recoil + 5 * Math.sin(2 * Math.PI * opening);
  const foldWidth = Math.cos(bunch * Math.acos(Math.min(1, 32 / width)));

  const ink = time < unfoldStart ? fitnessText : workoutLine;
  if (flyingInk.textContent !== ink) flyingInk.textContent = ink;
  flyingLine.style.width = width + 'px';
  flyingLine.style.height = height + 'px';
  flyingLine.style.setProperty('--crumple', bunch);
  flyingLine.style.setProperty('--left-fold', leftFold);
  flyingLine.style.setProperty('--right-fold', rightFold);
  flyingLine.style.setProperty('--top-fold', topFold);
  flyingLine.style.setProperty('--bottom-fold', bottomFold);
  flyingLine.style.transform = 'translate(' + x + 'px, ' + y + 'px) rotate(' + angle +
    'deg) scale(' + foldWidth + ', ' + (1 - .26 * bunch) + ')';
  flyingLine.hidden = false;
  stageSpeech.classList.add('is-forming');
  drawPaperTrail(time, pathX, pathY);
}

function drawPaperTrail(time, pathX, pathY) {
  const decay = .085;
  if (!trailBrush || time <= releaseAt || time >= unfoldStart + decay) {
    paperTrail.hidden = true;
    return;
  }

  const ratio = Math.min(devicePixelRatio, 2);
  const width = Math.ceil(innerWidth * ratio);
  const height = Math.ceil(innerHeight * ratio);
  if (paperTrail.width !== width || paperTrail.height !== height) {
    paperTrail.width = width;
    paperTrail.height = height;
  }
  trailBrush.setTransform(ratio, 0, 0, ratio, 0, 0);
  trailBrush.clearRect(0, 0, innerWidth, innerHeight);
  trailBrush.strokeStyle = '#ba8d60';
  trailBrush.lineCap = 'round';

  const tip = Math.min(time, unfoldStart);
  const endFade = 1 - progressBetween(time, unfoldStart, unfoldStart + decay);
  const strokes = 10;
  for (let i = 0; i < strokes; i++) {
    const start = progressBetween(tip - .112 * (1 - i / strokes), releaseAt, unfoldStart);
    const end = progressBetween(tip - .112 * (1 - (i + 1) / strokes), releaseAt, unfoldStart);
    if (start === end) continue;
    trailBrush.globalAlpha = .22 * endFade * ((i + 1) / strokes) ** 1.4;
    trailBrush.lineWidth = .5 + 1.05 * i / strokes;
    trailBrush.beginPath();
    trailBrush.moveTo(pathX(start), pathY(start));
    trailBrush.lineTo(pathX(end), pathY(end));
    trailBrush.stroke();
  }
  paperTrail.hidden = false;
}

function renderSpeech() {
  cancelAnimationFrame(speechFrame);
  speechFrame = undefined;
  const video = activeVideo;
  if (!video?.classList.contains('is-ready') || video.error) return;
  const { start } = clips[video.dataset.scene];
  const time = start + video.currentTime;
  const lastLine = lines.findLast(([from]) => from < start + video.duration);
  updateSpeech(video);
  if (lastLine && time < lastLine[1] && !video.paused && !document.hidden) speechFrame = requestAnimationFrame(renderSpeech);
}

function updateControl() {
  watchIntro.hidden = reduced.matches;
  const failed = !!activeVideo?.error;
  const complete = activeVideo?.ended;
  watchIntroIcon.hidden = !failed && !paused && !complete;
  watchIntroLabel.textContent = failed ? 'Retry animation' : complete ? 'Replay scene' : paused ? 'Resume workout' : 'Pause workout';
}

function syncMotion() {
  for (const video of [activeVideo, outgoingVideo]) {
    if (!video) continue;
    if (paused || document.hidden || reduced.matches) video.pause();
    else if (!video.ended) video.play().catch(() => {});
  }
}

function applyMotionPreference() {
  if (reduced.matches) detachActive();
  showClip(sections[activeSection].clip);
  updateControl();
}

watchIntro.addEventListener('click', () => {
  if (!activeVideo) return;
  if (activeVideo.error) {
    paused = false;
    return showClip(activeVideo.dataset.scene);
  }
  if (activeVideo.ended) {
    activeVideo.currentTime = 0;
    paused = false;
  } else paused = !paused;
  updateControl();
  syncMotion();
});
addEventListener('scroll', queueNavigation, { passive: true });
addEventListener('hashchange', queueNavigation);
addEventListener('resize', () => {
  queueNavigation();
  renderSpeech();
}, { passive: true });
document.fonts?.ready.then(queueNavigation);
document.addEventListener('visibilitychange', syncMotion);
reduced.addEventListener('change', applyMotionPreference);
sceneWindow.append(stageSpeech);
document.body.append(paperTrail, flyingLine);
poster.addEventListener('error', event => {
  if (event.currentTarget !== poster) return;
  poster.hidden = true;
  if (!pendingPoster) updatePoster(posterPath);
}, { once: true });
if (poster.complete && !poster.naturalWidth) poster.hidden = true;
const target = document.getElementById(location.hash.slice(1));
const targetSection = target ? sections.findLastIndex(({ element }) => element.contains(target)) : -1;
selectSection(targetSection >= 0 ? targetSection : findSection());
updateControl();
