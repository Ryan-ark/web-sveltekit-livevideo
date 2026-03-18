$ErrorActionPreference = 'Stop'

Write-Host 'Stopping and removing PostgreSQL container and volume...'
docker compose down -v

Write-Host 'Restarting PostgreSQL container...'
docker compose up -d postgres

Write-Host 'Running migrations...'
npm run db:migrate

Write-Host 'Seeding demo data...'
npm run db:seed

Write-Host 'Local database has been reset.'
