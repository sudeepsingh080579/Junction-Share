-- JunctionShare live matching backend. Run in Supabase SQL editor or with Supabase CLI.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 first_name text not null check(length(first_name) between 1 and 40),
 phone_e164 text not null default '' check(phone_e164='' or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
 share_location boolean not null default false, whatsapp_opt_in boolean not null default false,
 whatsapp_alerts_opt_in boolean not null default false, whatsapp_alerts_opted_in_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.ride_requests (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('need','offer')), destination text not null check(length(destination) between 1 and 180),
 destination_lat double precision, destination_lng double precision,
 radius_m integer not null check(radius_m in (100,500,1000)), window_min integer not null check(window_min in (10,15,30)),
 note text not null default '' check(length(note)<=500), latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180), seats integer not null default 1 check(seats between 1 and 8),
 created_at timestamptz not null default now(), expires_at timestamptz not null, active boolean not null default true
);
create index if not exists ride_requests_active_expiry_idx on public.ride_requests(active,expires_at);
create index if not exists ride_requests_owner_active_idx on public.ride_requests(owner_id,active,created_at desc);
create table if not exists public.request_interests(request_id uuid not null references public.ride_requests(id) on delete cascade, from_user uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(request_id,from_user));
create table if not exists public.request_declines(request_id uuid not null references public.ride_requests(id) on delete cascade, from_user uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key(request_id,from_user));
create table if not exists public.whatsapp_alert_deliveries(
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.ride_requests(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 status text not null check(status in ('sending','sent','failed')), attempt_count integer not null default 1,
 message_id text, last_error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(request_id,recipient_id)
);
alter table public.profiles enable row level security;
alter table public.ride_requests enable row level security;
alter table public.request_interests enable row level security;
alter table public.request_declines enable row level security;
alter table public.whatsapp_alert_deliveries enable row level security;
revoke all on public.profiles,public.ride_requests,public.request_interests,public.request_declines,public.whatsapp_alert_deliveries from anon,authenticated;
create policy profiles_private_to_owner on public.profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy requests_private_to_owner on public.ride_requests for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy interests_private_to_owner on public.request_interests for all to authenticated using(from_user=(select auth.uid())) with check(from_user=(select auth.uid()));
create policy declines_private_to_owner on public.request_declines for all to authenticated using(from_user=(select auth.uid())) with check(from_user=(select auth.uid()));

create or replace function public.save_my_profile(p_first_name text,p_phone_e164 text,p_share_location boolean,p_whatsapp_opt_in boolean,p_whatsapp_alerts_opt_in boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.profiles as current_profile(user_id,first_name,phone_e164,share_location,whatsapp_opt_in,whatsapp_alerts_opt_in,whatsapp_alerts_opted_in_at,updated_at)
 values(auth.uid(),left(coalesce(nullif(trim(p_first_name),''),'Neighbor'),40),coalesce(p_phone_e164,''),coalesce(p_share_location,false),coalesce(p_whatsapp_opt_in,false),coalesce(p_whatsapp_alerts_opt_in,false),case when p_whatsapp_alerts_opt_in then now() else null end,now())
 on conflict(user_id) do update set first_name=excluded.first_name,phone_e164=excluded.phone_e164,share_location=excluded.share_location,whatsapp_opt_in=excluded.whatsapp_opt_in,
  whatsapp_alerts_opted_in_at=case when excluded.whatsapp_alerts_opt_in then case when not current_profile.whatsapp_alerts_opt_in then now() else current_profile.whatsapp_alerts_opted_in_at end else null end,
  whatsapp_alerts_opt_in=excluded.whatsapp_alerts_opt_in,updated_at=now();
 if not coalesce(p_share_location,false) then update public.ride_requests set active=false where owner_id=auth.uid() and active; end if;
end $$;

create or replace function public.publish_request(p_role text,p_destination text,p_destination_lat double precision,p_destination_lng double precision,p_radius_m integer,p_window_min integer,p_note text,p_latitude double precision,p_longitude double precision) returns table(request_id uuid,created_at timestamptz) language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); prof public.profiles%rowtype; req public.ride_requests%rowtype;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into prof from public.profiles where user_id=uid;
 if not found or not prof.share_location then raise exception 'Enable location sharing in your profile'; end if;
 if prof.first_name='Neighbor' or prof.phone_e164='' then raise exception 'Add your first name and WhatsApp number before broadcasting'; end if;
 if p_role not in('need','offer') or p_radius_m not in(100,500,1000) or p_window_min not in(10,15,30) then raise exception 'Invalid request options'; end if;
 update public.ride_requests set active=false where owner_id=uid and active;
 insert into public.ride_requests(owner_id,role,destination,destination_lat,destination_lng,radius_m,window_min,note,latitude,longitude,expires_at)
 values(uid,p_role,left(trim(p_destination),180),p_destination_lat,p_destination_lng,p_radius_m,p_window_min,left(coalesce(p_note,''),500),p_latitude,p_longitude,now()+make_interval(mins=>p_window_min)) returning * into req;
 return query select req.id,req.created_at;
end $$;

create or replace function public.nearby_requests() returns table(request_id uuid,first_name text,distance_m double precision,destination text,role text,seats integer,created_at timestamptz,window_min integer) language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); mine public.ride_requests%rowtype; mine_profile public.profiles%rowtype;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into mine_profile from public.profiles where user_id=uid;
 if not found or not mine_profile.share_location then return; end if;
 select * into mine from public.ride_requests r where r.owner_id=uid and r.active and r.expires_at>now() order by r.created_at desc limit 1;
 if not found then return; end if;
 return query select r.id,p.first_name,
 6371000*2*asin(sqrt(least(1.0,power(sin(radians(r.latitude-mine.latitude)/2),2)+cos(radians(mine.latitude))*cos(radians(r.latitude))*power(sin(radians(r.longitude-mine.longitude)/2),2)))),
 r.destination,r.role,r.seats,r.created_at,r.window_min from public.ride_requests r join public.profiles p on p.user_id=r.owner_id
 where r.owner_id<>uid and r.active and r.expires_at>now() and r.role<>mine.role and p.share_location
 and 6371000*2*asin(sqrt(least(1.0,power(sin(radians(r.latitude-mine.latitude)/2),2)+cos(radians(mine.latitude))*cos(radians(r.latitude))*power(sin(radians(r.longitude-mine.longitude)/2),2))))<=least(mine.radius_m,r.radius_m)
 and not exists(select 1 from public.request_declines d where d.request_id=r.id and d.from_user=uid) order by r.created_at desc limit 100;
