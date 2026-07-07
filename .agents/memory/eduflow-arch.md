---
name: EduFlow Architecture
description: Key decisions for the EduFlow Expo mobile app — types, storage, roles, discount system.
---

## Storage key
`eduflow_data_v3` (AsyncStorage). Bumped from v2 when adding Discount/DiscountRequest/PaymentTransaction types. Old v2 saves are NOT migrated — sample data loads on first v3 start.

## Type system (AppContext.tsx)
- `AppUser.teacherId?: string` — links teacher-role user to a Teacher record
- `Payment.status` includes `"partial"` in addition to paid/pending/overdue
- `Payment.transactions?: PaymentTransaction[]` + `paidTotal?: number` for partial payment tracking
- `addTransaction()` auto-recalculates `paidTotal` and `status` (partial/paid)
- `Discount` — reusable discount config (type, percent, targetId, durationMonths, active)
- `DiscountRequest` — teacher sends to admin; admin approves/rejects/modifies percent

## Role rules
- `admin`: full CRUD on everything
- `teacher`: reads own groups only (via `user.teacherId → Group.teacherId`), can add students to own groups, sends DiscountRequests (not activating directly)
- Teacher selector in Settings Rol section: when role="teacher", pick which Teacher record you are

## Discount request flow
1. Teacher taps "Chegirma so'rash" on student (students.tsx) or group (courses.tsx)
2. DiscountRequest created with status="pending"
3. Admin sees pending count badge on Dashboard + "So'rovnomalar" section in Settings
4. Admin opens review modal: can modify percent/duration, then approve or reject
5. On approve: addDiscount() is also called to activate the discount

## Inline foiz stepper
Teacher cards in Settings/O'qituvchilar have [−] N% [+] steppers for percentage-salary teachers. Calls `updateTeacher(id, { salaryPercent: newVal })` directly, clamped 1–100.

**Why:** Admin needed quick way to adjust teacher salary % without opening full edit modal.

## PaymentCard
Accepts `onMarkPaid` (full remaining amount quick-pay) and `onAddTransaction` (opens transaction modal). Progress bar shown when status="partial".

## StudentCard
`paymentStatus` prop accepts "partial" — must stay in sync with Payment.status type.

## useColors.ts
Cast is `(colors as unknown as Record<string, typeof colors.light>).dark` — needed `unknown` intermediary because of `radius: number` field in colors object conflicting with index signature.
