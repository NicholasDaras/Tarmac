# Tarmac Database Schema

## Tables

### profiles
User profiles extending Supabase auth.users

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  bio text,
  profile_photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );
```

### cars
User's owned vehicles

```sql
create table cars (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  make text not null,
  model text not null,
  year integer,
  photo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table cars enable row level security;

create policy "Cars are viewable by everyone"
  on cars for select
  using ( true );

create policy "Users can manage their own cars"
  on cars for all
  using ( auth.uid() = user_id );
```

### drives
Main drive posts

```sql
create table drives (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  rating integer check (rating >= 1 and rating <= 5),
  route_data jsonb, -- GPX data or route description
  tags text[], -- array of tags
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table drives enable row level security;

create policy "Drives are viewable by everyone"
  on drives for select
  using ( true );

create policy "Users can create their own drives"
  on drives for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own drives"
  on drives for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own drives"
  on drives for delete
  using ( auth.uid() = user_id );
```

### drive_photos
Photos associated with drives

```sql
create table drive_photos (
  id uuid default gen_random_uuid() primary key,
  drive_id uuid references drives(id) on delete cascade not null,
  photo_url text not null,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table drive_photos enable row level security;

create policy "Drive photos are viewable by everyone"
  on drive_photos for select
  using ( true );

create policy "Users can manage photos for their drives"
  on drive_photos for all
  using (
    exists (
      select 1 from drives
      where drives.id = drive_photos.drive_id
      and drives.user_id = auth.uid()
    )
  );
```

### drive_stops
Points of interest on drives

```sql
create table drive_stops (
  id uuid default gen_random_uuid() primary key,
  drive_id uuid references drives(id) on delete cascade not null,
  name text not null,
  description text,
  latitude numeric,
  longitude numeric,
  photo_url text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table drive_stops enable row level security;

create policy "Drive stops are viewable by everyone"
  on drive_stops for select
  using ( true );

create policy "Users can manage stops for their drives"
  on drive_stops for all
  using (
    exists (
      select 1 from drives
      where drives.id = drive_stops.drive_id
      and drives.user_id = auth.uid()
    )
  );
```

### events
Car meetup events

```sql
create table events (
  id uuid default gen_random_uuid() primary key,
  organizer_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  date_time timestamp with time zone not null,
  latitude numeric,
  longitude numeric,
  location_name text,
  car_requirements text,
  theme text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table events enable row level security;

create policy "Events are viewable by everyone"
  on events for select
  using ( true );

create policy "Users can create events"
  on events for insert
  with check ( auth.uid() = organizer_id );

create policy "Organizers can update their events"
  on events for update
  using ( auth.uid() = organizer_id );

create policy "Organizers can delete their events"
  on events for delete
  using ( auth.uid() = organizer_id );
```

### event_rsvps
Event attendance

```sql
create type rsvp_status as enum ('going', 'interested', 'cant_go');

create table event_rsvps (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  status rsvp_status not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, user_id)
);

-- RLS
alter table event_rsvps enable row level security;

create policy "RSVPs are viewable by everyone"
  on event_rsvps for select
  using ( true );

create policy "Users can manage their own RSVPs"
  on event_rsvps for all
  using ( auth.uid() = user_id );
```

### likes, saves, comments, follows
Social features (similar RLS patterns)

## Indexes

```sql
-- Performance indexes
create index idx_drives_user_id on drives(user_id);
create index idx_drives_created_at on drives(created_at desc);
create index idx_drives_tags on drives using gin(tags);
create index idx_events_date_time on events(date_time);
create index idx_drive_photos_drive_id on drive_photos(drive_id);
create index idx_drive_stops_drive_id on drive_stops(drive_id);
```

## Storage Buckets

```sql
-- Profile photos
insert into storage.buckets (id, name) values ('profiles', 'profiles');

-- Drive photos  
insert into storage.buckets (id, name) values ('drives', 'drives');

-- Event photos
insert into storage.buckets (id, name) values ('events', 'events');
```
