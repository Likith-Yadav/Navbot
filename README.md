# Navigation Web App

A voice-interactive navigation system built with Next.js, featuring real-time GPS tracking, AI-powered voice assistance, and a comprehensive admin dashboard for managing maps, locations, and routes.

## Features

- 🎙️ **Voice Assistant**: Gemini-powered AI that guides users through natural conversation
- 🗺️ **Interactive Maps**: Real-time navigation with Leaflet integration
- 📍 **Location Pins**: Create and manage points of interest
- 🛣️ **Custom Routes**: Define walking paths with waypoints
- 🔐 **Admin Dashboard**: Full CRUD interface for managing navigation data
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Maps**: Leaflet & React-Leaflet
- **AI**: Google Gemini API
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript

## Prerequisites

Before setting up the project, ensure you have:

- **Node.js** 18.x or higher
- **PostgreSQL** database (local or cloud)
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd navapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/navapp"

# NextAuth
NEXTAUTH_SECRET="your-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Google Gemini API
GEMINI_API_KEY="your-gemini-api-key-here"
```

**Important Notes:**
- Replace `username`, `password`, and database details in `DATABASE_URL`
- Generate `NEXTAUTH_SECRET` using: `openssl rand -base64 32`
- Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 4. Set Up the Database

Run Prisma migrations to create database tables:

```bash
npm run db:push
```

### 5. Create Admin User

Run the seed script to create an admin account:

```bash
npm run db:seed
```

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

> ⚠️ **Security**: Change these credentials immediately after first login!

### 6. Start the Development Server

```bash
npm run dev
```

The app will be available at: **http://localhost:3000**

## Project Structure

```
navapp/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding script
├── src/
│   ├── app/
│   │   ├── actions/       # Server actions
│   │   ├── admin/         # Admin dashboard
│   │   ├── navigate/      # Navigation page
│   │   └── page.tsx       # Home page
│   ├── components/        # React components
│   ├── lib/               # Utilities
│   └── auth.ts            # NextAuth configuration
└── .env                   # Environment variables
```

## Usage Guide

### For End Users

1. **Home Page** (`/`): Click the microphone button to start voice navigation
2. **Voice Interaction**: 
   - Tell the assistant your name
   - Specify your destination
   - Follow the visual route on the map

### For Administrators

1. **Login** (`/admin/login`): Use admin credentials
2. **Dashboard** (`/admin`): Manage navigation data
   - **Maps Tab**: Create/delete map configurations
   - **Locations & Pins Tab**: Add points of interest by clicking on the map
   - **Routes & Paths Tab**: Create routes by selecting start/end points and adding waypoints

## Database Schema

### Models

- **AdminUser**: Admin authentication
- **Map**: Map configurations (tile URLs, overlays)
- **LocationPin**: Points of interest with coordinates
- **Route**: Navigation paths with waypoints

## API Endpoints

### Server Actions

- `createMap`, `deleteMap` - Map management
- `createPin`, `deletePin` - Location management
- `createRoute`, `deleteRoute` - Route management
- `processVoiceCommand` - Gemini AI integration

## Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables for Production

Update your `.env` file with production values:
- Set `NEXTAUTH_URL` to your production domain
- Use a strong, unique `NEXTAUTH_SECRET`
- Configure production database URL

## Troubleshooting

### Common Issues

**Database Connection Error**
- Verify PostgreSQL is running
- Check `DATABASE_URL` format and credentials

**Voice Assistant Not Working**
- Ensure `GEMINI_API_KEY` is set correctly
- Check browser console for API errors
- Verify microphone permissions

**Map Not Loading**
- Check internet connection (map tiles require external URLs)
- Verify Leaflet CSS is imported

**Admin Login Fails**
- Run `npm run db:seed` to recreate admin user
- Check database connection

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:seed` - Seed database with admin user

## Security Notes

- Change default admin credentials immediately
- Keep `.env` file secure and never commit it
- Use strong passwords for production
- Rotate API keys regularly

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
