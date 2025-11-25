# Study Tracker App

A comprehensive web-based study management application with AI-powered features for assignment tracking, image capture, study material generation, and intelligent scheduling.

## Features

- 📚 **Assignment Management**: Track all your assignments and projects in one place
- 📸 **Image Capture**: Take photos of syllabi, handouts, and whiteboard notes
- 🤖 **AI Study Materials**: Generate notes, study guides, practice tests, and flashcards
- 🎙️ **Voice Input**: Add assignments using speech-to-text transcription
- 📅 **Smart Scheduling**: Get AI-powered study plans based on due dates and your availability
- 🔄 **Cross-Device Sync**: Access your data from any device

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Groq Cloud API
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Groq Cloud API key

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd study-tracker-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. Set up Supabase database:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `supabase/schema.sql`
   - Run the SQL to create all tables and policies

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login, signup)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── layout.tsx
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── supabase/         # Supabase client
│   ├── groq/             # Groq AI integration
│   └── utils.ts          # General utilities
├── hooks/                 # Custom React hooks
├── store/                 # Zustand stores
└── types/                 # TypeScript types
```

## Database Schema

The app uses the following main tables:
- `profiles` - User profiles extending Supabase Auth
- `courses` - User's courses/subjects
- `assignments` - Assignments and projects
- `assignment_images` - Images attached to assignments
- `study_materials` - AI-generated study content
- `user_schedule` - User's weekly availability
- `planned_tasks` - Scheduled study sessions
- `transcriptions` - Voice transcription records

See `supabase/schema.sql` for the complete schema.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## API Routes

- `POST /api/parse-assignment` - Parse raw text into assignment data using AI
- `POST /api/generate-study-material` - Generate study materials (notes, guides, tests, flashcards)

## License

MIT
