-- KALAN Media: public, private, and friend-shared MP3/MP4 uploads.
-- Apply only after reviewing/merging the matching application PR.

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  media_type text not null check (media_type in ('audio', 'video')),
  mime_type text not null check (mime_type in ('audio/mpeg', 'audio/mp4', 'video/mp4')),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  storage_path text not null unique,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'shared')),
  created_at timestamptz not null default now()
);

create index if not exists media_items_public_created_idx
  on public.media_items (created_at desc) where visibility = 'public';
create index if not exists media_items_user_created_idx
  on public.media_items (user_id, created_at desc);

create table if not exists public.media_shares (
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (media_item_id, user_id)
);
create index if not exists media_shares_user_idx on public.media_shares (user_id, media_item_id);

alter table public.media_items enable row level security;
alter table public.media_shares enable row level security;

drop policy if exists "Media is visible to its audience" on public.media_items;
create policy "Media is visible to its audience"
on public.media_items for select to anon, authenticated
using (
  visibility = 'public'
  or user_id = (select auth.uid())
  or exists (
    select 1 from public.media_shares s
    where s.media_item_id = media_items.id and s.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can upload their own media" on public.media_items;
create policy "Users can upload their own media"
on public.media_items for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Owners can update their own media" on public.media_items;
create policy "Owners can update their own media"
on public.media_items for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Owners can delete their own media" on public.media_items;
create policy "Owners can delete their own media"
on public.media_items for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Owners and recipients can view media shares" on public.media_shares;
create policy "Owners and recipients can view media shares"
on public.media_shares for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.media_items m
    where m.id = media_item_id and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Owners can share media with accepted friends" on public.media_shares;
create policy "Owners can share media with accepted friends"
on public.media_shares for insert to authenticated
with check (
  exists (
    select 1 from public.media_items m
    where m.id = media_item_id
      and m.user_id = (select auth.uid())
      and m.visibility = 'shared'
  )
  and user_id <> (select auth.uid())
  and exists (
    select 1 from public.friend_requests f
    where f.status = 'accepted'
      and (
        (f.sender_id = (select auth.uid()) and f.recipient_id = media_shares.user_id)
        or (f.recipient_id = (select auth.uid()) and f.sender_id = media_shares.user_id)
      )
  )
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = media_shares.user_id)
       or (b.blocked_id = (select auth.uid()) and b.blocker_id = media_shares.user_id)
  )
);

drop policy if exists "Owners can revoke media shares" on public.media_shares;
create policy "Owners can revoke media shares"
on public.media_shares for delete to authenticated
using (
  exists (
    select 1 from public.media_items m
    where m.id = media_item_id and m.user_id = (select auth.uid())
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kalan-media', 'kalan-media', false, 52428800, array['audio/mpeg', 'audio/mp4', 'video/mp4'])
on conflict (id) do nothing;

drop policy if exists "KALAN Media owners can upload" on storage.objects;
create policy "KALAN Media owners can upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'kalan-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "KALAN Media audience can read" on storage.objects;
create policy "KALAN Media audience can read"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'kalan-media'
  and exists (
    select 1 from public.media_items m
    where m.storage_path = storage.objects.name
      and (
        m.visibility = 'public'
        or m.user_id = (select auth.uid())
        or exists (
          select 1 from public.media_shares s
          where s.media_item_id = m.id and s.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "KALAN Media owners can delete files" on storage.objects;
create policy "KALAN Media owners can delete files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'kalan-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
