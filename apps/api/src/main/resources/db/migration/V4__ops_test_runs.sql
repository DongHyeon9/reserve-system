-- Synthetic targets for SANDBOX operations tests: hidden from customers and admin catalog, deleted after a TTL.
alter table popups add column synthetic boolean not null default false;

alter table operation_test_runs
    add column target_rps int not null default 10 check (target_rps between 1 and 100),
    add column capacity int not null default 20 check (capacity between 1 and 200),
    add column target_popup_id bigint,
    add column result jsonb not null default '{}',
    add column cleaned_at timestamptz;

-- Synthetic slots and popups are deleted on cleanup; keep the run history.
alter table operation_test_runs drop constraint operation_test_runs_target_slot_id_fkey;
alter table operation_test_runs
    add constraint operation_test_runs_target_slot_id_fkey foreign key (target_slot_id) references slots (id) on delete set null,
    add constraint operation_test_runs_target_popup_id_fkey foreign key (target_popup_id) references popups (id) on delete set null;
