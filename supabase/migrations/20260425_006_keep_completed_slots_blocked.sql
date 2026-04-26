create or replace function public.get_disponibilidade(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  weekday_number int;
  is_closed boolean := false;
  slot_start timestamptz;
  slot_end timestamptz;
  current_time_slot time;
  slots jsonb := '[]'::jsonb;
  opening_time time := '08:00';
  closing_time time := '20:00';
  lunch_start time := '12:00';
  lunch_end time := '13:00';
  slot_duration interval := interval '45 minutes';
  has_conflict boolean;
begin
  perform public.expire_pending_appointments();

  weekday_number := extract(dow from p_date);

  if weekday_number = 0 then
    is_closed := true;
  end if;

  if is_closed then
    return jsonb_build_object(
      'status', 'closed',
      'date', p_date,
      'slots', '[]'::jsonb
    );
  end if;

  current_time_slot := opening_time;

  while current_time_slot + slot_duration <= closing_time loop
    if not (
      current_time_slot >= lunch_start
      and current_time_slot < lunch_end
    ) then
      slot_start := (p_date::text || ' ' || current_time_slot::text || '-03')::timestamptz;
      slot_end := slot_start + slot_duration;

      select exists (
        select 1
        from public.appointments a
        where a.appointment_start < slot_end
          and a.appointment_end > slot_start
          and (
            a.booking_status in ('confirmed', 'completed')
            or (
              a.booking_status = 'pending_payment'
              and a.expires_at is not null
              and a.expires_at > now()
            )
          )
      )
      into has_conflict;

      if not has_conflict then
        slots := slots || jsonb_build_array(
          jsonb_build_object(
            'time', to_char(slot_start at time zone 'America/Sao_Paulo', 'HH24:MI'),
            'start', to_char(slot_start, 'YYYY-MM-DD"T"HH24:MI:SSOF'),
            'end', to_char(slot_end, 'YYYY-MM-DD"T"HH24:MI:SSOF')
          )
        );
      end if;
    end if;

    current_time_slot := current_time_slot + slot_duration;
  end loop;

  return jsonb_build_object(
    'status', 'open',
    'date', p_date,
    'slots', slots
  );
end;
$$;
