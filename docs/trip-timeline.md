# Active and completed trips

Trip dates are calendar dates in Asia/Kolkata (India time). A trip is completed only when end_date is before today's India date. Trips ending today remain active until midnight. Future trips are Upcoming; started trips that have not ended are Ongoing.

My Trips defaults to Active and includes a Completed archive tab. Home and Explore hide completed trips. Only a trip's creator can delete its completed record. Deleting a trip is a shared deletion for all its members and requires confirmation. It is not automatic deletion or a personal hide action.

## Database setup

Save and run `supabase/migrations/202610280003_restrict_trip_deletion.sql` once in the existing Supabase project's SQL Editor. Pulling the source does not execute this script.

The restrictive RLS rule is combined with existing policies: it requires ownership and a past end date without replacing Group 1's permissive policies. It does not grant new deletion rights. Existing foreign-key rules remain in effect. No manual deletion of members, destinations or expenses is added.

## Validation

Run `node --test tests/tripTimeline.test.cjs`, `npx tsc --noEmit` and `npm run lint` after installing dependencies.

The date helper was checked at India midnight, year change, leap day and the end-date boundary. The SQL policy was tested in an isolated PostgreSQL engine (PGlite): owner deletion of a past trip succeeds; owner deletion of today-ending/future trips and deletion of another owner's trip do not. SELECT access is unaffected. The live Supabase project has not been changed by this source update.

Focused TypeScript and lint checks pass for the changed files. The original repository has separate TypeScript errors in create-trip.tsx (fontWeight '750') and missing CSS type declarations in animated-icon.web.tsx / constants/theme.ts; this update does not change those unrelated files.

## Local Group 2 work

The remote branch at the time of this update did not contain the newer companion discovery component/services or travel-preferences screen developed locally. This update applies the date filter to the existing repository Explore implementation and does not invent missing companion imports. Preserve and merge your local Group 2 commits when pulling; do not reset or discard them. If Git reports conflicts in Explore or Home, resolve them with both the companion functionality and the date filters retained.

## Manual checks

- Past end date: shown in Completed, absent from Home and Explore active listings.
- Today end date: Ongoing, no Delete button.
- Future start/end: Upcoming, no Delete button.
- Completed trip owned by someone else: no Delete button.
- Owner deletes completed trip after confirmation; cancelling keeps it.
- My Trips refreshes after returning from edits or deletion.
- A trip automatically changes status at the next India midnight or app resume.
