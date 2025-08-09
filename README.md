# Planora - Intelligent Travel Planner

A modern travel planning application that uses AI to create personalized itineraries based on your preferences, budget, and interests.

## Features

- 🤖 AI-powered itinerary generation using OpenRouter API
- 🗺️ Interactive Google Maps integration
- 🔐 Secure authentication with Supabase
- 📱 Responsive design with offline support
- 💾 Real-time data synchronization
- 🎨 Beautiful, modern UI with Tailwind CSS

## Setup Instructions

### 1. Bolt.new Environment Variables (Required)

In Bolt.new, you must set these environment variables for Supabase integration:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**How to get these values:**
1. Go to your Supabase project dashboard
2. Navigate to Settings → API
3. Copy the "Project URL" for `VITE_SUPABASE_URL`
4. Copy the "anon public" key for `VITE_SUPABASE_ANON_KEY`

**Important Notes:**
- These values are safe to expose on the frontend
- The anon key only allows operations permitted by your Row Level Security policies
- In Bolt.new, you cannot fetch these from Edge Functions due to initialization timing

### 2. Backend Secrets (Required)

The following sensitive keys are configured as secrets in Supabase Edge Functions:

#### Edge Function Secrets Configuration

Set the following secrets in your Supabase project dashboard under Edge Functions:

```bash
# In Supabase Dashboard > Edge Functions > Secrets (All Required)
OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=your_supabase_db_url
```

### 3. Supabase Setup

1. Create a new Supabase project
2. Run the database migrations in the `supabase/migrations` folder
3. Configure the Edge Function secrets (see above)
4. Deploy the Edge Functions:
   ```bash
   supabase functions deploy generate-itinerary
   supabase functions deploy google-maps-config
   supabase functions deploy get-supabase-config
   supabase functions deploy send-password-reset
   ```
5. Configure email authentication:
   - Enable email authentication in Supabase Auth settings
   - Configure SMTP settings for password reset emails
   - Set up custom email templates (optional)
   - Configure redirect URLs for password reset

### 4. Google Maps Setup

Configure Google Maps API key as a secret in Supabase Edge Functions with the following APIs enabled:
- Maps JavaScript API
- Places API  
- Geocoding API

### 5. OpenRouter Setup

Configure OpenRouter API key as a secret in Supabase Edge Functions:
- Model: `anthropic/claude-3.5-sonnet` (configured in backend)
- Automatic fallback to mock data for development
- All AI generation happens server-side

### 6. Email Configuration

For password reset functionality to work properly:

1. **SMTP Setup**: Configure SMTP settings in Supabase Dashboard > Authentication > Settings
2. **Email Templates**: Customize password reset email templates
3. **Redirect URLs**: Add your domain to allowed redirect URLs
4. **Rate Limiting**: Configure rate limits for password reset requests

### 7. Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 8. Backend Architecture

The application uses a fully backend-integrated architecture:

- **Edge Functions**: Handle AI generation and API key management
- **Database**: All trip data stored in Supabase PostgreSQL
- **Authentication**: Supabase Auth with automatic user creation
- **Password Reset**: Secure password reset with email verification
- **Real-time**: Live updates for trip modifications
- **Security**: Row Level Security (RLS) enabled on all tables

## Bolt.new Specific Considerations

### Environment Variables
- Bolt.new requires frontend environment variables for Supabase client initialization
- Cannot fetch configuration from Edge Functions due to synchronous initialization requirements
- The anon key is safe to expose as it's protected by Row Level Security policies

### Key Management
- Frontend: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (safe to expose)
- Backend: All sensitive keys stored in Supabase Edge Functions secrets
- This hybrid approach provides security while working within Bolt's constraints

## Authentication Features

- ✅ **Email/Password Authentication**: Secure login and registration
- ✅ **Password Reset**: Email-based password recovery
- ✅ **Guest Mode**: Continue without account for demo purposes
- ✅ **Session Management**: Automatic session handling and refresh
- ✅ **Security**: Rate limiting and email enumeration protection

## Database Schema

The application uses the following main tables:
- `users` - User profiles linked to Supabase auth
- `trips` - Trip information and preferences
- `day_plans` - Daily itinerary plans
- `activities` - Individual activities with location data

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Real-time)
- **Maps**: Google Maps JavaScript API
- **AI**: OpenRouter API (Claude 3.5 Sonnet) via Edge Functions
- **Email**: Supabase Auth with SMTP integration
- **Build Tool**: Vite
- **Deployment**: Ready for Netlify/Vercel

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