end $$;

create or replace function public.express_interest(p_request_id uuid) returns table(matched boolean,request_id uuid,first_name text,phone_e164 text,distance_m double precision,destination text,role text,seats integer,created_at timestamptz,window_min integer) language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); mine public.ride_requests%rowtype; target public.ride_requests%rowtype; mine_profile public.profiles%rowtype; target_profile public.profiles%rowtype; dist double precision;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select * into mine from public.ride_requests r where r.owner_id=uid and r.active and r.expires_at>now() order by r.created_at desc limit 1;
 if not found then raise exception 'Publish an active request before expressing interest'; end if;
 select * into target from public.ride_requests r where r.id=p_request_id and r.owner_id<>uid and r.active and r.expires_at>now() and r.role<>mine.role;
 if not found then raise exception 'This request is no longer available'; end if;
 select * into mine_profile from public.profiles where user_id=uid;
 if not found or not mine_profile.share_location then raise exception 'Enable location sharing before expressing interest'; end if;
 select * into target_profile from public.profiles where user_id=target.owner_id;
 if not found or not target_profile.share_location then raise exception 'This request is no longer available'; end if;
 dist:=6371000*2*asin(sqrt(least(1.0,power(sin(radians(target.latitude-mine.latitude)/2),2)+cos(radians(mine.latitude))*cos(radians(target.latitude))*power(sin(radians(target.longitude-mine.longitude)/2),2))));
 if dist>least(mine.radius_m,target.radius_m) then raise exception 'This request is outside your matching radius'; end if;
 insert into public.request_interests(request_id,from_user) values(target.id,uid) on conflict do nothing;
 if exists(select 1 from public.request_interests i where i.request_id=mine.id and i.from_user=target.owner_id) then
  return query select true,target.id,target_profile.first_name,case when mine_profile.whatsapp_opt_in and target_profile.whatsapp_opt_in then target_profile.phone_e164 else null end,dist,target.destination,target.role,target.seats,target.created_at,target.window_min;
 else
  return query select false,target.id,target_profile.first_name,null::text,dist,target.destination,target.role,target.seats,target.created_at,target.window_min;
 end if;
