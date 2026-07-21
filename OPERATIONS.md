# Operations

`start.sh` only starts this project's two child processes. It never installs packages, kills ports, creates a database, migrates, or seeds.

1. Copy `.env.example` to `.env` and replace every secret.
2. Run `scripts/bootstrap.sh` explicitly to install locked dependencies.
3. Run `scripts/migrate.sh` explicitly for schema changes.
4. Run `start.sh`.

Demo seeding is isolated behind `CONFIRM_DEMO_SEED=yes scripts/seed-demo.sh`. The governed workpaper API is `/api/governed-workpapers`; generated `gap-*` routes are intentionally not mounted. Document repository, ERP, e-signature, and audit-platform adapters require real provider contracts and credentials.

