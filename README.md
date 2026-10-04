# პერსონალი

რესტორნის თანამშრომლების მართვისა და სამუშაო გრაფიკის სისტემა.

ინტერფეისი ქართულადაა. მონაცემები, ავტორიზაცია და წვდომის წესები Supabase-ზეა. ცალკე backend სერვერი არ გამოიყენება.

## ტექნოლოგიები

- Next.js, React, TypeScript
- Tailwind CSS, shadcn/ui
- Supabase Auth, PostgreSQL, RLS, Realtime
- React Hook Form, Zod
- dnd-kit (გრაფიკის ეტაპზე)

## ლოკალური გაშვება

საჭიროა Node.js 20 ან უფრო ახალი.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell-ში:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

გახსენით `NEXT_PUBLIC_SITE_URL`-ში მითითებული მისამართი. ნაგულისხმევად ეს არის [http://localhost:3000](http://localhost:3000).

## გარემოს ცვლადები

| ცვლადი | სად | დანიშნულება |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ბრაუზერი და სერვერი | Supabase პროექტის მისამართი |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ბრაუზერი და სერვერი | საჯარო anon გასაღები |
| `SUPABASE_SERVICE_ROLE_KEY` | მხოლოდ სერვერი | სერვისის გასაღები. აპლიკაციის გვერდები მას არ იყენებს |
| `NEXT_PUBLIC_SITE_URL` | ბრაუზერი და სერვერი | პაროლის აღდგენის ბმულის საბაზისო მისამართი |

`SUPABASE_SERVICE_ROLE_KEY` არასდროს არ უნდა მოხვდეს კლიენტის კოდში ან `NEXT_PUBLIC_` ცვლადში.

## Supabase

1. შექმენით პროექტი [Supabase](https://supabase.com)-ში.
2. Authentication → Providers: ჩართეთ Email.
3. Authentication → URL Configuration:
   - Site URL: თქვენი `NEXT_PUBLIC_SITE_URL`
   - Redirect URLs: `http://localhost:3000/auth/callback` და Vercel-ის იგივე მისამართი
4. დააკოპირეთ Project URL და anon key `.env.local`-ში.

მონაცემთა ბაზის ცხრილები, RLS და საწყისი მონაცემები არის `supabase/migrations` საქაღალდეში.

მიგრაციის გაშვება Supabase CLI-ით:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

პირველი ადმინისტრატორი:

1. Supabase-ში გამორთეთ ღია რეგისტრაცია და შექმენით მომხმარებელი ელფოსტითა და პაროლით.
2. SQL Editor-ში, service role-ით, გაუშვით:

```sql
select public.bootstrap_admin(
  'USER_UUID',
  '11111111-1111-4111-8111-111111111111'
);
```

`USER_UUID` არის Authentication → Users-ში შექმნილი მომხმარებლის id. რესტორნის id საწყის მონაცემებშია და ეკუთვნის „თიფლისს“.

## Vercel

1. დააკავშირეთ GitHub რეპოზიტორია Vercel-თან.
2. Framework Preset: Next.js.
3. დაამატეთ იგივე გარემოს ცვლადები, რაც `.env.example`-შია.
4. `NEXT_PUBLIC_SITE_URL` დააყენეთ პროდაქშენის მისამართზე, მაგალითად `https://your-app.vercel.app`.
5. Supabase Redirect URLs-ში დაამატეთ `https://your-app.vercel.app/auth/callback`.

ლოკალური მისამართი კოდში ჩაწერილი არ არის. პროდაქშენზე გამოიყენება `NEXT_PUBLIC_SITE_URL`, ხოლო თუ ის არ არის, Vercel-ის `VERCEL_URL`.

## სკრიპტები

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## არქიტექტურა

```text
src/
  app/
    (auth)/                 შესვლა, პაროლის აღდგენა
    (app)/                  დაცული გვერდები
    auth/callback/          Supabase-ის დაბრუნების მისამართი
  components/
    ui/                     shadcn/ui
    auth/
    dashboard/              მთავარი გვერდი
    employees/
    schedule/
    attendance/
    requests/
  lib/
    supabase/               ბრაუზერის, სერვერის და proxy კლიენტები
    auth/
    validation/
    scheduling/             კონფლიქტები, ღამის ცვლა, კვირის კოპირება
    notifications/
  hooks/
  types/
  proxy.ts                  სესიის განახლება და დაცული მისამართები
supabase/
  migrations/               ცხრილები, ინდექსები, RLS
```

როლები ინახება `profiles`-ში: `admin` და `employee`. წვდომა შემოწმდება Supabase RLS-ით, არა მხოლოდ ინტერფეისში.

## რა არის მზად

ეტაპი 1:

- Next.js, TypeScript, Tailwind, shadcn/ui
- Supabase კლიენტები
- შესვლა, გასვლა, პაროლის აღდგენა
- დაცული მისამართები
- `.gitignore`, `.env.example`

ეტაპი 2:

- ცხრილები, კავშირები, ინდექსები და შეზღუდვები
- RLS პოლიტიკები ადმინისტრატორისა და თანამშრომლისთვის
- საწყისი რესტორანი, განყოფილებები, პოზიციები და სადემონსტრაციო თანამშრომლები

მიგრაცია ჯერ არ არის გაშვებული ცოცხალ Supabase პროექტზე. ფაილები უნდა გაეშვას ზემოთ აღწერილი ბრძანებით ან SQL Editor-ში, სახელების რიგით.
