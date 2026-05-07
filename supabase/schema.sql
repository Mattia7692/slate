-- ============================================================
-- SLATE — Schema SQL completo per Supabase
-- ============================================================

-- Abilita estensioni necessarie
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================

create type user_role as enum ('photographer', 'model');
create type profile_status as enum ('pending', 'approved', 'suspended');
create type project_status as enum (
  'proposed',
  'accepted',
  'brief_signed',
  'paid',
  'completed',
  'disputed',
  'cancelled'
);
create type payer_role as enum ('photographer', 'model', 'tfp');
create type shoot_usage as enum ('portfolio_only', 'social', 'commercial');

-- ============================================================
-- PROFILES
-- ============================================================

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null,
  full_name       text not null,
  bio             text,
  city            text,
  instagram_url   text,
  years_in_industry integer not null default 0 check (years_in_industry >= 0),
  oldest_photo_url text,
  avatar_url       text,
  xp              integer not null default 0 check (xp >= 0),
  level           integer not null default 1 check (level between 1 and 5),
  status          profile_status not null default 'pending',
  created_at      timestamptz not null default now()
);

-- Calcola il livello in base agli XP
create or replace function compute_level(xp integer)
returns integer
language sql
immutable
as $$
  select case
    when xp >= 10000 then 5
    when xp >= 4000  then 4
    when xp >= 1500  then 3
    when xp >= 500   then 2
    else 1
  end;
$$;

-- Trigger: aggiorna il livello automaticamente quando cambiano gli XP
create or replace function sync_profile_level()
returns trigger
language plpgsql
as $$
begin
  new.level := compute_level(new.xp);
  return new;
end;
$$;

create trigger trg_sync_profile_level
before insert or update of xp on profiles
for each row execute function sync_profile_level();

-- RLS
alter table profiles enable row level security;

-- Chiunque può vedere i profili approvati
create policy "profili approvati visibili a tutti"
  on profiles for select
  using (status = 'approved');

-- Ogni utente può vedere il proprio profilo (anche se pending)
create policy "utente vede il proprio profilo"
  on profiles for select
  using (auth.uid() = id);

-- Ogni utente può aggiornare solo il proprio profilo
create policy "utente aggiorna il proprio profilo"
  on profiles for update
  using (auth.uid() = id);

-- Insert solo tramite funzione server (signup flow)
create policy "insert profilo solo da service role"
  on profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- PORTFOLIO ITEMS
-- ============================================================

create table portfolio_items (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  image_url   text not null,
  caption     text,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_portfolio_items_profile on portfolio_items(profile_id);

alter table portfolio_items enable row level security;

create policy "portfolio visibile per profili approvati"
  on portfolio_items for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = portfolio_items.profile_id
        and profiles.status = 'approved'
    )
  );

create policy "utente gestisce il proprio portfolio"
  on portfolio_items for all
  using (auth.uid() = profile_id);

-- ============================================================
-- INVITE CODES
-- ============================================================

create table invite_codes (
  id          uuid primary key default uuid_generate_v4(),
  code        text not null unique,
  created_by  uuid not null references profiles(id),
  used_by     uuid references profiles(id) default null,
  used_at     timestamptz default null,
  created_at  timestamptz not null default now()
);

create index idx_invite_codes_code on invite_codes(code);

alter table invite_codes enable row level security;

-- Solo service role / admin gestisce i codici
create policy "admin gestisce invite codes"
  on invite_codes for all
  using (false); -- bloccato per client, gestito via service role

-- ============================================================
-- PROJECTS
-- ============================================================

create table projects (
  id                       uuid primary key default uuid_generate_v4(),
  photographer_id          uuid not null references profiles(id),
  model_id                 uuid not null references profiles(id),
  proposed_by              uuid references profiles(id) default null,
  status                   project_status not null default 'proposed',
  payer_role               payer_role not null default 'tfp',
  amount                   integer not null default 0 check (amount >= 0), -- centesimi
  stripe_payment_intent_id text default null,
  created_at               timestamptz not null default now(),

  constraint different_participants check (photographer_id != model_id)
);

create index idx_projects_photographer on projects(photographer_id);
create index idx_projects_model on projects(model_id);
create index idx_projects_status on projects(status);

alter table projects enable row level security;

-- Solo i partecipanti al progetto possono vederlo
create policy "partecipanti vedono il progetto"
  on projects for select
  using (
    auth.uid() = photographer_id or
    auth.uid() = model_id
  );

-- Solo i partecipanti possono aggiornare (es. accettare proposta)
create policy "partecipanti aggiornano il progetto"
  on projects for update
  using (
    auth.uid() = photographer_id or
    auth.uid() = model_id
  );

-- Qualsiasi utente approvato può proporre un progetto
create policy "utente approvato crea progetto"
  on projects for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.status = 'approved'
    )
  );

-- ============================================================
-- BRIEFS
-- ============================================================

create table briefs (
  id                         uuid primary key default uuid_generate_v4(),
  project_id                 uuid not null unique references projects(id) on delete cascade,
  shoot_type                 text not null, -- es. 'fashion editorial', 'commercial', 'beauty'
  shoot_date                 date not null,
  duration_hours             numeric(4,1) not null check (duration_hours > 0),
  location_description       text not null,
  deliverables_count         integer not null check (deliverables_count > 0),
  delivery_days              integer not null check (delivery_days > 0),
  usage                      shoot_usage not null,
  notes                      text,
  signed_by_photographer_at  timestamptz default null,
  signed_by_model_at         timestamptz default null,
  created_at                 timestamptz not null default now()
);

alter table briefs enable row level security;

