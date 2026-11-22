import { computeEffectiveStatus, endOfReturnDay } from '../modules/guard/gatePassStatus';
import { GatePassStatus } from '@hostel/shared-types';

describe('endOfReturnDay', () => {
  it('returns the last millisecond of the expected-return day in UTC', () => {
    expect(endOfReturnDay(new Date('2026-11-22T09:15:00Z')).toISOString()).toBe(
      '2026-11-22T23:59:59.999Z',
    );
  });
});

describe('computeEffectiveStatus', () => {
  const now = new Date('2026-11-22T12:00:00Z');

  it('reports out_of_hostel as overdue only after the return day has fully elapsed', () => {
    const pass = {
      status: GatePassStatus.OUT_OF_HOSTEL,
      actualReturnTime: null,
      expectedReturn: new Date('2026-11-21T18:00:00Z'),
    };

    expect(computeEffectiveStatus(pass, now)).toBe(GatePassStatus.OVERDUE);
  });

  it('does not report overdue while the return day is still in progress', () => {
    const pass = {
      status: GatePassStatus.OUT_OF_HOSTEL,
      actualReturnTime: null,
      expectedReturn: new Date('2026-11-22T18:00:00Z'),
    };

    expect(computeEffectiveStatus(pass, now)).toBe(GatePassStatus.OUT_OF_HOSTEL);
  });

  it('never reports overdue once the student has actually returned', () => {
    const pass = {
      status: GatePassStatus.OUT_OF_HOSTEL,
      actualReturnTime: new Date('2026-11-22T10:00:00Z'),
      expectedReturn: new Date('2026-11-21T18:00:00Z'),
    };

    expect(computeEffectiveStatus(pass, now)).toBe(GatePassStatus.OUT_OF_HOSTEL);
  });

  it('passes through issued passes unchanged even past the expected return', () => {
    const pass = {
      status: GatePassStatus.APPROVED,
      actualReturnTime: null,
      expectedReturn: new Date('2026-11-01T18:00:00Z'),
    };

    expect(computeEffectiveStatus(pass, now)).toBe(GatePassStatus.APPROVED);
  });

  it('passes through returned passes unchanged', () => {
    const pass = {
      status: GatePassStatus.RETURNED,
      actualReturnTime: new Date('2026-11-20T10:00:00Z'),
      expectedReturn: new Date('2026-11-01T18:00:00Z'),
    };

    expect(computeEffectiveStatus(pass, now)).toBe(GatePassStatus.RETURNED);
  });
});
