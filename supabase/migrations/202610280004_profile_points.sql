BEGIN;

-- Award ledger: trip_id intentionally has no foreign key so earned points
-- survive deletion of a completed trip. Inserts are allowed only by the RPC.
CREATE TABLE public.trip_participation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  confirmed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participation_once UNIQUE (trip_id, user_id),
  CONSTRAINT participation_no_self CHECK (
    confirmed_by IS NULL OR confirmed_by <> user_id
  )
);

CREATE INDEX participation_user_idx
ON public.trip_participation_confirmations (user_id);

ALTER TABLE public.trip_participation_confirmations
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.trip_participation_confirmations
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.trip_participation_confirmations TO authenticated;

CREATE POLICY "Participants can read their confirmations"
ON public.trip_participation_confirmations
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR confirmed_by = (SELECT auth.uid())
);

CREATE FUNCTION public.confirm_trip_participation(
  p_trip_id uuid,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  trip_record public.trips%ROWTYPE;
  trip_end_at timestamptz;
  confirmation_id uuid;
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Please log in first.';
  END IF;

  SELECT t.* INTO trip_record
  FROM public.trips AS t
  WHERE t.id = p_trip_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found.';
  END IF;

  IF trip_record.created_by IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'Only the trip organiser can confirm participation.';
  END IF;

  IF p_user_id IS NULL OR p_user_id = actor THEN
    RAISE EXCEPTION 'You cannot confirm your own participation.';
  END IF;

  IF trip_record.start_date IS NULL
     OR trip_record.end_date IS NULL
     OR trip_record.end_date < trip_record.start_date
     OR trip_record.end_date >=
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date THEN
    RAISE EXCEPTION 'Participation can only be confirmed after a valid trip has ended.';
  END IF;

  trip_end_at := (trip_record.end_date + 1)::timestamp
                 AT TIME ZONE 'Asia/Kolkata';

  IF trip_record.created_at IS NULL
     OR trip_record.created_at >= trip_end_at THEN
    RAISE EXCEPTION 'Trips created after their end date cannot earn points.';
  END IF;

  PERFORM 1
  FROM public.trip_members AS m
  WHERE m.trip_id = p_trip_id
    AND m.user_id = p_user_id
    AND m.joined_at IS NOT NULL
    AND m.joined_at < trip_end_at
  FOR KEY SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This user must have joined the trip before it ended.';
  END IF;

  INSERT INTO public.trip_participation_confirmations (
    trip_id, user_id, confirmed_by
  )
  VALUES (p_trip_id, p_user_id, actor)
  ON CONFLICT (trip_id, user_id) DO NOTHING
  RETURNING id INTO confirmation_id;

  IF confirmation_id IS NULL THEN
    SELECT c.id INTO confirmation_id
    FROM public.trip_participation_confirmations AS c
    WHERE c.trip_id = p_trip_id AND c.user_id = p_user_id;
  END IF;

  RETURN confirmation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_trip_participation(uuid, uuid)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_trip_participation(uuid, uuid)
TO authenticated;

CREATE FUNCTION public.get_profile_points(p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  profile_points integer,
  preference_points integer,
  trip_points integer,
  confirmed_trip_count integer,
  total_points integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please log in first.';
  END IF;

  IF p_user_ids IS NULL OR cardinality(p_user_ids) > 100 THEN
    RAISE EXCEPTION 'Request up to 100 profile scores at a time.';
  END IF;

  RETURN QUERY
  WITH counts AS (
    SELECT c.user_id, count(*)::integer AS trip_count
    FROM public.trip_participation_confirmations AS c
    WHERE c.user_id = ANY(p_user_ids)
    GROUP BY c.user_id
  ), contributions AS (
    SELECT
      p.id AS profile_id,
      (
        CASE WHEN nullif(btrim(p.full_name), '') IS NOT NULL
             THEN 50 ELSE 0 END
        + CASE WHEN nullif(btrim(p.avatar_url), '') IS NOT NULL
               THEN 50 ELSE 0 END
      )::integer AS setup_score,
      (
        CASE WHEN EXISTS (
          SELECT 1 FROM unnest(pref.interests) AS interest(value)
          WHERE nullif(btrim(interest.value), '') IS NOT NULL
        ) THEN 50 ELSE 0 END
        + CASE WHEN nullif(btrim(pref.travel_style), '') IS NOT NULL
               THEN 50 ELSE 0 END
      )::integer AS preference_score,
      coalesce(counts.trip_count, 0)::integer AS trip_count
    FROM public.profiles AS p
    LEFT JOIN public.travel_preferences AS pref ON pref.user_id = p.id
    LEFT JOIN counts ON counts.user_id = p.id
    WHERE p.id = ANY(p_user_ids)
  )
  SELECT
    c.profile_id,
    c.setup_score,
    c.preference_score,
    (least(c.trip_count, 5) * 160)::integer,
    c.trip_count,
    (c.setup_score + c.preference_score
      + least(c.trip_count, 5) * 160)::integer
  FROM contributions AS c;
END;
$$;

REVOKE ALL ON FUNCTION public.get_profile_points(uuid[])
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_profile_points(uuid[])
TO authenticated;

COMMIT;
