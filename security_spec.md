# Safar Gafargaon — Security Architecture & Rules Specification (Phase 0)

## 1. API & Collection Inventory (Mistake #9)
### Backend HTTP & WebSocket Endpoints (`server.ts` & `cloudflare-worker/worker.js`)
| Endpoint / Channel | Auth Required | Purpose | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET /api/live/health` | Public (read-only status) | Live engine health check | 60 req/min/IP |
| `GET /api/live/all` | Public (sanitized, PII stripped) | Active online drivers & seeking count | 60 req/min/IP |
| `POST /api/live/update` | Verified Firebase ID Token (`Bearer`) | Driver/Passenger updates own live GPS | 60 req/min/IP |
| `POST /api/live/remove` | Verified Firebase ID Token (`Bearer`) | Owner/Admin removes own live marker | 30 req/min/IP |
| `WS /ws`, `WS /api/live/ws` | `AUTH` frame with Firebase ID Token required for writes/broadcasts | Real-time GPS & ride notifications | 30 msgs/10s/socket, 16KB max |
| `HEAD/GET /api/admin/source-zip` | Verified Admin Google ID Token or signed short-lived HMAC token (`safar.gafargaon@gmail.com`) | Admin Panel project ZIP download | 10 req/min/IP |
| `POST /api/admin/source-zip-token` | Verified Admin Google ID Token (`safar.gafargaon@gmail.com`) | Mint 5-minute signed download URL | 20 req/min/IP |

### Firestore Collections & Isolation Boundaries
- `/test/connection`: Public read (`get`) for startup connectivity check.
- `/admins/{adminId}`: Strictly Admin-only read/write (`isAdmin()`).
- `/stands/{standId}`: Public read; strictly `isAdmin()` write.
- `/places/{placeId}`: Public read; strictly `isAdmin()` write.
- `/categories/{categoryId}`: Public read; strictly `isAdmin()` write.
- `/hotlines/{hotlineId}`: Public read; strictly `isAdmin()` write.
- `/settings/app_config`: Public read; strictly `isAdmin()` write.
- `/settings/{settingId}` (including `admin_security`): Strictly `isAdmin()` read/write — zero public exposure.
- `/users/{userId}`: Owner (`isOwner(userId)`) or `isAdmin()` `get/create/update/delete` (no blanket `list`). Self-role escalation blocked (`role` restricted to `'passenger' | 'driver'`).
- `/users/{userId}/trips/{tripId}`: Master Gate `exists(/users/$(userId))`, strictly `isOwner(userId) || isAdmin()`.
- `/drivers/{driverId}`: Public read of **non-PII** display fields ONLY (`name`, `category`, `vehicleModel`, `plateNumber`, `standName`, `lat`, `lng`, `rating`, `totalTrips`, `isOnline`, verification status booleans, `driverPhoto`, `ownerUid`). Writes require verified Google Auth + ownership (`ownerUid == request.auth.uid`) or `isAdmin()`. Drivers cannot self-verify or alter ratings arbitrarily.
- `/drivers/{driverId}/private/{docId}`: PII & KYC vault (`phone`, `nidNumber`, `nidFrontPhoto`, `nidBackPhoto`, `licenseNumber`, `taxTokenReceiptPhoto`, `chassisNumber`, `engineNumber`). Master Gate checks parent `drivers/{driverId}.ownerUid == request.auth.uid || isAdmin()`.
- `/drivers/{driverId}/completed_trips/{tripId}`: Master Gate checks parent `drivers/{driverId}.ownerUid == request.auth.uid || isAdmin()`.
- `/ride_requests/{requestId}`: Strictly signed-in email-verified users; `passengerUid == request.auth.uid` on create; strict state transitions (`pending -> accepted -> in_transit -> completed/cancelled`); immutable `passengerUid`, `estFare`, `distanceKm`, `createdAt`, `createdAtMs`; terminal state locking (`completed`/`cancelled` locked against non-admins).
- `/ride_requests/{requestId}/private/{docId}`: Participant-only contact vault (`passengerPhone`, `driverPhone`, `otp`, `passengerUid`, `driverUid`). Master Gate checks parent `ride_requests/{requestId}` `passengerUid`/`driverUid == request.auth.uid || isAdmin()`.
- `/driver_reviews/{reviewId}`: Public read; verified signed-in user create (`authorUid == request.auth.uid`), valid parent driver `exists()`, `rating` in `[1, 5]`; immutable to non-admins.
- Catch-all deny: `match /{document=**} { allow read, write: if false; }` (blocks obsolete `passengers`, `whatsapp_verifications`, or any shadow collection).

---

## 2. Data Invariants
1. No unauthenticated user may write to ANY Firestore collection or live API mutation endpoint.
2. Only `isAdmin()` (verified Google account `safar.gafargaon@gmail.com` with `email_verified == true` or doc in `/admins/{uid}`) can write `stands`, `places`, `categories`, `hotlines`, `settings/*`, `admins/*`, approve/revoke driver verification, or delete records they don't own.
3. All user-created documents MUST bind identity (`ownerUid == request.auth.uid`, `passengerUid == request.auth.uid`, or `authorUid == request.auth.uid`) and use server `request.time` for temporal integrity on server timestamps / validated timestamps.
4. No PII (`nidNumber`, `licenseNumber`, `phone`, `email`, `otp`) is allowed on publicly readable `/drivers/{driverId}` or `/ride_requests/{requestId}` documents; PII lives strictly inside owner/participant-gated `/private/*` subcollections or `/users/{uid}`.
5. `ride_requests` cannot skip states (e.g., `pending` -> `completed` is rejected) and terminal states (`completed`, `cancelled`) cannot be reopened by non-admins.
6. Every document ID must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string/list must enforce strict `.size()` bounds.

---

## 3. The "Dirty Dozen" Adversarial Test Payloads
1. **Unauthenticated Admin Write**: Unauthenticated write to `/stands/stand-evil`. Expected: `PERMISSION_DENIED`.
2. **Shadow Field / Self-Verification Escalation (Driver Create)**: Signed-in user creates `/drivers/drv-evil` with `isVerified: true` or `nidVerified: true` or ghost field `adminBypass: true`. Expected: `PERMISSION_DENIED`.
3. **Email Spoofing Attack**: User with `email: 'safar.gafargaon@gmail.com'` and `email_verified: false` tries to write `/settings/app_config`. Expected: `PERMISSION_DENIED`.
4. **Admin Security Secret Read (Non-Admin)**: Signed-in regular user attempts `get` on `/settings/admin_security` or `/admins/admin1`. Expected: `PERMISSION_DENIED`.
5. **PII Blanket Read (Non-Owner KYC)**: Signed-in User B tries to `get` `/drivers/drv-1/private/kyc` owned by User A. Expected: `PERMISSION_DENIED`.
6. **BOLA User Profile / Trips Tampering**: Signed-in User B tries to read/write `/users/uid-A` or `/users/uid-A/trips/trip-1` or escalate own `/users/uid-B` `role` to `'admin'`. Expected: `PERMISSION_DENIED`.
7. **State Shortcutting (`pending` -> `completed`)**: Driver attempts to update `/ride_requests/req-1` directly from `status: 'pending'` to `status: 'completed'`. Expected: `PERMISSION_DENIED`.
8. **Terminal State Re-opening**: Passenger or Driver attempts to modify `estFare` or revert `status` from `'completed'` back to `'pending'`. Expected: `PERMISSION_DENIED`.
9. **Identity Spoofing on Ride Creation**: Signed-in User B creates `/ride_requests/req-spoof` with `passengerUid: 'uid-A'`. Expected: `PERMISSION_DENIED`.
10. **Value & Resource Poisoning**: User tries to create `/driver_reviews/rev-bad` with `rating: 99`, non-existent `driverId`, or a 2KB oversized string in `comment` / invalid ID `../evil`. Expected: `PERMISSION_DENIED`.
11. **Query Trust / Scraping Attack**: Non-admin signed-in user runs unfiltered `list` on `/users` or `/ride_requests` expecting private records. Expected: `PERMISSION_DENIED`.
12. **Obsolete Shadow Collection Access**: Any user reads/writes `/passengers/01700000000` or `/whatsapp_verifications/01700000000` or `/shadow_logs/1`. Expected: `PERMISSION_DENIED`.
