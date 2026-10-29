# Hostel and Room Allocation Progress

## Implementation

- [x] Add hostel room-capacity configuration (`1`, `2`, or `3` students per room).
- [x] Generate rooms when a hostel is created using idempotent room upserts.
- [x] Add live hostel and room capacity statistics.
- [x] Add active hostel and available-room endpoints.
- [x] Keep application approval separate from hostel allocation.
- [x] Add dependent hostel and room allocation controls.
- [x] Enforce Admin/Chief Warden configuration access and Warden hostel scope.
- [x] Add transactional/atomic allocation and transfer handling.
- [x] Add allocation status, timestamps, responsible staff, and history fields.
- [x] Display allocation data in student profiles and dashboards.
- [x] Mark hostels and rooms available/unavailable.
- [x] Safely delete empty hostels and rooms while preserving allocation history.
- [x] Add a dedicated room configuration page.
- [x] Rename rooms and change room capacity with occupancy validation.
- [x] View students in each room and add, transfer, or remove students.
- [x] Clear a student's hostel and room when they are removed from a room.

## Verification scenarios

- [ ] Create 10 rooms at capacity 1.
- [ ] Create 10 rooms at capacity 2.
- [ ] Create 10 rooms at capacity 3.
- [ ] Confirm retries do not duplicate rooms.
- [ ] Allocate an approved application to an available room.
- [ ] Confirm hostel and room dropdowns exclude unavailable records.
- [ ] Confirm occupancy updates after allocation and transfer.
- [ ] Confirm a full room disappears from available-room results.
- [ ] Confirm a Warden cannot allocate outside the assigned hostel.
- [ ] Confirm pending/rejected applications cannot be allocated.
- [ ] Confirm duplicate and concurrent allocations cannot overbook a room.
- [ ] Confirm existing student, approval, hostel, and dashboard flows continue to work.

## Automated checks

- [x] Shared package build.
- [x] API type check.
- [x] Full package/API/web build.
- [x] Jest command completed (the API workspace currently contains no tests).
