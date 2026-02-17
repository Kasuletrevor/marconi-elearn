This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Rendering Strategy (Issue #13)

- The landing route (`src/app/page.tsx`) now renders as a Server Component.
- Student course routes now use Server Component wrappers for initial data fetch:
  - `src/app/dashboard/courses/[id]/page.tsx`
  - `src/app/dashboard/courses/[id]/assignments/[assignmentId]/page.tsx`
- Interactive behavior remains in client islands:
  - `src/components/dashboard/student/StudentCourseDetailClient.tsx`
  - `src/components/dashboard/student/StudentAssignmentDetailClient.tsx`
- Shared server-side API helper:
  - `src/lib/api/server.ts`

### Bundle/Render impact

- Landing page no longer depends on `framer-motion` at route level, reducing client-side JavaScript for `/`.
- Student course pages avoid client-only request waterfalls for first paint by resolving initial course/assignment data on the server.
- Client JavaScript is now focused on interactive controls (submission upload, resource expand/download, GitHub claim actions).
