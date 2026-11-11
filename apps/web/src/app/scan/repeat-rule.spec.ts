import { ABSENCE_MS, createRepeatRule } from './repeat-rule';

// The repeat rule of ADR 0009, with a fake clock. One barcode value is one scan
// while the decoder finds it in consecutive frames. It is a new scan after it
// is absent from the frames for one second.
function fakeClock() {
  let now = 0;
  return {
    advance(ms: number) {
      now += ms;
    },
    now: () => now,
  };
}

describe('the repeat rule of the scanner', () => {
  it('reports a value as a scan the first time it is in a frame', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);

    expect(scansInFrame(['5449000000996'])).toEqual(['5449000000996']);
  });

  it('reports a value one time while it stays in consecutive frames', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);
    scansInFrame(['5449000000996']);

    for (let frame = 0; frame < 10; frame += 1) {
      clock.advance(200);
      expect(scansInFrame(['5449000000996'])).toEqual([]);
    }
  });

  it('reports a value again after it was absent for more than one second', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);
    scansInFrame(['5449000000996']);

    clock.advance(ABSENCE_MS + 1);
    expect(scansInFrame(['5449000000996'])).toEqual(['5449000000996']);
  });

  it('keeps a value as one scan when it comes back within one second', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);
    scansInFrame(['5449000000996']);

    clock.advance(400);
    scansInFrame([]);
    clock.advance(600);
    expect(scansInFrame(['5449000000996'])).toEqual([]);
  });

  it('counts the absence from the last frame that held the value', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);
    scansInFrame(['5449000000996']);
    clock.advance(900);
    scansInFrame(['5449000000996']);

    clock.advance(900);
    expect(scansInFrame(['5449000000996'])).toEqual([]);
    clock.advance(ABSENCE_MS + 1);
    expect(scansInFrame(['5449000000996'])).toEqual(['5449000000996']);
  });

  it('reports two different values in one frame as two scans', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);

    expect(scansInFrame(['5449000000996', '7622300441937'])).toEqual([
      '5449000000996',
      '7622300441937',
    ]);
  });

  it('reports a value that is two times in one frame as one scan', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);

    expect(scansInFrame(['5449000000996', '5449000000996'])).toEqual([
      '5449000000996',
    ]);
  });

  it('ignores an empty value', () => {
    const clock = fakeClock();
    const scansInFrame = createRepeatRule(clock.now);

    expect(scansInFrame([''])).toEqual([]);
  });

  it('is one second', () => {
    expect(ABSENCE_MS).toBe(1000);
  });
});
