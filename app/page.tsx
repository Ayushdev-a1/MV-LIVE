import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Users, Video, Zap, Star, Film } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            Watch Movies
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {" "}
              Together
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Create virtual movie nights with friends. Stream, chat, and share the cinematic experience in real-time, no
            matter where you are.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dashboard">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg">
                <Play className="mr-2 h-5 w-5" />
                Start Watching
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-purple-400 text-purple-300 hover:bg-purple-400/10 px-8 py-4 text-lg"
            >
              <Video className="mr-2 h-5 w-5" />
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">The Ultimate Movie Night Experience</h2>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Everything you need to host perfect virtual movie nights with your friends
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Synchronized Viewing</h3>
              <p className="text-gray-300">
                Watch movies in perfect sync with your friends. Play, pause, and seek together automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Video className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Video Chat</h3>
              <p className="text-gray-300">
                See your friends' reactions in real-time with built-in video chat during the movie.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-800/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Instant Rooms</h3>
              <p className="text-gray-300">
                Create or join movie rooms instantly. Share a simple code and start watching together.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-purple-800/30 to-pink-800/30 rounded-3xl p-12 text-center backdrop-blur-sm border border-purple-700/30">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
            ))}
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Ready for Your Next Movie Night?</h2>
          <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of friends already enjoying movies together on MV-LIVE
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg">
              <Play className="mr-2 h-5 w-5" />
              Start Your Movie Night
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-800/30 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Film className="h-6 w-6 text-purple-400" />
              <span className="text-lg font-semibold text-white">MV-LIVE</span>
            </div>
            <p className="text-gray-400">© 2024 MV-LIVE. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
