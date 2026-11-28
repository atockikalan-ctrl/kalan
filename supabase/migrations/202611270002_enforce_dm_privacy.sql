-- Enforce all three DM privacy settings using the existing accepted friend_requests rows.
begin;
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
  and (
    coalesce((
      select p.dm_privacy from public.profiles p
      where p.id = case when auth.uid() = participant_one then participant_two else participant_one end
    ), 'everyone') = 'everyone'
    or (
      coalesce((
        select p.dm_privacy from public.profiles p
        where p.id = case when auth.uid() = participant_one then participant_two else participant_one end
      ), 'everyone') = 'friends'
      and exists (
        select 1 from public.friend_requests fr
        where fr.status = 'accepted'
          and (
            (fr.sender_id = auth.uid() and fr.recipient_id = case when auth.uid() = participant_one then participant_two else participant_one end)
            or
            (fr.recipient_id = auth.uid() and fr.sender_id = case when auth.uid() = participant_one then participant_two else participant_one end)
          )
      )
    )
  )
);
commit;
