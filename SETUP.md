# SETUP - Bambi E-commerce System

File nay huong dan cach chay local va deploy production cho project nay.

## 1. Yeu cau cai san

- Git
- Node.js
- npm
- PostgreSQL

Nen dung:

- Node.js 18 tro len
- PostgreSQL 14 tro len

Kiem tra nhanh:

```bash
node -v
npm -v
psql --version
```

## 2. Tai project tu GitHub

```bash
git clone https://github.com/Nht-Thahn197/Ecommerce-System.git
cd Ecommerce-System
```

## 3. Cai thu vien

```bash
npm install
```

Neu deploy production, uu tien dung:

```bash
npm ci
```

## 4. Tao file moi truong

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Vi du:

```env
PORT="3000"
DATABASE_URL="postgresql://postgres:password@localhost:5432/bambi"
JWT_SECRET="mot_chuoi_bi_mat_rat_dai"
ACCESS_TOKEN_EXPIRES_IN="1d"
REFRESH_TOKEN_TTL_DAYS="30"
PLATFORM_FEE_PERCENT="30"
SCHEDULER_ENABLED="false"
AUTO_RECEIVE_INTERVAL_MS="3600000"
PAYOUT_INTERVAL_MS="3600000"
GOOGLE_MAPS_API_KEY=""
GOOGLE_MAPS_EMBED_KEY=""
```

Quan trong nhat la:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`

## 5. Tao database PostgreSQL

Vi du dung `psql`:

```sql
CREATE DATABASE bambi;
```

Neu PostgreSQL cua ban dung user/password khac, hay sua lai `DATABASE_URL` trong `.env`.

## 6. Tao Prisma Client va chay migration

Sau khi da co database va `.env`, chay:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

Neu dang phat trien local va can tao migration moi:

```bash
npx prisma migrate dev
```

## 7. Chay local

```bash
npm run dev
```

Mac dinh app chay tai:

```text
http://localhost:3000
```

Mot so duong dan:

- Storefront: `http://localhost:3000/ui/index.html`
- Account: `http://localhost:3000/ui/account.html`
- Orders: `http://localhost:3000/ui/orders.html`
- Admin UI: `http://localhost:3000/ui/admin/`

## 8. Deploy production de nhat

Huong phu hop nhat cho repo nay:

- 1 VPS Linux
- 1 PostgreSQL database
- Nginx reverse proxy
- PM2 de giu process Node chay on dinh

Ly do:

- project nay la Node server chay lau dai
- API va UI static duoc phuc vu cung mot process Express
- app ghi file upload vao `public/uploads/`
- app co scheduler nen khong phu hop deploy kieu static hosting

## 9. Quy trinh deploy production

### 9.1. Cai tren server

Can co:

- Node.js 18+
- npm
- PostgreSQL
- Nginx
- PM2

Cai PM2:

```bash
npm install -g pm2
```

### 9.2. Lay code va cai package

```bash
git clone https://github.com/Nht-Thahn197/Ecommerce-System.git /var/www/bambi
cd /var/www/bambi
npm ci
```

### 9.3. Tao `.env`

```bash
cp .env.example .env
```

Can sua toi thieu:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`

Neu muon bat scheduler tren production:

```env
SCHEDULER_ENABLED="true"
```

Chi nen bat scheduler o 1 process / 1 server de tranh job chay trung.

### 9.4. Chay migration va build

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run build
```

### 9.5. Chay bang PM2

Repo da co file `ecosystem.config.cjs`, co the chay:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Neu cap nhat code:

```bash
git pull
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run build
pm2 reload ecosystem.config.cjs --env production
```

### 9.6. Reverse proxy bang Nginx

Vi du:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Sau do cau hinh SSL bang Certbot neu can.

## 10. Du lieu can backup rieng

GitHub khong mang theo:

- `.env`
- `node_modules`
- `dist`
- log files
- `public/uploads/`
- du lieu trong PostgreSQL

Neu ban muon server moi co dung du lieu cu, can backup va restore:

- database PostgreSQL
- thu muc `public/uploads/`

## 11. Banner va upload

Hien tai co 2 nhom khac nhau:

- `public/assets/banners/`: banner mac dinh cua trang chu, duoc commit len GitHub
- `public/uploads/`: noi chua file upload runtime, khong commit len GitHub

Ly do tach rieng:

- banner mac dinh can co san khi deploy
- file upload runtime khong nen version control

Neu sau nay ban lam trang chuong trinh / tin tuc co banner upload:

- khong nen dung `public/assets/banners/` cho du lieu dong
- nen tao module rieng, vi du `campaigns` hoac `news`
- nen luu trong database cac truong: `title`, `slug`, `banner_image_url`, `target_url`, `published_at`, `status`
- neu nguoi dung bam vao banner thi co the mo trang `/ui/news/<slug>` hoac mot trang chi tiet tuong tu
- file banner upload co the luu o `public/uploads/campaign-banners/` truoc, ve sau co the doi sang object storage

## 12. Quy trinh ngan gon

### Local

```bash
git clone https://github.com/Nht-Thahn197/Ecommerce-System.git
cd Ecommerce-System
npm install
cp .env.example .env
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

### Production

```bash
git clone https://github.com/Nht-Thahn197/Ecommerce-System.git /var/www/bambi
cd /var/www/bambi
npm ci
cp .env.example .env
npm run prisma:generate
npx prisma migrate deploy
npm run build
pm2 start ecosystem.config.cjs --env production
```

## 13. Neu chay loi

### Loi khong ket noi duoc database

Kiem tra lai:

- PostgreSQL da bat chua
- database `bambi` da tao chua
- `DATABASE_URL` co dung user/password/host/port chua

### Loi Prisma

Thu lai:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

### Loi cong da duoc dung

Doi `PORT` trong `.env` hoac sua Nginx / process manager cho phu hop.

### Loi mat anh upload sau khi doi server

Can copy lai thu muc `public/uploads/` tu server cu hoac tu ban backup.
