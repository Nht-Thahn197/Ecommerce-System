# SETUP - Bambi E-commerce System

File nay huong dan cach tai project tu GitHub ve va chay duoc tren may moi.

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

Lenh nay se cai cac package trong `package.json`.

## 4. Tao file moi truong

Project nay khong day file `.env` len GitHub, nen sau khi clone ve ban phai tu tao lai.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Sau do mo file `.env` va sua lai gia tri cho dung may cua ban.

Vi du:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/bambi"
JWT_SECRET="mot_chuoi_bi_mat"
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

- `DATABASE_URL`
- `JWT_SECRET`

## 5. Tao database PostgreSQL

Ban can tu tao database vi GitHub khong chua du lieu PostgreSQL.

Vi du dung `psql`:

```sql
CREATE DATABASE bambi;
```

Neu PostgreSQL cua ban dung user/password khac, hay sua lai `DATABASE_URL` trong `.env`.

Vi du:

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/bambi"
```

## 6. Tao Prisma Client va chay migration

Sau khi da co database va `.env`, chay:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

Neu ban dang lam viec local de phat trien tiep, co the dung:

```bash
npx prisma migrate dev
```

Goi y:

- `migrate deploy` phu hop khi chi muon ap dung cac migration da co san
- `migrate dev` phu hop khi dang phat trien tren may local

## 7. Chay project

Chay che do development:

```bash
npm run dev
```

Sau khi chay thanh cong, mo:

```text
http://localhost:3000/ui/index.html
```

Mot so trang khac:

- Storefront: `http://localhost:3000/ui/index.html`
- Account: `http://localhost:3000/ui/account.html`
- Orders: `http://localhost:3000/ui/orders.html`
- Admin UI: `http://localhost:3000/ui/admin/`

## 8. Chay production

```bash
npm run build
npm start
```

## 9. Nhung gi GitHub khong mang theo

Khi ban `git push`, GitHub chi luu code va cac file duoc Git theo doi. Repo nay khong mang theo cac phan sau:

- `.env`
- `node_modules`
- `dist`
- log files
- `public/uploads/`
- du lieu trong PostgreSQL

Dieu do co nghia la neu ban muon may moi co dung du lieu cu, ban phai tu chep them:

- database dump / backup cua PostgreSQL
- thu muc `public/uploads/`

Neu khong chep 2 phan nay thi app van co the chay, nhung:

- du lieu san pham, tai khoan, don hang cu se khong co
- anh upload truoc do co the bi mat

## 10. Quy trinh ngan gon

```bash
git clone https://github.com/Nht-Thahn197/Ecommerce-System.git
cd Ecommerce-System
npm install
```

Tao `.env`, tao database `bambi`, roi chay:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run dev
```

## 11. Neu chay loi

### Loi khong ket noi duoc database

Kiem tra lai:

- PostgreSQL da bat chua
- database `bambi` da tao chua
- `DATABASE_URL` co dung user/password/port chua

### Loi thieu package

Chay lai:

```bash
npm install
```

### Loi Prisma

Thu lai:

```bash
npm run prisma:generate
npx prisma migrate deploy
```

### Loi cong 3000 da duoc dung

Tat tien trinh dang dung cong 3000, hoac sua code de dung cong khac.

## 12. Goi y cho may khac

Neu ban muon nguoi khac tai ve la chay nhanh hon, nen chuan bi them:

- file `.env.example` day du va ro rang
- file seed du lieu mau
- ban backup database mau
- thu muc anh mau neu giao dien phu thuoc anh upload