end $$;
create or replace function public.decline_request(p_request_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.request_declines(request_id,from_user) select id,auth.uid() from public.ride_requests where id=p_request_id and owner_id<>auth.uid() and active on conflict do nothing;
end $$;
create or replace function public.end_my_request() returns void language plpgsql security definer set search_path='' as $$
begin update public.ride_requests set active=false where owner_id=auth.uid() and active; end $$;
create or replace function public.purge_expired_requests() returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
 delete from public.ride_requests where expires_at < now() - interval '10 minutes';
 get diagnostics removed = row_count;
 return removed;
end $$;
create or replace function public.claim_whatsapp_alerts(p_request_id uuid,p_owner_id uuid) returns table(delivery_id uuid,recipient_phone text) language plpgsql security definer set search_path='' as $$
declare request_row public.ride_requests%rowtype; recipient record; new_delivery uuid;
begin
 select * into request_row from public.ride_requests where id=p_request_id and owner_id=p_owner_id and active and expires_at>now();
 if not found then raise exception 'Request not found or expired'; end if;
 for recipient in
  with candidates as (
   select r.owner_id,r.radius_m,r.created_at,p.phone_e164,
    6371000*2*asin(sqrt(least(1.0,power(sin(radians(r.latitude-request_row.latitude)/2),2)+cos(radians(request_row.latitude))*cos(radians(r.latitude))*power(sin(radians(r.longitude-request_row.longitude)/2),2)))) as distance_m
   from public.ride_requests r join public.profiles p on p.user_id=r.owner_id
   where r.owner_id<>p_owner_id and r.active and r.expires_at>now() and r.role<>request_row.role
    and p.share_location and p.whatsapp_alerts_opt_in and p.phone_e164<>''
    and not exists(select 1 from public.request_declines d where d.request_id=request_row.id and d.from_user=r.owner_id)
  ) select * from candidates where distance_m<=least(request_row.radius_m,radius_m) order by created_at desc limit 50
 loop
  new_delivery:=null;
  insert into public.whatsapp_alert_deliveries(request_id,recipient_id,status,attempt_count)
  values(request_row.id,recipient.owner_id,'sending',1)
  on conflict(request_id,recipient_id) do update set status='sending',attempt_count=whatsapp_alert_deliveries.attempt_count+1,last_error=null,updated_at=now()
   where whatsapp_alert_deliveries.status='failed' and whatsapp_alert_deliveries.attempt_count<3
  returning id into new_delivery;
  if new_delivery is not null then return query select new_delivery,recipient.phone_e164; end if;
 end loop;
end $$;
create or replace function public.finish_whatsapp_alert(p_delivery_id uuid,p_sent boolean,p_message_id text,p_error text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.whatsapp_alert_deliveries set status=case when p_sent then 'sent' else 'failed' end,
  message_id=case when p_sent then left(p_message_id,250) else null end,
  last_error=case when p_sent then null else left(p_error,500) end,updated_at=now() where id=p_delivery_id;
end $$;
create or replace function public.my_active_request() returns table(request_id uuid,role text,destination text,destination_lat double precision,destination_lng double precision,radius_m integer,window_min integer,note text,created_at timestamptz) language sql security definer set search_path='' as $$
 select id,role,destination,destination_lat,destination_lng,radius_m,window_min,note,created_at from public.ride_requests
 where owner_id=auth.uid() and active and expires_at>now() order by created_at desc limit 1;
$$;
revoke all on function public.save_my_profile(text,text,boolean,boolean,boolean),public.publish_request(text,text,double precision,double precision,integer,integer,text,double precision,double precision),public.nearby_requests(),public.express_interest(uuid),public.decline_request(uuid),public.end_my_request(),public.my_active_request(),public.purge_expired_requests(),public.claim_whatsapp_alerts(uuid,uuid),public.finish_whatsapp_alert(uuid,boolean,text,text) from public,anon,authenticated;
grant execute on function public.save_my_profile(text,text,boolean,boolean,boolean),public.publish_request(text,text,double precision,double precision,integer,integer,text,double precision,double precision),public.nearby_requests(),public.express_interest(uuid),public.decline_request(uuid),public.end_my_request(),public.my_active_request() to authenticated;
grant execute on function public.claim_whatsapp_alerts(uuid,uuid),public.finish_whatsapp_alert(uuid,boolean,text,text) to service_role;
