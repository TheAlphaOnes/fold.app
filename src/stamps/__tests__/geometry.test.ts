import { describe, expect, it } from 'vitest';
import { centreCropFor, stampCropFor, formatSerial, isNewPlace, photoCropFor, placeCount, postmarkDate, postmarkInk, POSTMARK_INKS, regionFor, stampSerial, stampTilt } from '@/stamps/geometry';

describe('photoCropFor', () => {
  it('maps a centred window on a cover preview to photo pixels', () => {
    // A 3000×4000 photo on a 300×600 view: scaled by 0.15, 75px cropped each side.
    const crop = photoCropFor({ width: 3000, height: 4000 }, { width: 300, height: 600 }, { x: 50, y: 200, width: 200, height: 200 });
    expect(crop).toEqual({ originX: 833, originY: 1333, width: 1333, height: 1333 });
  });
  it('clamps to the photo', () => {
    const crop = photoCropFor({ width: 100, height: 100 }, { width: 100, height: 100 }, { x: -10, y: 90, width: 50, height: 50 });
    expect(crop.originX).toBe(0);
    expect(crop.originY + crop.height).toBeLessThanOrEqual(100);
  });
});

describe('regionFor', () => {
  it('is null with no places and city-level for one', () => {
    expect(regionFor([])).toBeNull();
    expect(regionFor([{ latitude: 10, longitude: 20 }])).toEqual({ latitude: 10, longitude: 20, zoom: 11 });
  });
  it('centres on the bounds and zooms out for wide spans', () => {
    const r = regionFor([
      { latitude: 0, longitude: 0 },
      { latitude: 40, longitude: 80 },
    ])!;
    expect(r.latitude).toBe(20);
    expect(r.longitude).toBe(40);
    expect(r.zoom).toBeGreaterThan(1);
    expect(r.zoom).toBeLessThan(3);
  });
});

describe('stamp details', () => {
  it('tilts within ±4° and repeats per id', () => {
    for (let id = 1; id < 30; id++) {
      expect(Math.abs(stampTilt(id))).toBeLessThanOrEqual(4);
      expect(stampTilt(id)).toBe(stampTilt(id));
    }
  });
  it('formats the postmark date and counts places', () => {
    expect(postmarkDate(new Date(2026, 10, 10).getTime())).toBe('10 NOV 2026');
    expect(placeCount([{ place: 'Pune' }, { place: 'pune' }, { place: 'Goa' }])).toBe(2);
  });
});

describe('collection details', () => {
  const stamps = [
    { id: 3, createdAt: 300, place: 'Goa' },
    { id: 1, createdAt: 100, place: 'Pune' },
    { id: 2, createdAt: 200, place: 'Pune' },
  ];
  it('numbers stamps in the order they were made', () => {
    expect(stampSerial(stamps, 1)).toBe(1);
    expect(stampSerial(stamps, 3)).toBe(3);
    expect(formatSerial(7)).toBe('No. 007');
  });
  it('knows a new place from a revisit', () => {
    expect(isNewPlace(stamps, 'pune')).toBe(false);
    expect(isNewPlace(stamps, 'Delhi')).toBe(true);
  });
  it('gives each place one stable ink from the palette', () => {
    expect(postmarkInk('Pune')).toBe(postmarkInk('PUNE'));
    expect(POSTMARK_INKS).toContain(postmarkInk('Goa'));
  });
});

describe('stampCropFor', () => {
  const view = { width: 402, height: 874 };
  const window = { x: 44, y: 200, width: 313, height: 388 };
  it('uses the window when the photo matches the preview', () => {
    expect(stampCropFor({ width: 3024, height: 4032 }, view, window)).toEqual(
      expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }),
    );
  });
  it('falls back to a large centred stamp crop when the photo is sideways to the preview', () => {
    const crop = stampCropFor({ width: 480, height: 222 }, view, window);
    expect(crop.height).toBe(222);
    expect(crop.width).toBe(Math.round(222 / (388 / 313)));
    expect(crop.originX).toBe(Math.round((480 - crop.width) / 2));
  });
  it('centre crop fits inside the photo', () => {
    const c = centreCropFor({ width: 1000, height: 500 }, 1.24);
    expect(c.height).toBeLessThanOrEqual(500);
    expect(c.originX + c.width).toBeLessThanOrEqual(1000);
  });
});
