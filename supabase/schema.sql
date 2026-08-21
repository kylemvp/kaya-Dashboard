-- ============================================================================
-- Kaya CMS — Supabase schema
-- ----------------------------------------------------------------------------
-- Run this once against a fresh Supabase project (SQL Editor → New query).
-- It is written to be idempotent, so re-running it is safe.
--
-- Column naming follows the dashboard's JS record keys exactly wherever the key
-- is already snake-safe (name, image, badge, sub, what, quote, price...). Only
-- genuinely camelCase keys are renamed (yearsExp -> years_exp, badgeStyle ->
-- badge_style, mapQ -> map_q, createdAt -> created_at, treatmentArea ->
-- treatment_area), so lib/admin/mappers.js stays short and obvious.
--
-- Genuinely nested values (expect, downtime, benefits) are jsonb. Flat string
-- lists (suitable, verticals, languages, countries) are text[].
-- ============================================================================

-- ── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ============================================================================
-- Profiles + roles
-- ----------------------------------------------------------------------------
-- Supabase owns auth.users (email, password hash, sessions). This table adds
-- the app-level identity the dashboard shows and authorises against.
-- ============================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  title      text not null default '',
  role       text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

-- Role of the calling user, or null when signed out.
-- SECURITY DEFINER so policies can read profiles without recursing into the
-- profiles policies themselves. Named kaya_role rather than current_role
-- because CURRENT_ROLE is a reserved SQL keyword.
create or replace function public.kaya_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- True for any signed-in staff member (admin or editor).
create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select public.kaya_role() in ('admin', 'editor');
$$;

-- True only for admins. Editors are denied deletes and user management.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select public.kaya_role() = 'admin';
$$;

-- Give every new auth user a profile row. The first user to sign up becomes the
-- admin; everyone after defaults to editor and can be promoted from the
-- Supabase dashboard (or by an admin, via the policies below).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.profiles;
  insert into public.profiles (id, name, title, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'title', case when is_first then 'Administrator' else 'Content Editor' end),
    case when is_first then 'admin' else 'editor' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Catalogue
-- ----------------------------------------------------------------------------
-- `sort` preserves the display order the hardcoded arrays used to imply.
-- ============================================================================

