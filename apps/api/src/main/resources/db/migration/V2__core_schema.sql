-- Users mirror Supabase auth.users by id (JWT sub). Roles are server-managed, never taken from token claims.
create table app_users (
    id           uuid primary key,
    email        text not null,
    display_name text,
    created_at   timestamptz not null default now()
);

create table user_roles (
    user_id    uuid not null references app_users (id) on delete cascade,
    role       text not null check (role in ('CUSTOMER', 'ADMIN', 'OPS_TEST')),
    granted_at timestamptz not null default now(),
    primary key (user_id, role)
);

-- Publish status (visibility) is separate from reservation status (WAITING/OPEN/CLOSED, derived at request time).
create table popups (
    id                  bigint generated always as identity primary key,
    title               text not null check (char_length(title) between 1 and 100),
    label               text not null check (char_length(label) between 1 and 40),
    area                text not null,
    category            text not null,
    summary             text not null,
    description         text not null default '',
    notice              text,
    address             text not null,
    operating_hours     text not null,
    visit_minutes       int  not null check (visit_minutes between 10 and 600),
    art_theme           text not null default 'red' check (art_theme in ('red', 'blue', 'green', 'orange', 'purple', 'yellow')),
    starts_on           date not null,
    ends_on             date not null,
    publish_status      text not null default 'DRAFT' check (publish_status in ('DRAFT', 'PUBLISHED', 'ENDED')),
    opens_at            timestamptz not null,
    closes_at           timestamptz,
    manually_closed     boolean not null default false,
    max_party_size      int not null default 4 check (max_party_size between 1 and 10),
    cancel_cutoff_hours int not null default 24 check (cancel_cutoff_hours between 0 and 168),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    check (starts_on <= ends_on),
    check (closes_at is null or closes_at > opens_at)
);

create table slots (
    id             bigint generated always as identity primary key,
    popup_id       bigint not null references popups (id) on delete restrict,
    starts_at      timestamptz not null,
    ends_at        timestamptz not null,
    capacity       int not null check (capacity > 0),
    reserved_count int not null default 0,
    unique (popup_id, starts_at),
    check (ends_at > starts_at),
    check (reserved_count between 0 and capacity)
);

create sequence reservation_code_seq;

create table reservations (
    id            uuid primary key default gen_random_uuid(),
    code          text not null unique,
    user_id       uuid not null references app_users (id),
    popup_id      bigint not null references popups (id),
    slot_id       bigint not null references slots (id),
    party_size    int not null check (party_size between 1 and 10),
    contact_name  text not null check (char_length(contact_name) between 1 and 50),
    contact_phone text not null check (contact_phone ~ '^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$'),
    contact_email text not null check (char_length(contact_email) <= 254),
    status        text not null default 'CONFIRMED' check (status in ('CONFIRMED', 'CANCELLED', 'CHECKED_IN')),
    created_at    timestamptz not null default now(),
    cancelled_at  timestamptz,
    checked_in_at timestamptz,
    check ((status = 'CANCELLED') = (cancelled_at is not null)),
    check ((status = 'CHECKED_IN') = (checked_in_at is not null))
);

-- One active reservation per user per slot; cancelled rows do not block re-booking.
create unique index reservations_active_user_slot on reservations (user_id, slot_id) where status <> 'CANCELLED';
create index reservations_user_created on reservations (user_id, created_at desc);
create index reservations_slot on reservations (slot_id);

create table reservation_events (
    id             bigint generated always as identity primary key,
    reservation_id uuid not null references reservations (id),
    type           text not null check (type in ('CREATED', 'CANCELLED', 'CHECKED_IN')),
    actor_id       uuid references app_users (id),
    actor_role     text not null,
    occurred_at    timestamptz not null default now()
);
create index reservation_events_reservation on reservation_events (reservation_id, occurred_at);

-- Replayed create/cancel commands with the same key return the original result.
create table idempotency_keys (
    user_id        uuid not null references app_users (id),
    operation      text not null,
    idem_key       text not null check (char_length(idem_key) between 8 and 100),
    request_hash   text not null,
    reservation_id uuid references reservations (id),
    created_at     timestamptz not null default now(),
    primary key (user_id, operation, idem_key)
);

create table operation_test_runs (
    id               uuid primary key default gen_random_uuid(),
    scenario         text not null check (scenario in ('LOAD', 'CONCURRENT_RESERVE', 'LATENCY', 'FAULT')),
    target_slot_id   bigint references slots (id),
    virtual_users    int not null check (virtual_users between 1 and 100),
    duration_seconds int not null check (duration_seconds between 5 and 60),
    status           text not null check (status in ('RUNNING', 'STOPPED', 'COMPLETED', 'FAILED')),
    started_by       uuid not null references app_users (id),
    started_at       timestamptz not null default now(),
    ended_at         timestamptz,
    expires_at       timestamptz not null
);
-- At most one test run at a time.
create unique index operation_test_runs_single_running on operation_test_runs ((true)) where status = 'RUNNING';

create table audit_logs (
    id          bigint generated always as identity primary key,
    actor_id    uuid references app_users (id),
    action      text not null,
    target_type text not null,
    target_id   text not null,
    detail      jsonb not null default '{}',
    created_at  timestamptz not null default now()
);
create index audit_logs_target on audit_logs (target_type, target_id, created_at);
