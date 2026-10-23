-- Oct 23 2026 (Larry): a Hang Up is something we need to talk about, so it is automatically a HEADER in the one tree and its TOPIC.
-- _hangup_header_for(card): finds or creates a header named after the card (its Header text, else the start of its Task text) directly under the
-- topic the card sits in now, then points the card's TOPIC at that header. Running it again changes nothing. Not callable from the website.
-- ensure_hangup_header(card): the website's door to it; only the card's owner gets through.
create or replace function public._hangup_header_for(p_idea uuid) returns uuid
language plpgsql security definer set search_path to 'public' as $function$
declare v_topic uuid; v_name text; v_uid uuid; v_root uuid; v_hdr uuid;
begin
  select coalesce(tf.project_header_id, i.cluster_id),
         left(coalesce(nullif(btrim(i.subject),''), nullif(btrim(i.text_content),'')), 80),
         i.user_id, i.project_id
    into v_topic, v_name, v_uid, v_root
    from ideas i left join task_fields tf on tf.idea_id = i.id
   where i.id = p_idea;
  if v_name is null or v_topic is null then return null; end if;

  -- already pointing at its own header
  select i.id into v_hdr from ideas i
   where i.id = v_topic and i.content_type = 'header'
     and lower(btrim(coalesce(nullif(btrim(i.subject),''), i.text_content))) = lower(btrim(v_name));
  if v_hdr is not null then return v_hdr; end if;

  select i.id into v_hdr from ideas i
   where i.cluster_id = v_topic and i.content_type = 'header'
     and lower(btrim(coalesce(nullif(btrim(i.subject),''), i.text_content))) = lower(btrim(v_name))
   limit 1;
  if v_hdr is null then
    insert into ideas (user_id, content_type, text_content, cluster_id, project_id, topic_scope_id)
    values (v_uid, 'header', v_name, v_topic, v_root, v_root) returning id into v_hdr;
  end if;
  update task_fields set project_header_id = v_hdr where idea_id = p_idea;
  return v_hdr;
end $function$;
revoke all on function public._hangup_header_for(uuid) from public, anon, authenticated;

create or replace function public.ensure_hangup_header(p_idea uuid) returns uuid
language plpgsql security definer set search_path to 'public' as $function$
begin
  if auth.uid() is null or not exists (select 1 from ideas where id = p_idea and user_id = auth.uid()) then return null; end if;
  return public._hangup_header_for(p_idea);
end $function$;
revoke all on function public.ensure_hangup_header(uuid) from public, anon;
grant execute on function public.ensure_hangup_header(uuid) to authenticated;

-- every card already in HANG-UPS gets its header now
do $$ declare r record; begin
  for r in select idea_id from task_fields where col = 'hangups' loop perform public._hangup_header_for(r.idea_id); end loop;
end $$;
