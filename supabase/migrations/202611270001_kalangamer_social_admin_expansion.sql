-- KALANGAMER social + admin expansion foundation
-- Staged migration: do not apply to production until reviewed and explicitly approved.
begin;

alter table public.profiles
  add column if not exists pronouns text not null default '',
  add column if not exists location_label text not null default '',
  add column if not exists favorite_games text[] not null default '{}',
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists show_online boolean not null default true,
  add column if not exists dm_privacy text not null default 'everyone',
  add column if not exists theme_config jsonb not null default '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_profile_visibility_check,
  add constraint profiles_profile_visibility_check check (profile_visibility in ('public','members','private')),
  drop constraint if exists profiles_dm_privacy_check,
  add constraint profiles_dm_privacy_check check (dm_privacy in ('everyone','friends','nobody')),
  drop constraint if exists profiles_theme_config_object_check,
  add constraint profiles_theme_config_object_check check (jsonb_typeof(theme_config)='object');

create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 3000),
  is_published boolean not null default false,
  pinned boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_feature_flags (
  feature_key text primary key,
  enabled boolean not null default true,
  description text not null default '',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null check (action in ('warn','timeout','suspend','ban','unban','delete_post','remove_message','role_change','maintenance_toggle','feature_toggle','announcement_publish','content_change')),
  reason text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.platform_announcements enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.platform_settings enable row level security;
alter table public.moderation_actions enable row level security;

drop policy if exists "Published announcements are visible to signed-in members" on public.platform_announcements;
create policy "Published announcements are visible to signed-in members"
on public.platform_announcements for select to authenticated
using (is_published = true or private.is_kalangamer_admin());

drop policy if exists "Admins manage announcements" on public.platform_announcements;
create policy "Admins manage announcements"
on public.platform_announcements for all to authenticated
using (private.is_kalangamer_admin())
with check (private.is_kalangamer_admin());

drop policy if exists "Members can read feature flags" on public.platform_feature_flags;
create policy "Members can read feature flags"
on public.platform_feature_flags for select to authenticated using (true);

drop policy if exists "Admins manage feature flags" on public.platform_feature_flags;
create policy "Admins manage feature flags"
on public.platform_feature_flags for all to authenticated
using (private.is_kalangamer_admin())
with check (private.is_kalangamer_admin());

drop policy if exists "Admins manage platform settings" on public.platform_settings;
create policy "Admins manage platform settings"
on public.platform_settings for all to authenticated
using (private.is_kalangamer_admin())
with check (private.is_kalangamer_admin());

drop policy if exists "Admins read moderation audit log" on public.moderation_actions;
create policy "Admins read moderation audit log"
on public.moderation_actions for select to authenticated
using (private.is_kalangamer_admin());

drop policy if exists "Admins append moderation audit log" on public.moderation_actions;
create policy "Admins append moderation audit log"
on public.moderation_actions for insert to authenticated
with check (private.is_kalangamer_admin() and actor_id = auth.uid());

-- Public community DMs: a signed-in user may start a conversation with any other
-- signed-in user, unless either person has blocked the other or recipient privacy
-- disallows it. Existing conversations remain visible only to their two members.
drop policy if exists "Users can start conversations with themselves as a member" on public.conversations;
create policy "Users can start conversations with themselves as a member"
on public.conversations for insert to authenticated
with check (
  (auth.uid() = participant_one or auth.uid() = participant_two)
  and participant_one <> participant_two
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = participant_one and b.blocked_id = participant_two)
       or (b.blocker_id = participant_two and b.blocked_id = participant_one)
  )
  and coalesce((
    select p.dm_privacy from public.profiles p
    where p.id = case when auth.uid() = participant_one then participant_two else participant_one end
  ), 'everyone') = 'everyone'
);

-- Existing message policies still enforce membership, sender identity and blocks.
-- Friend-only DM preferences are supported by the UI and can be tightened in a
-- follow-up policy once the existing accepted-friend helper is standardized.

insert into public.platform_feature_flags(feature_key,enabled,description) values
 ('global_community',true,'Global community feed and member discovery'),
 ('direct_messages',true,'Member-to-member direct messaging'),
 ('custom_themes',true,'Per-account theme customization'),
 ('profile_expansion',true,'Expanded gamer profiles'),
 ('community_posts',true,'Community posting and reactions'),
 ('site_announcements',true,'Site-wide announcements')
on conflict (feature_key) do nothing;

commit;
