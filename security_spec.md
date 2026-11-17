# HealthCare+ Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Profile Isolation**: A `/profiles/{userId}` document may only be read or modified by the authenticated verified user whose `uid == userId` (or a verified admin). Users may never assign or escalate their `role` field (`role == 'patient'` immutable by non-admins).
2. **User-Owned Health Collections**: Documents in `health_records`, `appointments`, `medicine_reminders`, `medicine_scan_history`, `chat_history`, `emergency_contacts`, `notifications`, and `emergency_events` MUST carry `userId == request.auth.uid` on creation, `userId` MUST be immutable on update, and `list` queries MUST enforce `resource.data.userId == request.auth.uid` (or `isAdmin()` for audit collections).
3. **Relational Integrity**: Creating an `appointments` document requires `exists(/databases/$(database)/documents/doctors/$(incoming().doctorId))` so orphaned doctor references are rejected.
4. **Doctor Directory Protection**: `doctors` are readable by authenticated verified users and writable ONLY by verified admins (`request.auth.token.admin == true` or verified admin registry).
5. **Temporal Integrity**: `createdAt` and `updatedAt` MUST equal `request.time` on creation, and `createdAt` is immutable on update while `updatedAt == request.time`.
6. **Terminal State Locking**: Once an `appointments` document reaches `Cancelled` or `Completed` (or `emergency_events` reaches `RESOLVED` or `CANCELLED`), non-admins cannot mutate it further.
7. **Volumetric & Type Bounds**: Every string, array, and number is bounded to prevent resource poisoning and Denial of Wallet attacks.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read on `/profiles/uid_1`** (`request.auth == null`).
2. **Cross-tenant read/list on `/health_records`** by `uid_2` querying `uid_1` records.
3. **Unverified email write** (`request.auth.token.email_verified == false`) creating a `/health_records` doc.
4. **Self-assigned admin escalation** on `/profiles/uid_1` create with `{ role: "admin" }`.
5. **Shadow / Ghost field injection** on `/profiles/uid_1` update with `{ isVerified: true }`.
6. **Identity spoofing** creating `/medicine_reminders` with `{ userId: "victim_uid" }`.
7. **Orphaned appointment** creating `/appointments` with non-existent `doctorId: "fake_doc_999"`.
8. **Doctor directory tampering** by a patient trying to update `/doctors/doc_1` `feeUsd: 0`.
9. **Terminal state bypass** updating an appointment whose existing `status == "Cancelled"` back to `"Upcoming"`.
10. **Client-forged timestamp** creating `/health_records` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
11. **Oversized string poisoning** creating `/chat_history` with a 50KB `text` payload (`> 8000` chars).
12. **ID poisoning** creating `/health_records/bad$$id!with_spaces` failing `isValidId()`.
