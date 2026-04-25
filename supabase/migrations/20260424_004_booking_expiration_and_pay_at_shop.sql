-- =========================================================
-- Commit 4: Expiração de reserva + pay_at_shop + atualização da disponibilidade
-- =========================================================

-- Permite reservas sem autenticação obrigatória (via Edge Function com validação server-side)
alter table public.appointments
  alter column user_id drop not null;

-- payment_method_t: adiciona pay_at_shop
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'payment_method_t'
      AND e.enumlabel = 'pay_at_shop'
  ) THEN
    ALTER TYPE public.payment_method_t ADD VALUE 'pay_at_shop';
  END IF;
END $$;

-- booking_status_t: adiciona expired
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'booking_status_t'
      AND e.enumlabel = 'expired'
  ) THEN
    ALTER TYPE public.booking_status_t ADD VALUE 'expired';
  END IF;
END $$;

-- expires_at para reservas pendentes de pagamento
alter table public.appointments
  add column if not exists expires_at timestamptz null;

-- Backfill de reservas antigas pendentes sem expiração
update public.appointments
   set expires_at = coalesce(created_at, now()) + interval '15 minutes'
 where booking_status = 'pending_payment'
   and expires_at is null;

-- Consistência: pending_payment precisa de expires_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_pending_payment_requires_expires_chk'
      AND conrelid = 'public.appointments'::regclass
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_pending_payment_requires_expires_chk
      CHECK (
        booking_status <> 'pending_payment'
        OR expires_at IS NOT NULL
      );
  END IF;
END $$;

create index if not exists idx_appointments_pending_expires_at
  on public.appointments (expires_at)
  where booking_status = 'pending_payment';

-- Expira reservas pendentes vencidas
create or replace function public.expire_pending_appointments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  update public.appointments
     set booking_status = 'expired',
         updated_at = now()
   where booking_status = 'pending_payment'
     and expires_at is not null
     and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.expire_pending_appointments() from public;
grant execute on function public.expire_pending_appointments() to anon, authenticated;

-- Atualiza disponibilidade sem editar migration antiga
create or replace function public.get_disponibilidade(p_date date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_mode public.business_mode_t;
  v_opening time;
  v_closing time;
  v_lunch_start time;
  v_lunch_end time;
  v_slot_minutes integer;
  v_timezone text;
  v_slots jsonb;
begin
  perform public.expire_pending_appointments();

  select
    bs.mode,
    bs.opening_time,
    bs.closing_time,
    bs.lunch_start,
    bs.lunch_end,
    bs.slot_duration_minutes,
    bs.timezone
  into
    v_mode,
    v_opening,
    v_closing,
    v_lunch_start,
    v_lunch_end,
    v_slot_minutes,
    v_timezone
  from public.business_settings bs
  limit 1;

  if v_timezone is null then
    v_timezone := 'America/Sao_Paulo';
  end if;

  perform set_config('TimeZone', v_timezone, true);

  if v_mode = 'closed' then
    return jsonb_build_object(
      'date', to_char(p_date, 'YYYY-MM-DD'),
      'status', 'closed',
      'timezone', v_timezone,
      'slots', '[]'::jsonb
    );
  end if;

  with params as (
    select
      p_date as d,
      v_opening as opening_time,
      v_closing as closing_time,
      v_lunch_start as lunch_start,
      v_lunch_end as lunch_end,
      make_interval(mins => v_slot_minutes) as slot_interval,
      v_timezone as tz
  ),
  bounds as (
    select
      (d::timestamp + opening_time) at time zone tz as day_open_utc,
      (d::timestamp + closing_time) at time zone tz as day_close_utc,
      lunch_start,
      lunch_end,
      slot_interval,
      tz
    from params
  ),
  base_slots as (
    select
      gs as slot_start,
      gs + b.slot_interval as slot_end,
      b.tz,
      b.lunch_start,
      b.lunch_end
    from bounds b
    cross join lateral generate_series(
      b.day_open_utc,
      b.day_close_utc - b.slot_interval,
      b.slot_interval
    ) as gs
  ),
  slots_sem_almoco as (
    select
      s.slot_start,
      s.slot_end,
      s.tz
    from base_slots s
    where not (
      (s.slot_start at time zone s.tz)::time < s.lunch_end
      and
      (s.slot_end at time zone s.tz)::time > s.lunch_start
    )
  ),
  slots_livres as (
    select
      s.slot_start,
      s.slot_end
    from slots_sem_almoco s
    where not exists (
      select 1
      from public.appointments a
      where (
        a.booking_status = 'confirmed'
        or (
          a.booking_status = 'pending_payment'
          and a.expires_at is not null
          and a.expires_at > now()
        )
      )
      and tstzrange(a.appointment_start, a.appointment_end, '[)') && tstzrange(s.slot_start, s.slot_end, '[)')
    )
    and not exists (
      select 1
      from public.blocked_slots b
      where tstzrange(b.slot_start, b.slot_end, '[)') && tstzrange(s.slot_start, s.slot_end, '[)')
    )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'time', to_char(slot_start, 'HH24:MI'),
        'start', to_char(slot_start, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
        'end', to_char(slot_end, 'YYYY-MM-DD"T"HH24:MI:SSOF')
      )
      order by slot_start
    ),
    '[]'::jsonb
  )
  into v_slots
  from slots_livres;

  return jsonb_build_object(
    'date', to_char(p_date, 'YYYY-MM-DD'),
    'status', 'open',
    'timezone', v_timezone,
    'slots', v_slots
  );
end;
$$;

revoke all on function public.get_disponibilidade(date) from public;
grant execute on function public.get_disponibilidade(date) to anon, authenticated;