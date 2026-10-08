-- Enable pg_cron in Supabase first (Integrations > Cron), then run this file.
-- A named schedule is replaced if this statement is re-run.
select cron.schedule(
  'junctionshare-expired-request-cleanup',
  '*/10 * * * *',
  $$select public.purge_expired_requests();$$
);
