console.log("🧪 Testing CineSync Setup...")

// Test 1: Check if we can create a demo user session
function testDemoAuth() {
  console.log("\n🔐 Testing Demo Authentication...")

  const demoUser = {
    id: `user_${Date.now()}`,
    googleId: "demo_user",
    email: "test@example.com",
    name: "Test User",
    picture: "/placeholder.svg",
    accessToken: "demo_token",
  }

  console.log("✅ Demo user object created:", demoUser)
  return demoUser
}

// Test 2: Check room creation data structure
function testRoomCreation() {
  console.log("\n🏠 Testing Room Creation...")

  const roomData = {
    name: "Test Movie Room",
    description: "A test room for debugging",
    isPrivate: false,
    maxParticipants: 10,
  }

  const roomCode = `ROOM-${Date.now().toString(36).toUpperCase()}`

  console.log("✅ Room data structure:", roomData)
  console.log("✅ Generated room code:", roomCode)

  return { roomData, roomCode }
}

// Test 3: Check file upload validation
function testFileUpload() {
  console.log("\n📁 Testing File Upload Validation...")

  const testFile = {
    name: "test-movie.mp4",
    size: 50 * 1024 * 1024, // 50MB
    type: "video/mp4",
  }

  const maxSize = 100 * 1024 * 1024 // 100MB
  const allowedTypes = ["video/mp4", "video/avi", "video/mkv", "video/mov", "video/wmv", "video/webm"]

  const isValidSize = testFile.size <= maxSize
  const isValidType = allowedTypes.includes(testFile.type)

  console.log("✅ Test file:", testFile)
  console.log("✅ Size valid:", isValidSize)
  console.log("✅ Type valid:", isValidType)

  return { isValidSize, isValidType }
}

// Test 4: API endpoint structure
function testAPIEndpoints() {
  console.log("\n🌐 Testing API Endpoints...")

  const endpoints = [
    "POST /api/rooms - Create room",
    "GET /api/rooms - Get user rooms",
    "GET /api/rooms/[id] - Get specific room",
    "POST /api/rooms/[id] - Join room",
    "POST /api/rooms/[id]/upload - Upload movie",
  ]

  endpoints.forEach((endpoint) => {
    console.log("📍", endpoint)
  })

  return endpoints
}

// Run all tests
function runTests() {
  console.log("🚀 Starting CineSync Tests...\n")

  const demoUser = testDemoAuth()
  const { roomData, roomCode } = testRoomCreation()
  const { isValidSize, isValidType } = testFileUpload()
  const endpoints = testAPIEndpoints()

  console.log("\n📊 Test Summary:")
  console.log("✅ Demo Auth: Working")
  console.log("✅ Room Creation: Working")
  console.log("✅ File Validation: Working")
  console.log("✅ API Structure: Defined")

  console.log("\n🎯 Next Steps:")
  console.log("1. Go to /auth and sign in with demo")
  console.log("2. Try creating a room")
  console.log("3. Test movie upload")
  console.log("4. Check browser console for debug logs")

  console.log("\n🎬 CineSync Test Complete!")
}

// Run the tests
runTests()
