create table if not exists driver_checks (
  id                      uuid primary key default gen_random_uuid(),
  operator_id             uuid not null references operators(id) on delete cascade,
  renter_id               uuid references renters(id) on delete cascade,
  renter_email            text,
  renter_name             text,
  renter_dob              text,
  renter_license_number   text,
  renter_license_state    text,
  stripe_payment_intent_id text,
  stripe_charge_amount    integer,
  checkr_candidate_id     text,
  checkr_report_id        text,
  checkr_invitation_id    text,
  status                  text not null default 'pending',
  result                  text,
  report_data             jsonb,
  license_status          text,
  license_class           text,
  violations_count        integer,
  accidents_count         integer,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  completed_at            timestamptz
);

create index if not exists driver_checks_operator_id_idx       on driver_checks(operator_id);
create index if not exists driver_checks_renter_id_idx         on driver_checks(renter_id);
create index if not exists driver_checks_checkr_candidate_idx  on driver_checks(checkr_candidate_id);
create index if not exists driver_checks_checkr_report_idx     on driver_checks(checkr_report_id);
create index if not exists driver_checks_status_idx            on driver_checks(status);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger driver_checks_updated_at
  before update on driver_checks
  for each row execute procedure set_updated_at();

alter table driver_checks enable row level security;

create policy "operators_select_own_driver_checks"
  on driver_checks
  for select
  using (
    operator_id in (
      select id from operators where id = auth.uid()
    )
  );
