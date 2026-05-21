
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  agency_name text,
  first_name text not null,
  birth_date_formatted text not null,
  country text not null,
  created_at timestamptz not null default now()
);
create unique index agents_unique_idx on public.agents (lower(first_name), lower(coalesce(agency_name,'')), birth_date_formatted, country);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  property_type text,
  title text,
  price_usd numeric,
  general_location text,
  description text,
  attributes jsonb default '{}'::jsonb,
  images_urls jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index properties_agent_idx on public.properties(agent_id);

alter table public.agents enable row level security;
alter table public.properties enable row level security;

create policy "agents read all" on public.agents for select using (true);
create policy "agents insert all" on public.agents for insert with check (true);

create policy "properties read all" on public.properties for select using (true);
create policy "properties insert all" on public.properties for insert with check (true);

insert into storage.buckets (id, name, public) values ('property-media','property-media', true)
on conflict (id) do nothing;

create policy "property-media public read" on storage.objects for select using (bucket_id = 'property-media');
create policy "property-media public insert" on storage.objects for insert with check (bucket_id = 'property-media');
create policy "property-media public delete" on storage.objects for delete using (bucket_id = 'property-media');
