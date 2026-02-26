-- Migration 002: Content Moderation + Push Notification Tokens
-- Run this in your Supabase SQL Editor

-- ─── Reports ─────────────────────────────────────────────────────────────────
-- Stores user reports against drives, comments, or other users.

create table if not exists reports (
  id                  uuid        default gen_random_uuid() primary key,
  reporter_id         uuid        references profiles(id) on delete cascade not null,
  reported_user_id    uuid        references profiles(id) on delete set null,
  reported_drive_id   uuid        references drives(id)   on delete set null,
  reported_comment_id uuid        references comments(id) on delete set null,
  reason              text        not null check (reason in ('spam','inappropriate','harassment','misleading','other')),
  description         text        check (char_length(description) <= 300),
  status              text        not null default 'pending' check (status in ('pending','reviewed','dismissed','resolved')),
  created_at          timestamptz not null default now(),
  constraint report_has_target check (
    reported_user_id    is not null or
    reported_drive_id   is not null or
    reported_comment_id is not null
  )
);

alter table reports enable row level security;

create policy "Users can insert own reports"
  on reports for insert
  with check (auth.uid() = reporter_id);

create policy "Users can view own reports"
  on reports for select
  using (auth.uid() = reporter_id);

create index if not exists idx_reports_reporter     on reports(reporter_id);
create index if not exists idx_reports_drive        on reports(reported_drive_id);
create index if not exists idx_reports_status       on reports(status);
create index if not exists idx_reports_created_at   on reports(created_at desc);

-- ─── Blocks ──────────────────────────────────────────────────────────────────
-- Tracks which users have blocked which other users.

create table if not exists blocks (
  id             uuid        default gen_random_uuid() primary key,
  blocker_id     uuid        references profiles(id) on delete cascade not null,
  blocked_id     uuid        references profiles(id) on delete cascade not null,
  created_at     timestamptz not null default now(),
  unique(blocker_id, blocked_id)
);

alter table blocks enable row level security;

create policy "Users can manage own blocks"
  on blocks for all
  using (auth.uid() = blocker_id);

create policy "Users can see if they are blocked"
  on blocks for select
  using (auth.uid() = blocked_id);

create index if not exists idx_blocks_blocker on blocks(blocker_id);
create index if not exists idx_blocks_blocked on blocks(blocked_id);

-- ─── Push Tokens ─────────────────────────────────────────────────────────────
-- Stores Expo push tokens so Edge Functions can deliver notifications.

create table if not exists push_tokens (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references profiles(id) on delete cascade not null unique,
  token       text        not null,
  updated_at  timestamptz not null default now()
);

alter table push_tokens enable row level security;

create policy "Users can manage own push token"
  on push_tokens for all
  using (auth.uid() = user_id);
