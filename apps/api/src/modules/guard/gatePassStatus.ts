/**
 * Gate Pass status helpers.
 *
 * Kept free of database and model imports so the overdue rules can be reasoned
 * about (and tested) in isolation. `gatePass.service` re-exports these.
 */

import { GatePassStatus } from '@hostel/shared-types';

/**
 * End of the expected-return day (23:59:59.999 UTC) so a student is only
 * treated as "overdue" once the whole return day has elapsed. Using the stored
 * UTC instant's calendar day keeps this deterministic and timezone-agnostic.
 */
export function endOfReturnDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Derive the effective status for reads and dashboards. A stored
 * `out_of_hostel` pass whose expected-return day has fully elapsed is reported
 * as `overdue`. The stored status is never mutated here.
 */
export function computeEffectiveStatus(
  pass: {
    status: GatePassStatus;
    actualReturnTime?: Date | null;
    expectedReturn: Date;
  },
  now: Date = new Date(),
): GatePassStatus {
  if (pass.status === GatePassStatus.OUT_OF_HOSTEL && !pass.actualReturnTime) {
    if (endOfReturnDay(pass.expectedReturn).getTime() < now.getTime()) {
      return GatePassStatus.OVERDUE;
    }
  }
  return pass.status;
}