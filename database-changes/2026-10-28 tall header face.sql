-- Oct 28 2026 -- Larry: the CREATIVE JOURNEY CYCLE header should stand double height so its wheel picture shows whole.
-- One small on/off column per header (default off), so only headers set to tall change. Backup of the first header it is used on: ideas_backup_20261028_creative_cycle.
alter table ideas add column if not exists tall_face boolean not null default false;
