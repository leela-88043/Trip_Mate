CREATE TABLE public.destination_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  region text NOT NULL,
  country text NOT NULL,

  category text NOT NULL
    CHECK (
      category IN (
        'beach',
        'mountain',
        'nature',
        'adventure',
        'heritage',
        'city',
        'other'
      )
    ),

  description text NOT NULL,
  image_url text,
  best_time_to_visit text,

  highlights text[] NOT NULL DEFAULT '{}',
  travel_tips text[] NOT NULL DEFAULT '{}',

  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.destination_catalog
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.destination_catalog
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.destination_catalog
TO authenticated;

CREATE POLICY "Logged-in users can browse destinations"
ON public.destination_catalog
FOR SELECT TO authenticated
USING (true);