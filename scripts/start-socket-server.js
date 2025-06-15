console.log("Starting Socket.IO server...")

const { spawn } = require("child_process")
const path = require("path")

// Start the Socket.IO server
const socketServer = spawn("node", [path.join(__dirname, "../server/socket-server.js")], {
  stdio: "inherit",
  env: { ...process.env },
})

socketServer.on("error", (error) => {
  console.error("Failed to start Socket.IO server:", error)
})

socketServer.on("close", (code) => {
  console.log(`Socket.IO server exited with code ${code}`)
})

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down Socket.IO server...")
  socketServer.kill("SIGINT")
})

process.on("SIGTERM", () => {
  console.log("Shutting down Socket.IO server...")
  socketServer.kill("SIGTERM")
})

console.log("Socket.IO server started on port 3001")
console.log("Use Ctrl+C to stop the server")
