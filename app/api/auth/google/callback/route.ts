// app/api/auth/google/callback/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { UserService } from '@/lib/services/userService';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/auth/google/callback';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2);
  console.log(`[${requestId}] 🔐 Google OAuth callback triggered`);
  console.log(`[${requestId}] Callback URL:`, request.url);
  console.log(`[${requestId}] MONGODB_URI:`, process.env.MONGODB_URI ? 'Set' : 'Not set');

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !REDIRECT_URI) {
    console.error(`[${requestId}] Missing required environment variables`);
    return NextResponse.redirect(new URL('/auth?error=config_error', request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    console.log(`[${requestId}] ❌ OAuth error:`, error);
    return NextResponse.redirect(new URL(`/auth?error=${error}`, request.url));
  }

  if (!code) {
    console.log(`[${requestId}] ❌ No authorization code received`);
    return NextResponse.redirect(new URL('/auth?error=no_code', request.url));
  }

  try {
    console.log(`[${requestId}] 🔄 Exchanging code for tokens...`);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();
    console.log(`[${requestId}] 🎫 Token response status:`, tokenResponse.status, tokens);

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error(`[${requestId}] ❌ Token exchange failed:`, tokens);
      throw new Error(`Token exchange failed: ${tokens.error || 'No access token'}`);
    }

    console.log(`[${requestId}] ✅ Access token received`);

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`[${requestId}] ❌ User info fetch failed:`, userResponse.status, errorText);
      throw new Error(`User info fetch failed: ${errorText}`);
    }

    const googleUser = await userResponse.json();
    console.log(`[${requestId}] 👤 Google user info:`, {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
    });

    if (!googleUser.id || !googleUser.email) {
      throw new Error('Invalid user data from Google');
    }

    console.log(`[${requestId}] 💾 Storing user in database...`);
    const userService = new UserService();
    const dbUser = await userService.createOrUpdateUser({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
    });

    console.log(`[${requestId}] ✅ User stored in database:`, dbUser._id);

    const userSession = {
      id: dbUser._id,
      googleId: dbUser.googleId,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture,
      accessToken: tokens.access_token,
      loginMethod: 'google',
      loginTime: new Date().toISOString(),
      isAuthenticated: true,
    };

    console.log(`[${requestId}] 💾 Creating user session:`, {
      id: userSession.id,
      email: userSession.email,
      name: userSession.name,
    });

    const cookieStore = cookies();
    const sessionValue = JSON.stringify(userSession);
    console.log(`[${requestId}] 🍪 Setting user-session cookie:`, sessionValue);

    cookieStore.set('user-session', sessionValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log(`[${requestId}] ✅ Session cookies set successfully`);
    console.log(`[${requestId}] 🔄 Redirecting to dashboard...`);

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error(`[${requestId}] 💥 Google OAuth error:`, error);
    return NextResponse.redirect(new URL('/auth?error=oauth_failed', request.url));
  }
}