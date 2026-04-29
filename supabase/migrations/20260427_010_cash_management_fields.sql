alter table public.appointments
add column if not exists final_payment_method text,
add column if not exists final_total numeric(10, 2),
add column if not exists paid_at timestamptz,
add column if not exists completed_at timestamptz,
add column if not exists admin_notes text;

alter table public.appointments
drop constraint if exists appointments_final_payment_method_check;

alter table public.appointments
add constraint appointments_final_payment_method_check
check (
  final_payment_method is null
  or final_payment_method in (
    'cash',
    'pix',
    'debit',
    'credit',
    'courtesy',
    'other'
  )
);

update public.appointments
set final_total = total_price
where final_total is null
  and total_price is not null;
