"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Film, Settings, LogOut, User, Trophy, Calendar } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import Link from "next/link"

interface NavbarProps {
  showBackButton?: boolean
  backHref?: string
  backText?: string
}

export function Navbar({
  showBackButton = false,
  backHref = "/dashboard",
  backText = "Back to Dashboard",
}: NavbarProps) {
  const { user, isAuthenticated, signOut } = useAuth()

  return (
    <nav className="border-b border-purple-800/30 bg-black/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <Link href={backHref} className="flex items-center space-x-2 text-white hover:text-purple-300">
              <span>← {backText}</span>
            </Link>
          )}
          <Link href="/" className="flex items-center space-x-2">
            <Film className="h-8 w-8 text-purple-400" />
            <span className="text-2xl font-bold text-white">MV-LIVE</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <>
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-white hover:text-purple-300">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.picture || "/placeholder.svg"} />
                      <AvatarFallback className="bg-purple-600 text-white">
                        {user.name
                          ?.split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-sm font-medium">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.email}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-purple-700/50">
                  <DropdownMenuLabel className="text-white">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-purple-700/50" />

                  <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-purple-600/20">
                    <Link href="/dashboard" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-purple-600/20">
                    <Trophy className="mr-2 h-4 w-4" />
                    <span>Stats</span>
                    <div className="ml-auto text-xs text-gray-400">{user.roomsCreated || 0} rooms</div>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-purple-600/20">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Member since</span>
                    <div className="ml-auto text-xs text-gray-400">{new Date(user.createdAt).getFullYear()}</div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-purple-700/50" />

                  <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-purple-600/20">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={signOut} className="text-red-400 hover:text-red-300 hover:bg-red-600/20">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Not authenticated */}
              <Link href="/auth">
                <Button variant="ghost" className="text-white hover:text-purple-300">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth">
                <Button className="bg-purple-600 hover:bg-purple-700 text-white">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
