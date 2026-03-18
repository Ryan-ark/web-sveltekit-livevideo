$ErrorActionPreference = 'Stop'

Write-Host 'Starting PostgreSQL container...'
docker compose up -d postgres

Write-Host 'Running migrations...'
npm run db:migrate

Write-Host 'Seeding demo data...'
npm run db:seed

Write-Host 'Local database is ready.'
