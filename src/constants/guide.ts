/**
 * Field Guide — curriculum definition.
 *
 * Pure data: the guide screen, the edge-tab progress ring and settings all
 * read from here, so the number of missions and their copy can never drift
 * between surfaces.
 *
 * Hierarchy:
 *   Chapter (6)  → a theme, shown as a tick group in the guide header
 *   Mission (17) → a persisted unit of progress (GuideProgress key, ring count)
 *   Step    (20) → one gesture, action or explainer; a mission completes on its last step
 *
 * Steps on the 'launch' stage are done in the real app: the guide opens the
 * screen (composer, a memory, stamps, the map) and the app marks the mission
 * when it's actually used there. Nothing is ticked by tapping "next".
 */

import type { GuideProgress } from '@/hooks/use-settings';

export type GuideMissionId = keyof GuideProgress;

export type GuideStepId =
  | 'write'
  | 'voice'
  | 'capture'
  | 'open'
  | 'share'
  | 'drag'
  | 'pinch'
  | 'chapter'
  | 'tag'
  | 'ink'
  | 'reminders'
  | 'today'
  | 'template'
  | 'addrow'
  | 'frame'
  | 'pages'
  | 'stampmake'
  | 'stampdrawer'
  | 'stampmap'
  | 'stampsticker';

/** Which interactive surface a step is performed on. */
export type GuideStage = 'trigger' | 'memory' | 'canvas' | 'chapter' | 'tag' | 'ink' | 'reminders' | 'today' | 'launch';

/** Where a 'launch' step is done: the real screen the guide opens. */
export type GuideLaunch = 'compose' | 'latest-memory' | 'stamps' | 'stamps-map';

/** The gesture the ghost-finger demo performs for a step. */
export type GuideGesture =
  | 'tap'
  | 'hold'
  | 'swipe-up'
  | 'double-tap'
  | 'long-press'
  | 'drag'
  | 'pinch'
  | 'none';

export type GuideChapterId = 'capture' | 'make' | 'revisit' | 'stamps' | 'stories' | 'habit';

export interface GuideChapter {
  id: GuideChapterId;
  label: string;
  missions: GuideMissionId[];
}

export interface GuideStep {
  id: GuideStepId;
  mission: GuideMissionId;
  chapter: GuideChapterId;
  stage: GuideStage;
  gesture: GuideGesture;
  title: string;
  hint: string;
  success: string;
  /** 'launch' steps: the screen to open, and its button's label. */
  launch?: GuideLaunch;
  action?: string;
}

export const GUIDE_CHAPTERS: readonly GuideChapter[] = [
  { id: 'capture', label: 'CAPTURE', missions: ['write', 'voice', 'capture', 'today'] },
  { id: 'make', label: 'MAKE', missions: ['template', 'addrow', 'stickers', 'frame'] },
  { id: 'revisit', label: 'REVISIT', missions: ['inspect', 'pages', 'share'] },
  { id: 'stamps', label: 'STAMPS', missions: ['stampmake', 'stampdrawer', 'stampmap', 'stampsticker'] },
  { id: 'stories', label: 'STORIES', missions: ['stories'] },
  { id: 'habit', label: 'HABIT', missions: ['rhythm'] },
];

