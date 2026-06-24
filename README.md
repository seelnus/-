# Internal Survey System MVP

This repository contains the scheme-2 MVP for the internal survey system:

- Backend: NestJS, Prisma, MySQL, JWT admin auth.
- Frontend: React, Vite, Ant Design.
- Storage: local upload directory for MVP, MinIO service reserved in Docker Compose.
- WeCom: real OAuth endpoints are reserved; development uses a mock WeCom user.

## Local Development

1. Copy environment variables:

```bash
copy .env.example .env
```

2. Start MySQL with Docker, or provide your own MySQL and set `backend/.env` / shell `DATABASE_URL`.

```bash
docker compose up mysql minio -d
```

3. Prepare backend database:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

4. Start frontend:

```bash
cd frontend
npm install
npm run dev
```

Default admin:

- Phone: `13800000000`
- Password: `admin123456`

## Docker

```bash
copy .env.example .env
docker compose up --build
```

Frontend: http://localhost:8080

Backend: http://localhost:3000/api/health

## MVP Notes

- Filling uses mock WeCom identity: `mock-user-001` / `测试员工`.
- The main flow is implemented first: admin login, survey CRUD, publish, fill, one submission per mock user, responses, comments, CSV export, contacts, and members.
- UI copy is currently ASCII English to avoid Windows console encoding issues during MVP scaffolding. Business data can still be entered in Chinese.
