create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete set null,
  category text not null,
  amount numeric(10,2) not null,
  description text,
  expense_date date not null,
  created_at timestamptz default now()
);
create index on expenses(operator_id);
create index on expenses(expense_date);
alter table expenses enable row level security;
create policy "operators own expenses" on expenses for all using (operator_id = (select id from operators where user_id = auth.uid()));
