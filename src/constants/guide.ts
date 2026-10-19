/**
 * Field Guide — curriculum definition.
 *
 * Pure data: the guide screen, the edge-tab progress ring and settings all
 * read from here, so the number of missions and their copy can never drift
 * between surfaces.
 *
 * Hierarchy:
 *   Chapter (5)  → a theme, shown as a tick group in the guide header
 *   Mission (8)  → a persisted unit of progress (GuideProgress key, ring count)
 *   Step    (11) → one gesture, action or explainer; a mission completes on its last step
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
  | 'reminders';

/** Which interactive surface a step is performed on. */
export type GuideStage = 'trigger' | 'memory' | 'canvas' | 'chapter' | 'tag' | 'ink' | 'reminders';

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

export type GuideChapterId = 'capture' | 'revisit' | 'canvas' | 'stories' | 'habit';

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
}

export const GUIDE_CHAPTERS: readonly GuideChapter[] = [
  { id: 'capture', label: 'CAPTURE', missions: ['write', 'voice', 'capture'] },
  { id: 'revisit', label: 'REVISIT', missions: ['inspect', 'share'] },
  { id: 'canvas', label: 'CANVAS', missions: ['stickers'] },
  { id: 'stories', label: 'STORIES', missions: ['stories'] },
  { id: 'habit', label: 'HABIT', missions: ['rhythm'] },
];

export const GUIDE_STEPS: readonly GuideStep[] = [
  {
    id: 'write',
    mission: 'write',
    chapter: 'capture',
    stage: 'trigger',
    gesture: 'tap',
    title: 'TAP TO WRITE',
    hint: 'one tap opens a blank page.',
    success: 'WRITTEN',
  },
  {
    id: 'voice',
    mission: 'voice',
    chapter: 'capture',
    stage: 'trigger',
    gesture: 'hold',
    title: 'HOLD TO RECORD',
    hint: 'hold to start, tap to stop.',
    success: 'RECORDED',
  },
  {
    id: 'capture',
    mission: 'capture',
    chapter: 'capture',
    stage: 'trigger',
    gesture: 'swipe-up',
    title: 'SWIPE UP TO SNAP',
    hint: 'slide the key up past the mark.',
    success: 'CAPTURED',
  },
  {
    id: 'open',
    mission: 'inspect',
    chapter: 'revisit',
    stage: 'memory',
    gesture: 'double-tap',
    title: 'DOUBLE TAP TO OPEN',
    hint: 'two quick taps open a memory.',
    success: 'OPENED',
  },
  {
    id: 'share',
    mission: 'share',
    chapter: 'revisit',
    stage: 'memory',
    gesture: 'long-press',
    title: 'HOLD TO SHARE',
    hint: 'hold a memory to print a card.',
    success: 'SHARED',
  },
  {
    id: 'drag',
    mission: 'stickers',
    chapter: 'canvas',
    stage: 'canvas',
    gesture: 'drag',
    title: 'HOLD, THEN DRAG',
    hint: 'hold a sticker, then move it.',
    success: 'MOVED',
  },
  {
    id: 'pinch',
    mission: 'stickers',
    chapter: 'canvas',
    stage: 'canvas',
    gesture: 'pinch',
    title: 'PINCH TO RESIZE',
    hint: 'spread two fingers to resize.',
    success: 'RESIZED',
  },
  {
    id: 'chapter',
    mission: 'stories',
    chapter: 'stories',
    stage: 'chapter',
    gesture: 'none',
    title: 'START A CHAPTER',
    hint: 'chapters gather your memories.',
    success: 'CHAPTER MADE',
  },
  {
    id: 'tag',
    mission: 'stories',
    chapter: 'stories',
    stage: 'tag',
    gesture: 'double-tap',
    title: 'FILE A MEMORY',
    hint: 'open it, then tap the book.',
    success: 'FILED',
  },
  {
    id: 'ink',
    mission: 'rhythm',
    chapter: 'habit',
    stage: 'ink',
    gesture: 'none',
    title: 'EVERY DAY INKS',
    hint: 'show up, and your month fills with ink.',
    success: 'GOT IT',
  },
  {
    id: 'reminders',
    mission: 'rhythm',
    chapter: 'habit',
    stage: 'reminders',
    gesture: 'none',
    title: 'THREE NUDGES A DAY',
    hint: 'tap one and the camera opens.',
    success: 'ALL SET',
  },
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
