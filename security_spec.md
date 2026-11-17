# HealthCare+ Firestore Security Specification (Phase 0 Blueprint)

## Collections & Ownership Model
1. `/profiles/{userId}` — Strictly owned by `userId` (`request.auth.uid == userId` & verified email) or readable/manageable by verified admins (`isAdmin()`). Role escalation blocked for self-updates.
2. `/health_records/{recordId}` — Scoped by `userId == request.auth.uid` for read, create, update, and delete; admins retain audit read access.
3. `/doctors/{doctorId}` — Publicly readable to verified signed-in users when `verified == true` or `isDemo == true`; admins can create, edit, verify, flag demo vs verified, and delete.
4. `/doctor_slots/{slotId}` — Non-PII atomic slot reservations (`{doctorId}_{date}_{timeSlot}`). Verified users can query active locks to prevent concurrent double-bookings, create new locks (`bookedByUid == request.auth.uid` when doc does not yet exist), and release their own lock upon cancellation.
5. `/appointments/{appointmentId}` — Scoped by `userId == request.auth.uid` for patient create/read/cancel/reschedule; admins can list all and update status. Requires referenced doctor document to exist.
6. `/medicine_reminders/{reminderId}` — Scoped by `userId == request.auth.uid` for full CRUD, including dose completion (`completedDates`), missed dates (`missedDates`), and daily reset (`lastTakenDate`).
7. `/medicine_scan_history/{scanId}` — Scoped by `userId == request.auth.uid` for create, list, save toggle, and delete, storing extracted `expiryDate` and labeling safety info.
8. `/chat_history/{messageId}` — Scoped by `userId == request.auth.uid` for conversation read/append/clear.
9. `/emergency_contacts/{contactId}` — Scoped by `userId == request.auth.uid`.
10. `/notifications/{notificationId}` — Scoped by `userId == request.auth.uid`.
11. `/emergency_events/{eventId}` — Scoped by `userId == request.auth.uid` and auditable/manageable by verified admins. Enforces truthful SOS states (`REQUESTED`, `CONTACTS_NOTIFIED`, `ACKNOWLEDGED`, `RESOLVED`, `CANCELLED`).
12. `/admins/{userId}` — Trusted administrator lookup managed exclusively by verified admins.
13. `/audit_logs/{logId}` — Immutable administrative audit trail (`allow update, delete: if false`) readable and creatable only by verified admins (`actorUid == request.auth.uid`).
