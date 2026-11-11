import { beforeEach, describe, expect, it } from 'vitest';

import { useProfileVisibility } from '../use-profile-visibility';

describe('useProfileVisibility', () => {
  beforeEach(() => {
    useProfileVisibility.setState({ open: false, everOpened: false });
  });

  it('opens and closes the layer', () => {
    useProfileVisibility.getState().openProfile();
    expect(useProfileVisibility.getState().open).toBe(true);

    useProfileVisibility.getState().closeProfile();
    expect(useProfileVisibility.getState().open).toBe(false);
  });

  it('is idempotent, so a double tap on the tab costs nothing', () => {
    useProfileVisibility.getState().openProfile();
    useProfileVisibility.getState().openProfile();

    expect(useProfileVisibility.getState().open).toBe(true);
  });

  it('keeps the content alive for the session once opened', () => {
    useProfileVisibility.getState().openProfile();
    useProfileVisibility.getState().closeProfile();

    expect(useProfileVisibility.getState().everOpened).toBe(true);
  });
});