-- Solo i partecipanti al progetto vedono il brief
create policy "partecipanti vedono il brief"
  on briefs for select
  using (
    exists (
      select 1 from projects
      where projects.id = briefs.project_id
        and (projects.photographer_id = auth.uid() or projects.model_id = auth.uid())
    )
  );

create policy "partecipanti gestiscono il brief"
  on briefs for all
  using (
    exists (
      select 1 from projects
      where projects.id = briefs.project_id
        and (projects.photographer_id = auth.uid() or projects.model_id = auth.uid())
    )
  );

-- ============================================================
-- REVIEWS
-- ============================================================

create table reviews (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references projects(id) on delete cascade,
  reviewer_id  uuid not null references profiles(id),
  reviewee_id  uuid not null references profiles(id),
  rating       integer not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now(),

  constraint unique_review_per_project unique (project_id, reviewer_id),
  constraint reviewer_not_reviewee check (reviewer_id != reviewee_id)
);

create index idx_reviews_reviewee on reviews(reviewee_id);
create index idx_reviews_project on reviews(project_id);

alter table reviews enable row level security;

-- Le recensioni sono pubbliche (trasparenza)
create policy "recensioni visibili a tutti"
  on reviews for select
  using (true);

-- Solo il reviewer può scrivere la propria recensione
create policy "reviewer crea la propria recensione"
  on reviews for insert
  with check (auth.uid() = reviewer_id);

-- ============================================================
-- MESSAGES
-- ============================================================

create table messages (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  sender_id   uuid not null references profiles(id),
  content     text not null check (char_length(content) > 0),
  created_at  timestamptz not null default now()
);

create index idx_messages_project on messages(project_id, created_at);

alter table messages enable row level security;

-- Solo i partecipanti al progetto leggono i messaggi
create policy "partecipanti leggono i messaggi"
  on messages for select
  using (
    exists (
      select 1 from projects
      where projects.id = messages.project_id
        and (projects.photographer_id = auth.uid() or projects.model_id = auth.uid())
    )
  );

-- Solo i partecipanti al progetto inviano messaggi
create policy "partecipanti inviano messaggi"
  on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from projects
      where projects.id = messages.project_id
        and (projects.photographer_id = auth.uid() or projects.model_id = auth.uid())
    )
  );

-- ============================================================
-- XP TRANSACTIONS (log degli XP, opzionale ma consigliato)
-- ============================================================

create type xp_reason as enum (
  'seniority_bonus',
  'shoot_completed',
  'review_5_stars',
  'review_4_stars',
  'master_collaboration',
  'no_show_penalty',
  'late_cancellation_penalty',
  'report_penalty'
);

create table xp_transactions (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  delta       integer not null, -- positivo = guadagno, negativo = penalità
  reason      xp_reason not null,
  project_id  uuid references projects(id) default null,
  created_at  timestamptz not null default now()
);

create index idx_xp_transactions_profile on xp_transactions(profile_id);

alter table xp_transactions enable row level security;

create policy "utente vede le proprie transazioni xp"
  on xp_transactions for select
  using (auth.uid() = profile_id);

-- Funzione per applicare XP e loggare la transazione atomicamente
create or replace function apply_xp(
  p_profile_id uuid,
  p_delta      integer,
  p_reason     xp_reason,
  p_project_id uuid default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- Applica il delta (non scendere sotto 0)
  update profiles
  set xp = greatest(0, xp + p_delta)
  where id = p_profile_id;

  -- Logga la transazione
  insert into xp_transactions (profile_id, delta, reason, project_id)
  values (p_profile_id, p_delta, p_reason, p_project_id);
end;
$$;

-- ============================================================
-- DIRECT MESSAGES (chat 1:1 tra utenti)
-- ============================================================

create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  participant_1   uuid not null references profiles(id) on delete cascade,
  participant_2   uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),

  constraint different_participants check (participant_1 != participant_2),
  constraint unique_conversation unique (participant_1, participant_2)
);

create index idx_conversations_p1 on conversations(participant_1);
create index idx_conversations_p2 on conversations(participant_2);

alter table conversations enable row level security;

create policy "partecipanti vedono le proprie conversazioni"
  on conversations for select
  using (auth.uid() = participant_1 or auth.uid() = participant_2);

create policy "utente approvato crea conversazione"
  on conversations for insert
  with check (
    (auth.uid() = participant_1 or auth.uid() = participant_2)
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.status = 'approved'
    )
  );


create table direct_messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender_id        uuid not null references profiles(id) on delete cascade,
  content          text not null check (char_length(content) > 0),
  created_at       timestamptz not null default now()
);

create index idx_direct_messages_conv on direct_messages(conversation_id, created_at);

alter table direct_messages enable row level security;

create policy "partecipanti leggono i direct messages"
  on direct_messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = direct_messages.conversation_id
        and (conversations.participant_1 = auth.uid() or conversations.participant_2 = auth.uid())
    )
  );

create policy "partecipanti inviano direct messages"
  on direct_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations
      where conversations.id = direct_messages.conversation_id
        and (conversations.participant_1 = auth.uid() or conversations.participant_2 = auth.uid())
    )
  );

-- ============================================================
-- REALTIME (abilita canali per chat e notifiche)
-- ============================================================

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table direct_messages;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

-- Questi vanno creati dalla dashboard Supabase o via API,
-- qui sono documentati come riferimento:
--
-- bucket: "portfolio"       → immagini portfolio (pubblico)
-- bucket: "oldest-photos"   → foto per verifica anzianità (privato)
-- bucket: "avatars"         → foto profilo (pubblico)
