/**
 * useGuideFlow — the field guide's step state machine.
 *
 * Owns which step is active, the short success hold before advancing, skip,
 * jumping between missions, and persisting a mission once its final step is
 * done. Stages never touch settings directly; they only call `succeed()`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { haptic } from '@/services/haptics';

import {
  COMPLETED_GUIDE_PROGRESS,
  GUIDE_STEPS,
  firstIncompleteStepIndex,
  isMissionFinalStep,
  stepIndexOf,
  stepsForMission,
  type GuideMissionId,
  type GuideStep,
  type GuideStepId,
} from '@/constants/guide';
import { useSettingsStore } from '@/hooks/use-settings';

/** How long the success label holds before the next step slides in. */
const SUCCESS_HOLD_MS = 1100;
const COMPLETE_INDEX = GUIDE_STEPS.length;

export type GuideStatus = 'active' | 'success';
export type MissionState = 'done' | 'partial' | 'todo';

export function useGuideFlow(initialStep?: GuideStepId) {
  const progress = useSettingsStore((state) => state.settings.guideProgress);
  const completeGuideStep = useSettingsStore((state) => state.completeGuideStep);
  const updateSetting = useSettingsStore((state) => state.updateSetting);

  const [stepIndex, setStepIndex] = useState<number>(() => {
    if (initialStep) return stepIndexOf(initialStep);
    return firstIncompleteStepIndex(useSettingsStore.getState().settings.guideProgress) ?? COMPLETE_INDEX;
  });
  const [status, setStatus] = useState<GuideStatus>('active');
  // Steps finished this session — lets a two-step mission show half progress.
  const [doneSteps, setDoneSteps] = useState<ReadonlySet<GuideStepId>>(() => new Set());

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAdvanceTimer = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };
  useEffect(() => clearAdvanceTimer, []);

  const step: GuideStep | null = GUIDE_STEPS[stepIndex] ?? null;
  const isComplete = stepIndex >= COMPLETE_INDEX;

  const recordDone = useCallback((target: GuideStep) => {
    setDoneSteps((previous) => new Set(previous).add(target.id));
    if (isMissionFinalStep(target)) {
      completeGuideStep(target.mission);
    }
  }, [completeGuideStep]);

  /** The guide is linear: every step leads to the next, the last to completion. */
  const nextIndexAfter = useCallback((index: number): number => {
    return Math.min(index + 1, COMPLETE_INDEX);
  }, []);

  const succeed = useCallback(() => {
    if (!step || status === 'success') return;
    haptic.success();
    recordDone(step);
    setStatus('success');

    clearAdvanceTimer();
    const fromIndex = stepIndex;
    advanceTimer.current = setTimeout(() => {
      setStepIndex(nextIndexAfter(fromIndex));
      setStatus('active');
    }, SUCCESS_HOLD_MS);
  }, [step, status, stepIndex, recordDone, nextIndexAfter]);

  const skip = useCallback(() => {
    if (!step) return;
    haptic.select();
    clearAdvanceTimer();
    recordDone(step);
    setStatus('active');
    setStepIndex(nextIndexAfter(stepIndex));
  }, [step, stepIndex, recordDone, nextIndexAfter]);

  const goToStep = useCallback((id: GuideStepId) => {
    haptic.select();
    clearAdvanceTimer();
    setStatus('active');
    setStepIndex(stepIndexOf(id));
  }, []);

  const goToMission = useCallback((mission: GuideMissionId) => {
    const first = stepsForMission(mission)[0];
    if (first) goToStep(first.id);
  }, [goToStep]);

  /** Persists completion and hides the edge tab. Navigation is the caller's job. */
  const finish = useCallback(async () => {
    await updateSetting('guideProgress', COMPLETED_GUIDE_PROGRESS);
    await updateSetting('guideDismissed', true);
  }, [updateSetting]);

  const missionState = useCallback((mission: GuideMissionId): MissionState => {
    if (progress[mission]) return 'done';
    const steps = stepsForMission(mission);
    return steps.some((candidate) => doneSteps.has(candidate.id)) ? 'partial' : 'todo';
  }, [progress, doneSteps]);

  const completedMissions = useMemo(
    () => Object.values(progress).filter(Boolean).length,
    [progress],
  );

  return {
    step,
    stepIndex,
    status,
    isComplete,
    completedMissions,
    succeed,
    skip,
    goToStep,
    goToMission,
    finish,
    missionState,
  };
}

export type GuideFlow = ReturnType<typeof useGuideFlow>;
