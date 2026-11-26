-- KALAN Chat: per-user presence, conversation themes, and saved messages
-- Apply this migration to the KALAN Chat development database before enabling the UI.

alter table public.profiles
  add column if not exists presence_mode text not null default 'online',
  add column if not exists status_expires_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_presence_mode_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_presence_mode_check
      check (presence_mode in ('online','away','busy','dnd','invisible'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_message_length_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_status_message_length_check
      check (char_length(status_message) <= 80);
  end if;
end $$;

create table if not exists public.chat_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  conversation_kind text not null check (conversation_kind in ('direct','group')),
  theme text not null default 'sage' check (theme in ('sage','ocean','lavender','sunset','midnight')),
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation_id, conversation_kind)
);

alter table public.chat_preferences enable row level security;

create policy "Users can view their own chat preferences"
on public.chat_preferences for select to authenticated
using (
  user_id = (select auth.uid()) and (
    (conversation_kind = 'direct' and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_one = (select auth.uid()) or c.participant_two = (select auth.uid()))
    ))
    or (conversation_kind = 'group' and private.is_group_chat_member(conversation_id))
  )
);

create policy "Users can create their own chat preferences"
on public.chat_preferences for insert to authenticated
with check (
  user_id = (select auth.uid()) and (
    (conversation_kind = 'direct' and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_one = (select auth.uid()) or c.participant_two = (select auth.uid()))
    ))
    or (conversation_kind = 'group' and private.is_group_chat_member(conversation_id))
  )
);

create policy "Users can update their own chat preferences"
on public.chat_preferences for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid()) and (
    (conversation_kind = 'direct' and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_one = (select auth.uid()) or c.participant_two = (select auth.uid()))
    ))
    or (conversation_kind = 'group' and private.is_group_chat_member(conversation_id))
  )
);

create policy "Users can delete their own chat preferences"
on public.chat_preferences for delete to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.saved_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null,
  message_kind text not null check (message_kind in ('direct','group')),
  conversation_id uuid not null,
  saved_at timestamptz not null default now(),
  unique (user_id, message_id, message_kind)
);

create index if not exists saved_messages_user_saved_at_idx
  on public.saved_messages(user_id, saved_at desc);

alter table public.saved_messages enable row level security;

create policy "Users can view their accessible saved messages"
on public.saved_messages for select to authenticated
using (
  user_id = (select auth.uid()) and (
    (message_kind = 'direct' and exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id and m.conversation_id = saved_messages.conversation_id
        and (c.participant_one = (select auth.uid()) or c.participant_two = (select auth.uid()))
    ))
    or (message_kind = 'group' and exists (
      select 1 from public.group_messages gm
      where gm.id = message_id and gm.conversation_id = saved_messages.conversation_id
        and private.is_group_chat_member(gm.conversation_id)
    ))
  )
);

create policy "Users can save messages in their conversations"
on public.saved_messages for insert to authenticated
with check (
  user_id = (select auth.uid()) and (
    (message_kind = 'direct' and exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id and m.conversation_id = saved_messages.conversation_id
        and (c.participant_one = (select auth.uid()) or c.participant_two = (select auth.uid()))
    ))
    or (message_kind = 'group' and exists (
      select 1 from public.group_messages gm
      where gm.id = message_id and gm.conversation_id = saved_messages.conversation_id
        and private.is_group_chat_member(gm.conversation_id)
    ))
  )
);

create policy "Users can remove their own saved messages"
on public.saved_messages for delete to authenticated
using (user_id = (select auth.uid()));

-- New public-schema tables are not automatically exposed by the Data API on current projects.
-- Grant only the signed-in role; RLS remains the row-level authorization boundary.
revoke all on public.chat_preferences from anon;
revoke all on public.saved_messages from anon;
grant select, insert, update, delete on public.chat_preferences to authenticated;
grant select, insert, delete on public.saved_messages to authenticated;
