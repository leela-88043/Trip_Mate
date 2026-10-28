-- Run once in Supabase SQL Editor; save alongside the other migrations.
-- RESTRICTIVE means this is combined with existing permissive DELETE policies.
-- It does not replace existing Group 1 policies or grant new deletion rights.
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only owners can delete completed trips"
ON public.trips
AS RESTRICTIVE
FOR DELETE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  AND end_date::date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
);
