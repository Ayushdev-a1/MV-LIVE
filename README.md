# 🎬 MV-LIVE - Watch Movies Together

A real-time movie watching platform where friends can watch movies together, synchronized across multiple devices with video chat and live chat features.

## ✨ Features

- 🔐 **Authentication**: Google OAuth and demo login
- 🏠 **Room Management**: Create and join movie rooms
- 🎥 **Synchronized Playback**: Watch movies in perfect sync
- 💬 **Live Chat**: Real-time messaging during movies
- 📹 **Video Chat**: WebRTC-powered video calling
- 📱 **Responsive Design**: Works on desktop and mobile
- ☁️ **Cloud Storage**: MongoDB Atlas for data persistence

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB Atlas account
- Google OAuth credentials (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MV-LIVE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your credentials:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/MV-LIVE
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   ```

4. **Start the development servers**
   ```bash
   npm run dev:all
   ```

5. **Open your browser**
   - Next.js app: http://localhost:3000
   - Socket.IO server: http://localhost:3001

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run socket` - Start Socket.IO server
- `npm run dev:all` - Start both servers concurrently
- `npm run build` - Build for production
- `npm run start:all` - Start production servers
- `npm run setup` - Run setup script

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── room/              # Movie room pages
│   └── create-room/       # Room creation
├── components/            # React components
│   ├── ui/               # UI components
│   └── ...               # Feature components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and services
│   ├── services/         # Business logic
│   └── models/          # Data models
├── server/               # Socket.IO server
└── scripts/              # Setup and utility scripts
```

## 🔧 Configuration

### MongoDB Atlas Setup

1. Create account at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster
3. Create database user with read/write permissions
4. Add IP address to whitelist
5. Get connection string and update `MONGODB_URI`

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
6. Update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## 🎮 Usage

### Creating a Room

1. Sign in with Google or use demo login
2. Click "Create Room" on dashboard
3. Configure room settings
4. Upload a movie file (MP4, AVI, MKV, etc.)
5. Share room code with friends

### Joining a Room

1. Get room code from host
2. Enter code on dashboard
3. Join the synchronized movie experience

### Features in Room

- **Video Controls**: Play, pause, seek (synchronized)
- **Chat**: Send messages to all participants
- **Video Call**: Enable camera and microphone
- **Participants**: See who's watching

## 🔒 Security

- Secure authentication with Google OAuth
- Session-based user management
- File upload validation and limits
- CORS protection for Socket.IO
- Environment variable protection

## 🚀 Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production servers:
   ```bash
   npm run start:all
   ```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- Check the [Issues](https://github.com/your-repo/issues) page
- Review the setup scripts in `/scripts/`
- Ensure all environment variables are set correctly

## 🎉 Acknowledgments

- Built with Next.js 15 and React 18
- UI components from Radix UI and shadcn/ui
- Real-time features powered by Socket.IO
- Video calling with WebRTC
- Styled with Tailwind CSS