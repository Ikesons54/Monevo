# Monevo

Monevo is a private, device-local personal finance app for understanding what
you earn, spend, owe, and save. It provides a focused overview plus dedicated
views for accounts and recent activity.

## Features

- Local-first storage in the browser with IndexedDB through Dexie
- Onboarding with country and primary-currency selection
- Overview with monthly income, spending, net, and account metrics
- Separate account and transaction activity views
- Cash, bank, credit-card, wallet, and other account types
- Income and expense tracking with categories and descriptions
- Responsive hamburger navigation for smaller screens
- No backend or account required for the current app

## Tech stack

- React 19
- TypeScript
- Vite
- Dexie and `dexie-react-hooks`
- Plain CSS

## Getting started

### Requirements

- Node.js
- npm

### Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually
[`http://localhost:5173`](http://localhost:5173).

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Data and privacy

Monevo currently stores profiles, accounts, and transactions in the browser's
local IndexedDB database named `monevo-db`. Data is tied to the current browser
and device; clearing browser site data removes it. There is no synchronization
service or remote database in this version.

## Project structure

```text
src/
├── App.tsx       # Application views, navigation, onboarding, and forms
├── db.ts         # Dexie database schema and finance helpers
├── main.tsx      # React entry point
└── styles.css    # Application styling and responsive layout
```

## Status

Monevo is an actively developed prototype. The current experience focuses on
local tracking and a clear foundation for future budgeting and financial
planning features.
