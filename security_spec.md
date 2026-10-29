# PagePilot Security Specification

## 1. Data Invariants
1. **User Identity Boundary**: Every document stored under `/users/{userId}/**` must belong strictly to the authenticated user where `request.auth.uid == userId`.
2. **Identity Integrity**: `userId` field inside any entity must match `request.auth.uid`. Cross-user updates or impersonation are completely forbidden.
3. **No Unauthenticated Access**: Unauthenticated requests (`request.auth == null`) are rejected for all read and write operations.
4. **Valid Format Enforcement**: Document keys and IDs must conform to alphanumeric characters and safe length limits.
5. **No Cross-User Leaks**: Reading or listing another user's documents (pages, tasks, accounts, posts, profile) is strictly rejected at the rule evaluation level.
6. **Token Protection**: Access tokens and app secrets are stored in server-only collections (`/users/{userId}/account_tokens/{docId}`) where client reads and writes are denied (`allow read, write: if false`). Client-visible `/accounts/{accountId}` never contains access tokens.

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)

1. **Unauthenticated Read**: Attempting to read `/users/victim_123` with `auth: null`. (Expect: PERMISSION_DENIED)
2. **Cross-User Profile Spoof**: User `attacker_456` attempting to update `/users/victim_123` with `{ theme: 'dark' }`. (Expect: PERMISSION_DENIED)
3. **Ghost Field Poisoning**: Inserting unexpected admin/bypass properties like `{ isAdmin: true }` or `{ elevated: true }` into `/users/{userId}`. (Expect: PERMISSION_DENIED)
4. **Cross-User Page Creation**: User `attacker_456` writing to `/users/victim_123/pages/page_1`. (Expect: PERMISSION_DENIED)
5. **Foreign Page Stealing**: Creating a page under `/users/{userId}/pages/page_1` where `userId: "different_user"`. (Expect: PERMISSION_DENIED)
6. **Huge Payload / Denial of Wallet**: Writing a task with a title string longer than 200 characters or notes exceeding 2000 characters. (Expect: PERMISSION_DENIED)
7. **Malformed Target Date**: Task `targetDate` set to `"invalid-date"` instead of standard `YYYY-MM-DD`. (Expect: PERMISSION_DENIED)
8. **Invalid Platform Injection**: Writing a page or task with malicious/unsupported platforms or raw script tags. (Expect: PERMISSION_DENIED)
9. **Cross-User Task Injection**: User `attacker_456` attempting to create or modify tasks in `/users/victim_123/tasks/task_1`. (Expect: PERMISSION_DENIED)
10. **Cross-User Task Listing**: Querying `/users/victim_123/tasks` while authenticated as `attacker_456`. (Expect: PERMISSION_DENIED)
11. **Path Variable Poisoning**: Attempting to create documents with pathological path IDs such as special escape characters or excessively long strings. (Expect: PERMISSION_DENIED)
12. **Foreign Task Deletion**: User `attacker_456` attempting to delete a task in `/users/victim_123/tasks/task_1`. (Expect: PERMISSION_DENIED)

## 3. Test Runner Design
Any request targeting `/users/{userId}/**` where `request.auth == null` or `request.auth.uid != userId` immediately returns `PERMISSION_DENIED`.
Furthermore, field validations ensure data structures cannot be poisoned.
