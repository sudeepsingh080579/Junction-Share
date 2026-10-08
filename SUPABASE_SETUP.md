# Supabase setup for live matching

JunctionShare uses Supabase anonymous Auth and Postgres RPCs so two phones can see each other's requests. No service-role key belongs in the app. The EAS `production` environment is expected to already contain `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. A new production build is required before those values are inside the binary.

The live-matching branch named project ref `lhtwktvbmuaiekhpybaa` (`https://lhtwktvbmuaiekhpybaa.supabase.co`). Unauthenticated calls to that host return `401 No API key`, so the project is online. This workspace is not logged into EAS, so the publishable key could not be read and the RPCs could not be queried. Treat the migration, cron, anonymous auth, and edge function as **not confirmed** until you run the checks below.

## 1. Anonymous sign-in

In the Supabase dashboard open **Authentication → Sign In / Providers** and enable **Anonymous sign-ins**. The app calls `POST /auth/v1/signup` with an empty JSON body and stores the session on the device. There is no email, password, or account recovery.

## 2. Migration

In **SQL Editor**, paste and run [`supabase/migrations/202609300001_live_matching.sql`](supabase/migrations/202609300001_live_matching.sql).

That file creates `profiles`, `ride_requests`, interests, declines, and WhatsApp delivery rows. It enables RLS, revokes direct table access, and exposes only authenticated RPCs:

- `save_my_profile`, `publish_request`, `nearby_requests`, `express_interest`, `decline_request`, `end_my_request`, `my_active_request`, `my_matches`, `update_my_location`
- `purge_expired_requests` is not granted to the app. The cleanup job runs it.
- `claim_whatsapp_alerts` and `finish_whatsapp_alert` are granted to `service_role` only.

`nearby_requests` and `my_active_request` ignore rows with `expires_at <= now()`, so a request disappears when its window ends even before the delete job runs. `purge_expired_requests` deletes rows about 10 minutes after `expires_at`. Coordinates are stored for the radius check and are not returned by the client RPCs. A phone number is returned only after both people have tapped Interested and both saved a WhatsApp number.

Check that the functions exist (use the publishable key, not the service role):

```sh
curl -sS -X POST "$EXPO_PUBLIC_SUPABASE_URL/rest/v1/rpc/nearby_requests" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

- `PGRST202` or a message that the function was not found means the migration has not been applied.
- A permission or JWT error (the publishable key is not a user session) means the function exists and anonymous callers cannot run it, which is what we want. The app signs in anonymously first.

## 3. Cleanup cron

1. In the dashboard open **Integrations → Cron** and enable `pg_cron` if it is off.
2. Run [`supabase/cleanup_cron.sql`](supabase/cleanup_cron.sql) in the SQL editor.

It schedules `junctionshare-expired-request-cleanup` every 10 minutes: `select public.purge_expired_requests();`.

Confirm with:

```sql
select jobid, schedule, command from cron.job where jobname = 'junctionshare-expired-request-cleanup';
```

## 4. App environment

EAS production should already have:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the publishable key, or the legacy anon key)

Do not put `service_role` or any secret key in Expo or EAS public variables. For a local run, copy `.env.example` to `.env` and restart Expo. The iOS build `1.0.1 (15)` was cut before this client existed, so it will not talk to Supabase until you ship a new binary. EAS `autoIncrement` will bump the build number; do not edit `version` in `app.json`.

## 5. WhatsApp nearby alerts (optional, off in the app)

[`supabase/functions/notify-nearby/index.ts`](supabase/functions/notify-nearby/index.ts) can send a Meta WhatsApp template to people who opted into alerts. This build always saves `whatsapp_alerts_opt_in = false` and there is no in-app switch, so the function returns no recipients even when it is deployed. Broadcast still succeeds if the function is missing.

When you want alerts:

1. Approve a WhatsApp template (suggested name `junctionshare_nearby_request`, language `en_US`, no variables).
2. From the repo root, with the Supabase CLI logged in:

   ```sh
   supabase login
   supabase link --project-ref lhtwktvbmuaiekhpybaa
   supabase functions deploy notify-nearby
   ```

   `supabase/config.toml` sets `verify_jwt = true` for that function.

3. Set Edge Function secrets (Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; do not set the service role yourself):

   ```sh
   supabase secrets set \
     WHATSAPP_ACCESS_TOKEN=... \
     WHATSAPP_PHONE_NUMBER_ID=... \
     WHATSAPP_TEMPLATE_NAME=junctionshare_nearby_request \
     WHATSAPP_TEMPLATE_LANGUAGE=en_US \
     WHATSAPP_GRAPH_API_VERSION=vXX.X
   ```

   Use the Graph API version your Meta app supports (`v` plus major.minor, for example `v23.0`). Never put the WhatsApp token in `.env` or EAS.

## What the app does at runtime

- Profile **Save** writes the name and WhatsApp number on the device and, when the two public variables are present, calls `save_my_profile`.
- Broadcast reads the device location, asks for When In Use and then Always, publishes the request, and while Always is granted runs a background location task that calls `update_my_location` until the request ends or expires.
- The inbox calls `nearby_requests` about every 15 seconds while Home or the inbox is open and a request is active. Mutual interest is read from `my_matches`.
- No network or a denied location permission shows an explanation. Location denial offers Settings and does not block Home or Profile. There is no stand-in rider list.
