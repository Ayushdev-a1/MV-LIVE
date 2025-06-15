console.log("🔍 Debugging CineSync Setup...")

// Check environment variables
console.log("\n📋 Environment Variables:")
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "✅ Set" : "❌ Missing")
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing")
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing")
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL ? "✅ Set" : "❌ Missing")

// Test MongoDB connection
async function testMongoConnection() {
  try {
    const { MongoClient } = require("mongodb")

    if (!process.env.MONGODB_URI) {
      console.log("\n❌ MONGODB_URI not set")
      return
    }

    console.log("\n🔌 Testing MongoDB connection...")
    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()

    const db = client.db("cinesync")

    // Test collections
    const collections = await db.listCollections().toArray()
    console.log("✅ MongoDB connected successfully")
    console.log(
      "📁 Collections:",
      collections.map((c) => c.name),
    )

    // Test basic operations
    const usersCollection = db.collection("users")
    const roomsCollection = db.collection("rooms")

    console.log("✅ Collections accessible")

    await client.close()
    console.log("✅ MongoDB connection test completed")
  } catch (error) {
    console.log("❌ MongoDB connection failed:", error.message)
  }
}

// Test authentication
function testAuth() {
  console.log("\n🔐 Authentication Setup:")

  if (typeof window !== "undefined") {
    const userSession = document.cookie.split("; ").find((row) => row.startsWith("user-session="))

    if (userSession) {
      console.log("✅ User session found")
      try {
        const user = JSON.parse(decodeURIComponent(userSession.split("=")[1]))
        console.log("✅ User data:", { name: user.name, email: user.email })
      } catch (error) {
        console.log("❌ Invalid user session data")
      }
    } else {
      console.log("❌ No user session found")
    }
  } else {
    console.log("ℹ️ Running in server environment")
  }
}

// Run tests
testMongoConnection()
testAuth()

console.log("\n🎬 CineSync Debug Complete!")
console.log("\nNext steps:")
console.log("1. Ensure MongoDB Atlas is set up and MONGODB_URI is correct")
console.log("2. Sign in with Google OAuth")
console.log("3. Try creating a room")
console.log("4. Test movie upload")
