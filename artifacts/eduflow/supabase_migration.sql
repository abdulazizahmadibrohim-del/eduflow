-- EduFlow Supabase Migration
-- Run this in Supabase Dashboard → SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============ TEACHERS ============
create table if not exists teachers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text not null unique,
  subject text not null,
  salary_type text not null default 'fixed',
  salary numeric,
  salary_percent numeric,
  status text not null default 'active',
  pin_hash text,
  joined_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============ COURSES ============
create table if not exists courses (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text,
  price numeric not null,
  duration integer not null default 3,
  color text not null default '#1E3A8A',
  teacher_id text references teachers(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ GROUPS ============
create table if not exists groups (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  course_id text not null references courses(id) on delete cascade,
  teacher_id text not null references teachers(id) on delete restrict,
  schedule text not null,
  max_students integer not null default 15,
  room text,
  created_at timestamptz not null default now()
);

-- ============ STUDENTS ============
create table if not exists students (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  phone text not null,
  parent_phone text,
  course_id text not null references courses(id) on delete restrict,
  group_id text not null references groups(id) on delete restrict,
  status text not null default 'active',
  enrolled_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============ PAYMENTS ============
create table if not exists payments (
  id text primary key default gen_random_uuid()::text,
  student_id text not null references students(id) on delete cascade,
  amount numeric not null,
  month text not null,
  paid_at date,
  status text not null default 'pending',
  note text,
  method text default 'cash',
  paid_total numeric not null default 0,
  created_at timestamptz not null default now(),
  unique(student_id, month)
);

-- ============ PAYMENT TRANSACTIONS ============
create table if not exists payment_transactions (
  id text primary key default gen_random_uuid()::text,
  payment_id text not null references payments(id) on delete cascade,
  amount numeric not null,
  method text not null default 'cash',
  receipt_uri text,
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

-- ============ ATTENDANCES ============
create table if not exists attendances (
  id text primary key default gen_random_uuid()::text,
  student_id text not null references students(id) on delete cascade,
  group_id text not null references groups(id) on delete cascade,
  date date not null,
  status text not null default 'present',
  created_at timestamptz not null default now(),
  unique(student_id, date)
);

-- ============ DISCOUNTS ============
create table if not exists discounts (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null,
  target_id text,
  month text,
  percent numeric not null,
  duration_months integer,
  start_day integer,
  end_day integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ DISCOUNT REQUESTS ============
create table if not exists discount_requests (
  id text primary key default gen_random_uuid()::text,
  teacher_id text not null references teachers(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  period text not null,
  month text,
  percent numeric not null,
  description text,
  status text not null default 'pending',
  approved_percent numeric,
  approved_duration_months integer,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ============ APP SETTINGS ============
create table if not exists app_settings (
  id text primary key default 'main',
  center_name text not null default 'O''quv Markazi',
  admin_phone text,
  admin_pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default settings row
insert into app_settings (id, center_name)
values ('main', 'O''quv Markazi')
on conflict (id) do nothing;

-- ============ ROW LEVEL SECURITY ============
alter table teachers enable row level security;
alter table courses enable row level security;
alter table groups enable row level security;
alter table students enable row level security;
alter table payments enable row level security;
alter table payment_transactions enable row level security;
alter table attendances enable row level security;
alter table discounts enable row level security;
alter table discount_requests enable row level security;
alter table app_settings enable row level security;

-- Allow all operations with anon key (app handles auth itself via PIN)
create policy "anon_all" on teachers for all using (true) with check (true);
create policy "anon_all" on courses for all using (true) with check (true);
create policy "anon_all" on groups for all using (true) with check (true);
create policy "anon_all" on students for all using (true) with check (true);
create policy "anon_all" on payments for all using (true) with check (true);
create policy "anon_all" on payment_transactions for all using (true) with check (true);
create policy "anon_all" on attendances for all using (true) with check (true);
create policy "anon_all" on discounts for all using (true) with check (true);
create policy "anon_all" on discount_requests for all using (true) with check (true);
create policy "anon_all" on app_settings for all using (true) with check (true);
