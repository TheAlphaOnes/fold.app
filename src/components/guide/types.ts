import type { GuideStep, GuideStepId } from '@/constants/guide';
import type { GuideStatus } from '@/hooks/use-guide-flow';
import type { Composition } from '@/types/journal';

/** Measured size of the area a stage may draw into. */
export interface StageArea {
  width: number;
  height: number;
}

/** The user's newest memory, as tracked by useLatestMemory. */
export interface LatestMemory {
  memory: Composition | null;
  loaded: boolean;
  /** Re-reads from the database, for writes that do not bump hydrationVersion. */
  reload: () => Promise<Composition | null>;
}

/** Props every guide stage receives from the guide screen. */
export interface GuideStageProps {
  step: GuideStep;
  status: GuideStatus;
  area: StageArea;
  /** Marks the step done; the flow plays the success beat and advances. */
  onSuccess: () => void;
  /** Shows a short corrective line in place of the hint. */
  onNudge: (message: string) => void;
  onGoToStep: (id: GuideStepId) => void;
}