create table if not exists public.verticals (
  id         text primary key,
  label      text not null default '',
  hint       text not null default '',
  color      text not null default '#6E5A96',
  sort       integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  slug       text primary key,
  name       text not null default '',
  image      text not null default '',
  thumb      text not null default '',
  badge      text not null default '',
  -- Treatment category: decides which /treatments/… page the service is routed
  -- under and the "tag" label its cards display. See lib/taxonomy.js.
  category   text not null default '' check (
    category in ('', 'dermatology', 'slimming', 'wellness', 'plastic-surgery')
  ),
  sub        text not null default '',
  what       text not null default '',
  mechanism  text not null default '',
  expect     jsonb  not null default '{"duration":"","sessions":"","interval":""}'::jsonb,
  downtime   jsonb  not null default '{"level":"","desc":""}'::jsonb,
  benefits   jsonb  not null default '[]'::jsonb,
  suitable   text[] not null default '{}',
  verticals  text[] not null default '{}',
  -- Countries offering this treatment. EMPTY means every country: a newly
  -- created service is live everywhere rather than invisible until configured.
  countries  text[] not null default '{}',
  -- Per-country price: { "UAE": { "price": "1200", "currency": "AED" }, … }.
  -- jsonb rather than columns so adding a market needs no migration.
  pricing    jsonb  not null default '{}'::jsonb,
  sort       integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Services are filtered by vertical on nearly every public page.
create index if not exists services_verticals_idx on public.services using gin (verticals);
create index if not exists services_countries_idx on public.services using gin (countries);

create table if not exists public.doctors (
  slug       text primary key,
  name       text not null default '',
  image      text not null default '',
  specialist text not null default '',
  tagline    text not null default '',
  bio        text not null default '',
  years_exp  text not null default '',
  verticals  text[] not null default '{}',
  languages  text[] not null default '{}',
  countries  text[] not null default '{}',
  clinics    text[] not null default '{}',
  treatments text[] not null default '{}',
  sort       integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists doctors_countries_idx on public.doctors using gin (countries);

create table if not exists public.reviews (
  id         text primary key,
  name       text not null default '',
  location   text not null default '',
  treatment  text not null default '',
  vertical   text not null default '',
  quote      text not null default '',
  "before"   text not null default '',
  "after"    text not null default '',
  sort       integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.vouchers (
  id          text primary key,
  title       text not null default '',
  subtitle    text not null default '',
  type        text not null default '',
  badge       text not null default '',
  badge_style text not null default '',
  price       text not null default '',
  currency    text not null default 'AED',
  img         text not null default '',
  countries   text[] not null default '{}',
  pricing     jsonb  not null default '{}'::jsonb,
  sort        integer not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.locations (
  id         text primary key,
  country    text not null default 'UAE',
  name       text not null default '',
  city       text not null default '',
  addr       text not null default '',
  tel        text not null default '',
  hours      text not null default '',
  map_q      text not null default '',
  -- Opening date as text (yyyy-mm-dd) rather than a date column: it is often
  -- unknown, and an empty string is easier to carry through the form than a
  -- null date the inputs would have to special-case.
  opened     text not null default '',
  sort       integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Website copy
-- ----------------------------------------------------------------------------
-- Page and site content is a fixed three-level tree (group -> section -> field)
-- defined by the schema in lib/admin/content.js. Storing one row per section
-- mirrors updatePageSection(pageId, sectionId, patch) exactly: a save touches
-- one row, and two editors working on different sections never collide.
--
-- `scope` separates the two trees: 'page' (PAGES) and 'site' (SITE_GROUPS).
-- ============================================================================
create table if not exists public.content (
  -- 'page' and 'site' hold the shared copy every market inherits.
  -- 'country:UAE' (and friends) hold only the fields that market overrides,
  -- so shared copy stays editable in one place. See lib/admin/country-content.js.
  scope      text not null check (
    scope in ('page', 'site') or scope ~ '^country:[A-Za-z]+$'
  ),
  group_id   text not null,
  section_id text not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (scope, group_id, section_id)
);

-- ============================================================================
-- Requests (inbound enquiries)
-- ----------------------------------------------------------------------------
-- Written by the PUBLIC site (anonymous visitors submitting the booking form or
-- concern finder) and read only by staff. This is the one table anon can write.
-- ============================================================================
create table if not exists public.requests (
  -- Random rather than time-based: two visitors submitting in the same second
  -- would collide on a timestamp id, and the second enquiry would be rejected.
  id             text primary key default ('req-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  source         text not null default 'consultation' check (source in ('consultation', 'concern')),
  status         text not null default 'new' check (status in ('new', 'contacted', 'booked', 'closed')),
  name           text not null default '',
  mobile         text not null default '',
  email          text not null default '',
  gender         text not null default '',
  country        text not null default '',
  city           text not null default '',
  treatment_area text not null default '',
  treatment      text not null default '',
  doctor         text not null default '',
  concerns       text[] not null default '{}',
  message        text not null default '',
  notes          text not null default '',
  created_at     timestamptz not null default now()
);

-- The inbox lists newest-first and filters by status.
create index if not exists requests_created_at_idx on public.requests (created_at desc);
create index if not exists requests_status_idx on public.requests (status);

-- ============================================================================
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Catalogue + content: world-readable (the build snapshot reads them with the
--   anon key, and the public site is generated from them), staff-writable,
--   admin-only delete.
-- Requests: anon may INSERT only. Reading, updating and deleting an enquiry is
--   staff-only — visitor details must never be publicly readable.
-- Profiles: a user reads their own row; admins manage all.
-- ============================================================================

alter table public.profiles  enable row level security;
alter table public.verticals enable row level security;
alter table public.services  enable row level security;
alter table public.doctors   enable row level security;
alter table public.reviews   enable row level security;
alter table public.vouchers  enable row level security;
alter table public.locations enable row level security;
alter table public.content   enable row level security;
alter table public.requests  enable row level security;

-- ── Profiles ────────────────────────────────────────────────────────────────
drop policy if exists profiles_read_own on public.profiles;
create policy profiles_read_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for delete using (public.is_admin());

-- ── Catalogue + content ─────────────────────────────────────────────────────
-- Applied identically to every content table via this loop, so a new table
-- only has to be added to the array below.
do $$
declare t text;
begin
  foreach t in array array['verticals', 'services', 'doctors', 'reviews', 'vouchers', 'locations', 'content']
  loop
    execute format('drop policy if exists %I_public_read on public.%I', t, t);
    execute format(
      'create policy %I_public_read on public.%I for select using (true)', t, t);

    execute format('drop policy if exists %I_staff_insert on public.%I', t, t);
    execute format(
      'create policy %I_staff_insert on public.%I for insert with check (public.is_staff())', t, t);

    execute format('drop policy if exists %I_staff_update on public.%I', t, t);
    execute format(
      'create policy %I_staff_update on public.%I for update using (public.is_staff()) with check (public.is_staff())', t, t);

    -- Editors cannot delete; this mirrors PERMISSIONS in lib/admin/auth.js and
    -- is the authoritative enforcement (the UI check is only a convenience).
    execute format('drop policy if exists %I_admin_delete on public.%I', t, t);
    execute format(
      'create policy %I_admin_delete on public.%I for delete using (public.is_admin())', t, t);
  end loop;
end $$;

-- ── Requests ────────────────────────────────────────────────────────────────
-- Anyone (including anonymous site visitors) may submit an enquiry, but only as
-- a genuinely new one: without these checks a submitter could post an enquiry
-- pre-marked 'closed' to keep it out of the inbox, or write into the staff-only
-- notes field.
drop policy if exists requests_public_insert on public.requests;
create policy requests_public_insert on public.requests
  for insert with check (status = 'new' and notes = '');

-- ...but only staff may read them back.
drop policy if exists requests_staff_read on public.requests;
create policy requests_staff_read on public.requests
  for select using (public.is_staff());

drop policy if exists requests_staff_update on public.requests;
create policy requests_staff_update on public.requests
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists requests_admin_delete on public.requests;
create policy requests_admin_delete on public.requests
  for delete using (public.is_admin());

-- ============================================================================
-- Media storage
-- ----------------------------------------------------------------------------
-- Bucket for images uploaded through the dashboard's ImagePicker. Public read
-- (the site serves them directly), staff-only write.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists media_staff_write on storage.objects;
create policy media_staff_write on storage.objects
  for insert with check (bucket_id = 'media' and public.is_staff());

drop policy if exists media_staff_update on storage.objects;
create policy media_staff_update on storage.objects
  for update using (bucket_id = 'media' and public.is_staff());

drop policy if exists media_admin_delete on storage.objects;
create policy media_admin_delete on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- ============================================================================
-- updated_at maintenance
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['verticals', 'services', 'doctors', 'reviews', 'vouchers', 'locations', 'content']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;


-- ============================================================================
-- Upgrading a database created before per-country content
-- ----------------------------------------------------------------------------
-- Safe to run on a fresh project too — every statement is guarded.
-- ============================================================================
alter table public.services add column if not exists countries text[] not null default '{}';
alter table public.services add column if not exists pricing   jsonb  not null default '{}'::jsonb;
alter table public.vouchers add column if not exists countries text[] not null default '{}';
alter table public.vouchers add column if not exists pricing   jsonb  not null default '{}'::jsonb;

-- Doctors were filed under 'OMAN' while clinics and enquiries used 'Oman'.
-- Nothing compared the two, so the mismatch was invisible until content had to
-- be filtered by country.
update public.doctors
   set countries = array_replace(countries, 'OMAN', 'Oman')
 where 'OMAN' = any (countries);

-- Widen the scope check so country overrides are accepted.
do $$
begin
  alter table public.content drop constraint if exists content_scope_check;
  alter table public.content add constraint content_scope_check
    check (scope in ('page', 'site') or scope ~ '^country:[A-Za-z]+$');
end $$;

alter table public.locations add column if not exists opened text not null default '';
