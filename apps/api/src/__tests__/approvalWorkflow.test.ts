import {
  APPROVAL_WORKFLOW,
  APPROVAL_ROLES,
} from '@hostel/shared-utils';
import { ApprovalStage, LeaveStatus, UserRole } from '@hostel/shared-types';

describe('approval workflow table', () => {
  it('routes parent → warden → chief warden', () => {
    expect(APPROVAL_WORKFLOW[UserRole.PARENT]).toMatchObject({
      fromStatus: LeaveStatus.PENDING_PARENT,
      toStatusApproved: LeaveStatus.PENDING_WARDEN,
      nextStage: ApprovalStage.WARDEN,
    });

    expect(APPROVAL_WORKFLOW[UserRole.WARDEN]).toMatchObject({
      fromStatus: LeaveStatus.PENDING_WARDEN,
      toStatusApproved: LeaveStatus.PENDING_CHIEF_WARDEN,
      nextStage: ApprovalStage.CHIEF_WARDEN,
    });
  });

  it('finalizes the leave on chief warden approval (no further stage)', () => {
    const chiefWarden = APPROVAL_WORKFLOW[UserRole.CHIEF_WARDEN];

    expect(chiefWarden.fromStatus).toBe(LeaveStatus.PENDING_CHIEF_WARDEN);
    expect(chiefWarden.toStatusApproved).toBe(LeaveStatus.APPROVED);
    expect(chiefWarden.nextStage).toBe(ApprovalStage.COMPLETED);
  });

  it('finalizes the leave on HOD approval', () => {
    const hod = APPROVAL_WORKFLOW[UserRole.HOD];

    expect(hod.toStatusApproved).toBe(LeaveStatus.APPROVED);
    expect(hod.nextStage).toBe(ApprovalStage.COMPLETED);
  });

  it('rejects to a single terminal status from every stage', () => {
    for (const role of APPROVAL_ROLES) {
      const workflow = APPROVAL_WORKFLOW[role];
      expect(workflow).toBeDefined();
      expect(workflow.toStatusRejected).toBe(LeaveStatus.REJECTED);
    }
  });

  it('does not include admin as a workflow stage (admin acts as super approver)', () => {
    expect(APPROVAL_WORKFLOW[UserRole.ADMIN]).toBeUndefined();
  });

  it('every workflow source status is unique so a leave sits at exactly one stage', () => {
    const fromStatuses = APPROVAL_ROLES.map((role) => APPROVAL_WORKFLOW[role].fromStatus);
    expect(new Set(fromStatuses).size).toBe(fromStatuses.length);
  });
});