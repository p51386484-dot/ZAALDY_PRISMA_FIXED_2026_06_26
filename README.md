# Zaaldy Booking v2 - Court Schedule UX Fix

Энэ хувилбар дээр `/schedule` page шинэчлэгдсэн:

- Эхлээд заалнууд card-аар гарна.
- Заал сонгоход зөвхөн тухайн заалны 7 хоногийн сул / хаалттай цаг гарна.
- Олон заалтай үед calendar хэт урт, ойлгомжгүй болох асуудлыг зассан.
- Нүүр хуудасны `Хуваарь харах` товч тухайн заалны хуваарь руу шууд очно.
- Энгийн хэрэглэгчид төлбөр/орлого/admin мэдээлэл харагдахгүй.

## Run

```cmd
cd %USERPROFILE%\Downloads\zaaldy-booking-v2-court-schedule
npm install
copy ..\zaaldy-booking-v2\.env .env
npx prisma generate
npm run dev
```

Хэрвээ database reset хэрэгтэй бол:

```cmd
npx prisma db push --force-reset
npx prisma db seed
npm run dev
```

Admin demo мэдээллийг `prisma/seed.ts` дотроос шалгаж болно.


## Prisma алдаа засах

Хэрвээ `@prisma/client did not initialize yet` гэж гарвал terminal дээр:

```bash
npm install
npx prisma generate
npm run dev
```

Энэ хувилбарт `npm install` хийх үед `postinstall` автоматаар `prisma generate` ажиллуулна.

Хэрвээ database алдаа гарвал:

```bash
copy .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```
