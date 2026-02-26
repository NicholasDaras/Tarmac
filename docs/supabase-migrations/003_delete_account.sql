-- Migration 003: Account Deletion — Cascade Verification
-- Run this query in the Supabase SQL Editor BEFORE deploying the delete-account Edge Function.
-- It verifies that all user-data tables have ON DELETE CASCADE from profiles(id).
--
-- Deploy the Edge Function:
--   supabase functions deploy delete-account
--
-- The function requires no database schema changes — it relies on existing FK cascades.

-- ─── Step 1: Verify cascade rules ──────────────────────────────────────────
-- Expected: every row below should show delete_rule = 'CASCADE'
-- If any show 'RESTRICT' or 'NO ACTION', run the fix statements in Step 2.

select
  tc.table_name       as table_name,
  kcu.column_name     as fk_column,
  rc.delete_rule      as on_delete
from information_schema.referential_constraints rc
join information_schema.table_constraints  tc  on rc.constraint_name     = tc.constraint_name
join information_schema.key_column_usage   kcu on kcu.constraint_name    = rc.constraint_name
join information_schema.table_constraints  ftc on rc.unique_constraint_name = ftc.constraint_name
where ftc.table_name  = 'profiles'
  and tc.table_schema = 'public'
order by tc.table_name;

-- ─── Step 2: Fix non-cascading FKs (run only if Step 1 shows RESTRICT/NO ACTION) ───
-- Replace [constraint_name] with the actual name from Step 1.

-- Example fix pattern (do not run blindly — check constraint names first):
-- alter table drives
--   drop   constraint drives_user_id_fkey,
--   add    constraint drives_user_id_fkey
--            foreign key (user_id) references profiles(id) on delete cascade;

-- ─── Step 3: Verify push_tokens table also cascades from profiles ───────────
-- (Added in migration 002 — should already be CASCADE)
select count(*) from push_tokens limit 1; -- smoke test table exists

-- ─── Step 4: Storage paths reference ────────────────────────────────────────
-- The Edge Function lists and deletes Storage objects at these paths:
--   Bucket: drives   → folder per drive:   drives/{drive_id}/{filename}
--   Bucket: profiles → folder per user:    profiles/{user_id}/{filename}
-- Verify your storage bucket structure matches before deploying.
