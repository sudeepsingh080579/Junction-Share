# Supabase setup for live matching

JunctionShare uses Supabase anonymous Auth and Postgres RPCs for shared broadcasts and nearby matching. No service-role key belongs in the app.

1. Create a Supabase project and enable **Anonymous Sign-ins** under Authentication providers. The app creates a device/browser-scoped anonymous account. There is no account recovery or cross-device transfer.
2. In the Supabase SQL Editor, run [`supabase/migrations/202609300001_live_matching.sql`](supabase/migrations/202609300001_live_matching.sql).
3. Enable **Cron** under Integrations, then run [`supabase/cleanup_cron.sql`](supabase/cleanup_cron.sql). It removes expired requests and their exact location data within about 20 minutes of expiry (at most about 50 minutes after a 30-minute request is created).
4. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project Connect/API Keys panel. A legacy `anon` client key is also public and can be used in the publishable-key variable. Never use `service_role` or a secret key in Expo variables.
5. Restart Expo after changing `.env`. For EAS builds, add the same two public client values as EAS environment variables for the build profile.
6. Deploy the authenticated Edge Function with `supabase functions deploy notify-nearby`. It verifies the caller's Supabase session, uses a server-only service role to select eligible recipients, and sends a WhatsApp template through Meta's Cloud API.
7. In Meta WhatsApp Manager, create and get approval for a fixed utility template named `junctionshare_nearby_request` (or set the name below). Suggested body: “A nearby JunctionShare ride request might match yours. Open JunctionShare to check your inbox.” Use no template variables. Set the Edge Function secrets using the WhatsApp Business phone number ID, an access token with messaging permission, the approved template name/language, and the Graph API version currently supported by your Meta app:

   ```sh
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... WHATSAPP_TEMPLATE_NAME=junctionshare_nearby_request WHATSAPP_TEMPLATE_LANGUAGE=en_US WHATSAPP_GRAPH_API_VERSION=vXX.X
   ```

   Keep both secret keys in Supabase Edge Function secrets only. Do not put either key in `.env`, Expo/EAS variables, or the mobile app. Replace `vXX.X` with the version shown in your Meta app.

The migration keeps profile/request rows private under RLS. Client access to matching is limited to authenticated RPCs. Nearby RPCs return names and approximate distance only; phone numbers are returned to a match only after both people have expressed interest and both have opted into contact sharing. WhatsApp nearby alerts use a separate explicit opt-in. Only the Edge Function can read alert recipients' phone numbers; delivery records store no phone numbers. Coordinates are used in the database for radius calculations and are never returned by the RPCs. Requests expire after their selected window, users can end a request early, and the optional Cron job purges expired location data shortly afterward.

Location access is requested only while broadcasting and only while the app is in use. A user must enable “Share location while requesting” first. Turning that setting off also ends the active request. On each new broadcast, the Edge Function sends the approved WhatsApp template to up to 50 nearby people who opted into alerts and have an active opposite-role request within the shared radius. It does not include the sender's name, destination, note, or location. Meta must approve the template and the WhatsApp Business number/token must be configured for alerts to send. The inbox refreshes while open every 15 seconds; background push notifications are not included.

Without project URL/key, broadcasts intentionally fail with a setup message and the inbox shows that live matching is not configured. There is no mock-data fallback presented as live users.
