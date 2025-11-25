# Study Tracker App - Development Instructions

## Project Overview
A comprehensive web-based study management application with AI-powered features for assignment tracking, image capture, study material generation, and intelligent scheduling.

## Tech Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Groq Cloud API
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Icons**: Lucide React

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── layout.tsx
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── assignments/      # Assignment-related components
│   ├── study-materials/  # Study material components
│   └── schedule/         # Schedule components
├── lib/                  # Utility libraries
│   ├── supabase/        # Supabase client & helpers
│   ├── groq/            # Groq AI integration
│   └── utils/           # General utilities
├── hooks/               # Custom React hooks
├── store/               # Zustand stores
└── types/               # TypeScript types
```

## Key Features
1. User authentication via Supabase Auth
2. Assignment CRUD with image capture
3. AI-powered study material generation (Groq)
4. Voice transcription for assignment input
5. Smart scheduling based on due dates
6. Cross-device sync via Supabase

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
