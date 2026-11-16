  begin;

  create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    actor_id uuid references public.profiles(id) on delete set null,
    type text not null check (type in (
      'trip_created', 'companion_request', 'companion_accepted',
      'companion_declined', 'companion_cancelled', 'trip_joined', 'member_joined'
    )),
    title text not null,
    body text not null,
    trip_id uuid references public.trips(id) on delete set null,
    request_id uuid references public.companion_requests(id) on delete set null,
    event_key text not null,
    is_read boolean not null default false,
    created_at timestamptz not null default now(),
    unique (user_id, event_key)
  );

  create index notifications_user_recent_idx
    on public.notifications(user_id, created_at desc, id desc);
  create index notifications_unread_idx
    on public.notifications(user_id) where is_read = false;
  create index notifications_trip_idx on public.notifications(trip_id);
  create index notifications_request_idx on public.notifications(request_id);
  create index notifications_actor_idx on public.notifications(actor_id);

  alter table public.notifications enable row level security;
  revoke all on public.notifications from public, anon, authenticated;
  grant select on public.notifications to authenticated;
  grant update (is_read) on public.notifications to authenticated;

  create policy "Users read their own notifications"
    on public.notifications for select to authenticated
    using (user_id = (select auth.uid()));

  create policy "Users mark their own notifications read"
    on public.notifications for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

  -- New active trips are announced to existing profiles except the creator.
  -- This matches the current policy that all authenticated users can view trips.
  create function public.trip_mate_notify_new_trip()
  returns trigger language plpgsql security definer set search_path = ''
  as $$
  begin
    if new.created_by is null or new.end_date is null
      or new.end_date < (current_timestamp at time zone 'Asia/Kolkata')::date then
      return new;
    end if;

    insert into public.notifications
      (user_id, actor_id, type, title, body, trip_id, event_key)
    select p.id, new.created_by, 'trip_created', 'New trip available',
      'A new trip, "' || new.name || '", is going to ' || new.destination || '.',
      new.id, 'trip-created:' || new.id::text
    from public.profiles p
    where p.id <> new.created_by
    on conflict (user_id, event_key) do nothing;
    return new;
  end;
  $$;

  create trigger trip_mate_new_trip_notification
  after insert on public.trips
  for each row execute function public.trip_mate_notify_new_trip();

  create function public.trip_mate_notify_companion_request()
  returns trigger language plpgsql security definer set search_path = ''
  as $$
  declare
    recipient uuid;
    actor uuid;
    notification_type text;
    notification_title text;
    notification_body text;
  begin
    if tg_op = 'INSERT' then
      if new.status <> 'pending' then return new; end if;
      recipient := new.receiver_id;
      actor := new.sender_id;
      notification_type := 'companion_request';
      notification_title := 'New companion request';
      notification_body := 'A traveller wants to connect with you. Open companion requests to respond.';
    else
      if old.status <> 'pending' or new.status is not distinct from old.status then
        return new;
      end if;

      if new.status = 'accepted' then
        recipient := old.sender_id;
        actor := old.receiver_id;
        notification_type := 'companion_accepted';
        notification_title := 'Companion request accepted';
        notification_body := 'Your companion request was accepted. You are now connected.';
      elsif new.status = 'declined' then
        recipient := old.sender_id;
        actor := old.receiver_id;
        notification_type := 'companion_declined';
        notification_title := 'Companion request declined';
        notification_body := 'Your companion request was declined.';
      elsif new.status = 'cancelled' then
        recipient := old.receiver_id;
        actor := old.sender_id;
        notification_type := 'companion_cancelled';
        notification_title := 'Companion request cancelled';
        notification_body := 'A pending companion request was cancelled by its sender.';
      else
        return new;
      end if;
    end if;

    insert into public.notifications
      (user_id, actor_id, type, title, body, request_id, event_key)
    values (recipient, actor, notification_type, notification_title,
      notification_body, new.id, 'request:' || new.id::text || ':' || new.status)
    on conflict (user_id, event_key) do nothing;
    return new;
  end;
  $$;

  create trigger trip_mate_companion_request_notification
  after insert or update of status on public.companion_requests
  for each row execute function public.trip_mate_notify_companion_request();

  create function public.trip_mate_notify_trip_join()
  returns trigger language plpgsql security definer set search_path = ''
  as $$
  declare
    owner_id uuid;
    trip_name text;
  begin
    if new.trip_id is null or new.user_id is null then return new; end if;

    select t.created_by, t.name into owner_id, trip_name
    from public.trips t where t.id = new.trip_id;

    -- Creating the organiser's automatic membership is not a trip join.
    if owner_id is null or new.user_id = owner_id then return new; end if;

    insert into public.notifications
      (user_id, actor_id, type, title, body, trip_id, event_key)
    values
      (new.user_id, new.user_id, 'trip_joined', 'You joined a trip',
        'You are now a member of "' || trip_name || '".', new.trip_id,
        'membership:' || new.id::text || ':joined'),
      (owner_id, new.user_id, 'member_joined', 'A traveller joined your trip',
        'A traveller joined "' || trip_name || '". Open the trip to view its members.',
        new.trip_id, 'membership:' || new.id::text || ':owner')
    on conflict (user_id, event_key) do nothing;
    return new;
  end;
  $$;

  create trigger trip_mate_trip_join_notification
  after insert on public.trip_members
  for each row execute function public.trip_mate_notify_trip_join();

  revoke all on function public.trip_mate_notify_new_trip() from public, anon, authenticated;
  revoke all on function public.trip_mate_notify_companion_request() from public, anon, authenticated;
  revoke all on function public.trip_mate_notify_trip_join() from public, anon, authenticated;

  commit;