export const GUIDE_STEPS: readonly GuideStep[] = [
  // ── CAPTURE: the orange key, and today's page ─────────────────────────
  { id: 'write', mission: 'write', chapter: 'capture', stage: 'trigger', gesture: 'tap', title: 'TAP TO WRITE', hint: 'one tap opens a blank page.', success: 'WRITTEN' },
  { id: 'voice', mission: 'voice', chapter: 'capture', stage: 'trigger', gesture: 'hold', title: 'HOLD TO RECORD', hint: 'hold, talk, then save it to a page.', success: 'RECORDED' },
  { id: 'capture', mission: 'capture', chapter: 'capture', stage: 'trigger', gesture: 'swipe-up', title: 'SWIPE UP TO SNAP', hint: 'slide the key up past the mark.', success: 'CAPTURED' },
  { id: 'today', mission: 'today', chapter: 'capture', stage: 'today', gesture: 'tap', title: "TODAY'S PAGE", hint: 'pick a template, then shoot.', success: 'KEPT' },
  // ── MAKE: the composer, done on the real one ──────────────────────────
  { id: 'template', mission: 'template', chapter: 'make', stage: 'launch', gesture: 'none', title: 'PICK A TEMPLATE', hint: 'the pill at the bottom sets the layout.', success: 'LAID OUT', launch: 'compose', action: 'OPEN A PAGE' },
  { id: 'addrow', mission: 'addrow', chapter: 'make', stage: 'launch', gesture: 'none', title: 'ADD TO THE PAGE', hint: 'the row up top adds text, doodles, stamps.', success: 'ADDED', launch: 'compose', action: 'OPEN A PAGE' },
  { id: 'drag', mission: 'stickers', chapter: 'make', stage: 'canvas', gesture: 'drag', title: 'DRAG TO MOVE', hint: 'drag a sticker anywhere.', success: 'MOVED' },
  { id: 'pinch', mission: 'stickers', chapter: 'make', stage: 'canvas', gesture: 'pinch', title: 'PINCH TO RESIZE', hint: 'spread two fingers to resize.', success: 'RESIZED' },
  { id: 'frame', mission: 'frame', chapter: 'make', stage: 'launch', gesture: 'none', title: 'TAP A PHOTO', hint: 'replace it, flip it, or take it out.', success: 'REFRAMED', launch: 'compose', action: 'OPEN A PAGE' },
  // ── REVISIT ───────────────────────────────────────────────────────────
  { id: 'open', mission: 'inspect', chapter: 'revisit', stage: 'memory', gesture: 'double-tap', title: 'DOUBLE TAP TO OPEN', hint: 'two quick taps open a memory.', success: 'OPENED' },
  { id: 'pages', mission: 'pages', chapter: 'revisit', stage: 'launch', gesture: 'none', title: 'SWIPE ITS PAGES', hint: 'photos, doodles and stamps, one by one.', success: 'LEAFED', launch: 'latest-memory', action: 'OPEN A MEMORY' },
  { id: 'share', mission: 'share', chapter: 'revisit', stage: 'memory', gesture: 'long-press', title: 'HOLD FOR OPTIONS', hint: 'hold a memory, then tap share.', success: 'SHARED' },
  // ── STAMPS ────────────────────────────────────────────────────────────
  { id: 'stampmake', mission: 'stampmake', chapter: 'stamps', stage: 'launch', gesture: 'none', title: 'MAKE A STAMP', hint: 'a photo of where you are, kept as proof.', success: 'STAMPED', launch: 'stamps', action: 'OPEN STAMPS' },
  { id: 'stampdrawer', mission: 'stampdrawer', chapter: 'stamps', stage: 'launch', gesture: 'none', title: 'YOUR COLLECTION', hint: 'pull the stamps up from the bottom.', success: 'COLLECTED', launch: 'stamps', action: 'OPEN STAMPS' },
  { id: 'stampmap', mission: 'stampmap', chapter: 'stamps', stage: 'launch', gesture: 'none', title: 'WHERE YOU WENT', hint: 'every stamp, pinned to its place.', success: 'MAPPED', launch: 'stamps-map', action: 'OPEN THE MAP' },
  { id: 'stampsticker', mission: 'stampsticker', chapter: 'stamps', stage: 'launch', gesture: 'none', title: 'STAMP A PAGE', hint: 'add a stamp from the row up top.', success: 'STUCK', launch: 'compose', action: 'OPEN A PAGE' },
  // ── STORIES ───────────────────────────────────────────────────────────
  { id: 'chapter', mission: 'stories', chapter: 'stories', stage: 'chapter', gesture: 'none', title: 'START A CHAPTER', hint: 'chapters gather your memories.', success: 'CHAPTER MADE' },
  { id: 'tag', mission: 'stories', chapter: 'stories', stage: 'tag', gesture: 'double-tap', title: 'FILE A MEMORY', hint: 'open it, then tap the book.', success: 'FILED' },
  // ── HABIT ─────────────────────────────────────────────────────────────
  { id: 'ink', mission: 'rhythm', chapter: 'habit', stage: 'ink', gesture: 'none', title: 'EVERY DAY INKS', hint: 'show up, and your month fills with ink.', success: 'GOT IT' },
  { id: 'reminders', mission: 'rhythm', chapter: 'habit', stage: 'reminders', gesture: 'none', title: 'THREE NUDGES A DAY', hint: 'tap one and the camera opens.', success: 'ALL SET' },
];

export const GUIDE_MISSION_COUNT = GUIDE_CHAPTERS.reduce(
  (count, chapter) => count + chapter.missions.length,
  0,
);

/** All missions marked complete — used when the guide is finished. */
export const COMPLETED_GUIDE_PROGRESS: GuideProgress = {
  write: true,
  voice: true,
  capture: true,
  inspect: true,
  share: true,
  stickers: true,
  stories: true,
  rhythm: true,
  today: true,
  template: true,
  addrow: true,
  frame: true,
  pages: true,
  stampmake: true,
  stampdrawer: true,
  stampmap: true,
  stampsticker: true,
};

export function stepIndexOf(id: GuideStepId): number {
  return GUIDE_STEPS.findIndex((step) => step.id === id);
}

export function isGuideStepId(value: unknown): value is GuideStepId {
  return typeof value === 'string' && GUIDE_STEPS.some((step) => step.id === value);
}

/** Steps belonging to one mission, in curriculum order. */
export function stepsForMission(mission: GuideMissionId): GuideStep[] {
  return GUIDE_STEPS.filter((step) => step.mission === mission);
}

/** True when this step is the one that completes its mission. */
export function isMissionFinalStep(step: GuideStep): boolean {
  const steps = stepsForMission(step.mission);
  return steps[steps.length - 1]?.id === step.id;
}

/** First step whose mission is not yet complete, or null when all are done. */
export function firstIncompleteStepIndex(progress: GuideProgress): number | null {
  const index = GUIDE_STEPS.findIndex((step) => !progress[step.mission]);
  return index === -1 ? null : index;
}

/** Position label for a step inside its chapter, e.g. "1/3". */
export function chapterPosition(step: GuideStep): { chapterNumber: number; index: number; total: number } {
  const chapterNumber = GUIDE_CHAPTERS.findIndex((chapter) => chapter.id === step.chapter) + 1;
  const chapterSteps = GUIDE_STEPS.filter((candidate) => candidate.chapter === step.chapter);
  return {
    chapterNumber,
    index: chapterSteps.findIndex((candidate) => candidate.id === step.id) + 1,
    total: chapterSteps.length,
  };
}
