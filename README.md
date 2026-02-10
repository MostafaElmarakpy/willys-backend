# Willy's Backend

[![GitHub Repo](https://img.shields.io/badge/GitHub-willys--backend-blue?logo=github)](https://github.com/MostafaElmarakpy/willys-backend)

## 📝 Project Overview

**Willy's Backend** is a NestJS backend service built with TypeScript, designed to support a Geo-enabled e-commerce / store platform.  
It uses **PostgreSQL** with **PostGIS** extension to handle geospatial data, and is containerized with Docker for easy development, staging, and production deployments. The repository includes scripts for migrations, seeding, and preset docker-compose configurations for different environments. :contentReference[oaicite:1]{index=1}

---

## ✨ Key Features

- NestJS (TypeScript) backend
- PostgreSQL database with PostGIS support (geospatial queries)
- Dockerized environments (development / staging / production)
- Database migrations & seed scripts
- Ready-to-run `docker-compose` files for different environments
- Environment variables via `.env`
- Structured architecture suitable for further modular development

---

## 🗂️ Repo Structure (high-level)

```
willys-backend/
├── .husky/                        # Git hooks
├── src/                           # Source code (NestJS app)
├── test/                          # Tests
├── docker-compose.yml             # Production compose (Traefik)
├── docker-compose.dev.yml         # Development compose (hot reload)
├── docker-compose.staging.yml     # Staging compose
├── docker-compose.test.yml        # Test compose
├── Dockerfile                      # Production Dockerfile
├── Dockerfile.dev                  # Dev Dockerfile (hot reload)
├── Dockerfile.staging              # Staging Dockerfile
├── package.json
├── tsconfig.json
├── yarn.lock
└── README.md
```

---

## 📦 Prerequisites

- Docker & Docker Compose
- Node.js (for local non-container runs) — recommended LTS
- Yarn or npm
- PostgreSQL (if running without Docker)
- PostGIS extension enabled in database (if using geospatial features)

---

## 🚀 Quickstart (Docker — recommended)

### Development

```bash
# from repo root
docker compose -f docker-compose.dev.yml up
# then, inside container or host:
npm run migrate
npm run seed
```

### Staging

```bash
docker compose -f docker-compose.staging.yml up
# run migrations/seed in staging container:
docker compose -f docker-compose.staging.yml exec willys-backend yarn migrate:prod
docker compose -f docker-compose.staging.yml exec willys-backend yarn seed:prod
```

### Production

```bash
docker compose -f docker-compose.yml up
# run migrations:
docker compose -f docker-compose.yml exec willys-backend yarn migrate:prod
docker compose -f docker-compose.yml exec willys-backend yarn seed:prod
```

> ملاحظة: الـ README في الريبو يذكر أن بعض seeders في staging/production قد تواجه مشاكل في علاقات الـ entities — راجع الـ TODO أو ملفات الـ seed لو واجهت مشاكل. :contentReference[oaicite:2]{index=2}

---

## 🔧 Environment variables

ضع نسخة من ملف `.env` في المسار الجذري واملأ القيم المناسبة:

```env
# Example .env (fill with your real values)
DATABASE_URL=postgresql://user:password@db:5432/willysdb
POSTGRES_DB=willysdb
POSTGRES_USER=user
POSTGRES_PASSWORD=secret
NODE_ENV=development
PORT=3000

# Any other env variables required by the app (JWT keys, API keys, etc.)
```

---

## 🗂 Migrations & Seeders

المشروع يحتوي على سكربتات لتشغيل الـ migrations والـ seeders (راجع package.json للـ scripts الدقيقة). أمثلة:

```bash
npm run migrate          # run development migrations
npm run seed             # run development seeders
# or inside container in prod:
yarn migrate:prod
yarn seed:prod
```

---

## 🧭 Architecture & Notes

- تم بناء الـ backend باستخدام **NestJS** — modular, testable, scalable.
- يُعتمد على **PostgreSQL + PostGIS** للوظائف الجغرافية (مثل البحث بالقرب من موقع).
- القيم الافتراضية للتشغيل مُهيأة عبر ملفات docker-compose لكل بيئة (dev/staging/prod). :contentReference[oaicite:3]{index=3}

---

## 🧪 Testing

المجلد `test/` موجود، استخدم الأوامر في `package.json` لتشغيل الاختبارات (عادةً `yarn test` أو `npm test`).

---

## ✅ Deployment tips

- تأكد من توافر امتداد PostGIS في قاعدة البيانات الإنتاجية.
- استخدم secret management (GitHub Secrets / Vault) لحماية كلمات المرور و المفاتيح.
- راجع تهيئة Traefik في `docker-compose.yml` إذا كنت تستخدمه في الإنتاج.

---

## 📝 TODO / Known issues

- بعض عمليات seeding في staging/production قد تحتاج فحص لعلاقات الـ entities (راجع TODO.md أو ملاحظات الـ seeders). :contentReference[oaicite:4]{index=4}

---

## 📚 Resources

- Repo source: [MostafaElmarakpy/willys-backend (commit 76852b1)](https://github.com/MostafaElmarakpy/willys-backend/tree/76852b1e90743f6001f445b7ba20417ea8fd9040). :contentReference[oaicite:5]{index=5}
