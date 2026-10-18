/**
 * Field Guide — an interactive tour of Fold's gestures, performed on real
 * controls and (wherever a memory is involved) the user's real memories.
 *
 * This screen only coordinates: the curriculum lives in constants/guide, the
 * step state machine in useGuideFlow, and each chapter's interaction in its
 * stage component. Trays render here, at the screen root, above every stage.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';

import { GrainBackground } from '@/components/grain-background';
import { RecordingOverlay } from '@/components/recording-overlay';
import { CreateStoryTray } from '@/components/create-story-tray';
import { GuideHeader } from '@/components/guide/guide-header';
import { GuidePrompt } from '@/components/guide/guide-prompt';
import { GuideComplete } from '@/components/guide/guide-complete';
import { TriggerStage } from '@/components/guide/trigger-stage';
import { MemoryStage } from '@/components/guide/memory-stage';
import { CanvasStage } from '@/components/guide/canvas-stage';
import { ChapterStage } from '@/components/guide/chapter-stage';
import { TagStage } from '@/components/guide/tag-stage';
import type { GuideStageProps, StageArea } from '@/components/guide/types';
import { isGuideStepId } from '@/constants/guide';
import { fadeOut, riseIn } from '@/constants/motion';
import { useGuideFlow } from '@/hooks/use-guide-flow';
import { useLatestMemory } from '@/hooks/use-latest-memory';
import { useQuickCapture } from '@/hooks/use-quick-capture';
import { useTheme } from '@/hooks/use-theme';
import type { Story } from '@/types/journal';
import { goBack } from '@/utils/navigation';

const NUDGE_MS = 2800;

type Overlay = 'create-chapter' | null;

export default function FieldGuideScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ step?: string }>();
  const flow = useGuideFlow(isGuideStepId(params.step) ? params.step : undefined);
  const { step, status } = flow;

  const latest = useLatestMemory();
  const quickCapture = useQuickCapture();

  const [chapter, setChapter] = useState<Story | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);

  // A nudge belongs to the moment it was raised: it disappears on its own
  // after a few seconds, or immediately once the step or its status changes.
  const momentKey = `${step?.id ?? 'complete'}:${status}`;
  const [nudgeState, setNudgeState] = useState<{ message: string; key: string } | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showNudge = useCallback((message: string) => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    setNudgeState({ message, key: momentKey });
    nudgeTimer.current = setTimeout(() => setNudgeState(null), NUDGE_MS);
  }, [momentKey]);
  useEffect(() => () => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
  }, []);
  const nudge = nudgeState?.key === momentKey ? nudgeState.message : null;

  const [area, setArea] = useState<StageArea | null>(null);
  const onStageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((previous) =>
      previous && previous.width === width && previous.height === height ? previous : { width, height },
    );
  };

  const leave = useCallback(() => {
    goBack();
  }, []);

  const handleFinish = useCallback(async () => {
    await flow.finish();
    leave();
  }, [flow, leave]);

  const handleChapterCreated = useCallback((story: Story) => {
    setChapter(story);
    if (step?.id === 'chapter') flow.succeed();
  }, [step?.id, flow]);

  const renderStage = () => {
    if (!step || !area) return null;
    const shared: GuideStageProps = {
      step,
      status,
      area,
      onSuccess: flow.succeed,
      onNudge: showNudge,
      onGoToStep: flow.goToStep,
    };

    switch (step.stage) {
      case 'trigger':
        return (
          <TriggerStage {...shared} latest={latest} sessionStartId={latest.firstId} quickCapture={quickCapture} />
        );
      case 'memory':
        return <MemoryStage {...shared} latest={latest} />;
      case 'canvas':
        return <CanvasStage {...shared} />;
      case 'chapter':
        return (
          <ChapterStage status={status} chapter={chapter} onNameChapter={() => setOverlay('create-chapter')} />
        );
      case 'tag':
        return <TagStage {...shared} latest={latest} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <GrainBackground />

      <GuideHeader
        currentMission={step?.mission ?? null}
        missionState={flow.missionState}
        onSelectMission={flow.goToMission}
        onClose={leave}
        onSkip={flow.isComplete ? undefined : flow.skip}
      />

      {flow.isComplete ? (
        <GuideComplete onFinish={handleFinish} />
      ) : (
        <>
          {step && <GuidePrompt step={step} status={status} nudge={nudge} />}
          <View style={styles.stage} onLayout={onStageLayout}>
            {/* Keyed by stage, not step: drag → pinch keeps the same canvas. */}
            <Animated.View
              key={step?.stage}
              entering={riseIn(320, 60, 14)}
              exiting={fadeOut()}
              style={styles.stageInner}
            >
              {renderStage()}
            </Animated.View>
          </View>
        </>
      )}

      {overlay === 'create-chapter' && (
        <CreateStoryTray
          navigateOnCreate={false}
          onClose={() => setOverlay(null)}
          onSuccess={handleChapterCreated}
        />
      )}

      <RecordingOverlay
        visible={quickCapture.isRecording}
        durationMillis={quickCapture.durationMillis}
        onStop={quickCapture.stopRecording}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stage: {
    flex: 1,
  },
  stageInner: {
    flex: 1,
  },
});
