-- Починка триггера аудита: у таблицы limits нет колонки id, из-за чего запись лимитов падала.
create or replace function audit_change() returns trigger as $$
declare
  row_family uuid;
  entity_key text;
  payload jsonb;
begin
  payload := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));

  -- у limits нет своей колонки id: ключом записи выступает ребёнок
  if tg_table_name = 'limits' then
    entity_key := coalesce(new.child_id, old.child_id)::text;
  else
    entity_key := coalesce(new.id, old.id)::text;
  end if;

  row_family := null;
  if tg_table_name = 'consents' then
    row_family := coalesce(new.family_id, old.family_id);
  end if;
  if row_family is null then
    select family_id into row_family from children
      where id = coalesce(new.child_id, old.child_id);
  end if;

  insert into audit_log (family_id, action, entity, entity_id, payload)
  values (row_family, lower(tg_op), tg_table_name, entity_key, payload);

  return coalesce(new, old);
end;
$$ language plpgsql;
