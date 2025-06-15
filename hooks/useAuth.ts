"use client";

import { useState, useEffect, useCallback } from "react";

// Define the User type based on the user-session structure
interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  loginMethod?: string;
  loginTime?: string;
  isAuthenticated?: boolean;
  [key: string]: any; // For additional fields from the database
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      console.log("🔍 Loading user from API...");

      // Fetch user session from the API
      const response = await fetch("/api/auth/getsession", {
        credentials: "include", // Include cookies in the request
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user session");
      }

      const { user: userData }: { user: User | null } = await response.json();
      // console.log("API response:", userData);

      if (userData) {
        // console.log("✅ User session found:", {
        //   id: userData.id,
        //   email: userData.email,
        //   name: userData.name,
        // });

        // Fetch full user data from database
        try {
          const userResponse = await fetch(`/api/user/${userData.id}`, {
            credentials: "include",
          });
          if (userResponse.ok) {
            const fullUserData: User = await userResponse.json();
            // console.log("✅ Full user data loaded from database:", fullUserData);
            setUser(fullUserData);
            setIsAuthenticated(true);
            return fullUserData;
          } else {
            console.log("⚠️ Could not load full user data, using session data");
            setUser(userData);
            setIsAuthenticated(true);
            return userData;
          }
        } catch (error) {
          console.log("⚠️ Error loading full user data, using session data:", error);
          setUser(userData);
          setIsAuthenticated(true);
          return userData;
        }
      } else {
        console.log("❌ No user session found");
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }
    } catch (error) {
      console.error("💥 Error loading user:", error);
      setUser(null);
      setIsAuthenticated(false);
      return null;
    }
  }, []);

  const signOut = useCallback(() => {
    console.log("🚪 Signing out user...");

    // Clear the user-session cookie by calling an API (optional, or handle on backend)
    fetch("/api/auth/signout", {
      method: "POST",
      credentials: "include",
    });

    setUser(null);
    setIsAuthenticated(false);

    // Redirect to auth page
    window.location.href = "/auth";
  }, []);

  const createEmailUser = useCallback(
    async (email: string, password: string) => {
      console.log("📧 Creating email user...");

      try {
        // Call the server API to create user
        const response = await fetch("http://localhost:3000/api/auth/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ API error:", errorData);
          throw new Error(errorData.error || "Failed to create user");
        }

        const result = await response.json();
        console.log("✅ Email user created:", result);

        await loadUser();
        return result.user;
      } catch (error) {
        console.error("💥 Error creating email user:", error);
        throw error;
      }
    },
    [loadUser]
  );

  const refreshAuth = useCallback(() => {
    console.log("🔄 Refreshing authentication state...");
    loadUser();
  }, [loadUser]);

  // Load user on mount
  useEffect(() => {
    loadUser().finally(() => setIsLoading(false));

    // Poll for changes to user session every 5 seconds
    const authCheckInterval = setInterval(() => {
      console.log("🔄 Checking user session...");
      loadUser();
    }, 5000);

    return () => {
      clearInterval(authCheckInterval);
    };
  }, [loadUser]);

  return { 
    user,
    isLoading,
    isAuthenticated,
    signOut,
    createEmailUser,
    refreshAuth,
    loadUser,
  };
}