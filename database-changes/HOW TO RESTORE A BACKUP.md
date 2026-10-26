# How to restore a database backup

Backups are made every night by `.github/workflows/nightly-database-backup.yml`
and saved in the Google Drive folder "Field Guide Database Backups" (last ~14 days).

Each file is named `field-guide-backup_YYYY-MM-DD_HHMM.dump` and covers the
public, auth and storage parts of the Supabase database.

To restore into a fresh Supabase (or any Postgres 17) database:

    pg_restore --no-owner --no-privileges --dbname "<new database URL>" field-guide-backup_....dump

The schema changes are also kept as plain text in this folder (database-changes),
so the structure can be rebuilt from the repo alone.
