# Mona’s Heart

**“You don’t have to face it alone.”**

Mona’s Heart is a standalone, responsive peer-support prototype that connects patients, survivor mentors, and caregivers around similar diagnoses, symptoms, treatments, medications, procedures, languages, and communication preferences.

> **Prototype safety notice:** This app uses fictional demo information only. It is not medical advice, is not an emergency service, and is not approved for storing real medical records or protected health information (PHI).

## Highlights

- Warm, accessible landing experience and role-based onboarding
- Local demo authentication and protected-style application workspace
- Searchable patient-to-mentor matching with compatibility scores and detailed profiles
- Demo messaging, notifications, video scheduling, and simulated call room
- Mock document center, lab comparison, doctor-note comparison, medication record, and care timeline
- Ten condition and caregiver community groups with fictional discussions
- Privacy controls, reporting/blocking affordances, safety guidance, and emergency resources
- Admin demo with user moderation, reports, content queues, and analytics
- Responsive navigation and layouts for desktop, tablet, and mobile

## Technology

- React 18
- TypeScript
- Vite
- React Router
- Lucide icons
- Custom responsive CSS design system

All application state and content are local demo data. No server or database is configured.

## Install and run

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the local address printed by Vite (normally `http://localhost:5173`). Choose **Enter with demo account** on the login page to explore the workspace.

## Production build

```bash
npm run build
npm run preview
```

The production files are written to `dist/`.

## Project structure

```text
src/
  data.ts       Fictional mentors, conversations, groups, and documents
  main.tsx      Routes, screens, shared components, and local interactions
  styles.css    Brand tokens, layout, accessibility, and responsive styles
```

## Main routes

Public routes include `/`, `/about`, `/signup`, `/login`, `/privacy`, `/terms`, `/safety`, and `/emergency`. The demo workspace includes `/dashboard`, `/matches`, `/messages`, `/calls`, `/documents`, `/labs`, `/notes`, `/medications`, `/timeline`, `/groups`, `/notifications`, `/settings`, and `/admin`.

## Privacy and limitations

- Do **not** enter real names, medical records, identifying information, credentials, or PHI.
- Authentication, uploads, messaging, notifications, and video are simulated prototype experiences.
- Prototype messaging does not claim HIPAA compliance.
- Lab and note tools organize demo information; they do not interpret it.
- Mona’s Heart cannot respond to emergencies. Call 911 or your local emergency number immediately when emergency care may be needed.

## Environment variables

No environment variables are required. `.env.example` documents that default. A future production implementation must complete security, privacy, legal, accessibility, clinical-safety, infrastructure, and compliance reviews before handling any real user data.
