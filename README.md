# AI Freelance Marketplace

A freelance marketplace built with Next.js, React, and Firebase. Clients can post projects and review proposals; freelancers can create a profile, browse projects, and submit proposals.

## Requirements

- Node.js and npm
- A Firebase project with Authentication and Cloud Firestore enabled

## Local development

Install dependencies and create a local environment file from the example:

```bash
npm install
Copy-Item .env.example .env.local
```

In `.env.local`, replace the example values with the Firebase **web app** configuration for your development project:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These `NEXT_PUBLIC_` values are included in the browser bundle. They are Firebase client configuration, not server secrets. Never put service-account credentials or other private keys in these variables or commit `.env.local`.

Enable the Email/Password sign-in provider and configure the email verification and password reset templates in Firebase Authentication. The app requires verified email addresses for Firestore access; new registrations receive a verification email, and unverified users are asked to verify before signing in. For local sign-in, ensure `localhost` is in the Firebase Authentication authorized domains. Deploy the rules in [`firestore.rules`](./firestore.rules) to the same Firebase project before testing database operations.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run build
npm run start
```

`npm run start` serves the production build locally and should be run after `npm run build`.

## Deploying to Vercel

1. Import the GitHub repository into Vercel and use the default Next.js framework/build settings.
2. Add all six Firebase variables above to the Vercel **Production** environment. Add them to **Preview** as well if preview deployments should use Firebase. These public variables are applied at build time; rebuild after changing them.
3. Confirm the variables reference the intended production Firebase web app.
4. In Firebase Authentication settings, add the production Vercel domain and any custom production domain to **Authorized domains**. Add preview domains only if sign-in is needed on those previews.
5. Confirm the required Authentication provider is enabled and deploy [`firestore.rules`](./firestore.rules) to the production Firestore database.
6. Run the validation commands above and smoke-test registration, sign-in, project browsing/posting, profiles, and proposals on a Vercel preview before promoting to production.

No custom `vercel.json` is required for the standard Next.js deployment. Do not deploy until the production Firebase project, Vercel environment variables, authorized domains, and Firestore rules have all been verified.
