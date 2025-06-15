const { MongoClient, GridFSBucket } = require("mongodb")

async function cleanupExpiredUploads() {
  const client = new MongoClient(process.env.MONGODB_URI)

  try {
    await client.connect()
    const db = client.db("cinesync")

    // Find expired upload sessions
    const expiredSessions = await db
      .collection("upload_sessions")
      .find({ expiresAt: { $lt: new Date() } })
      .toArray()

    console.log(`Found ${expiredSessions.length} expired upload sessions`)

    // Delete chunks for expired sessions
    const bucket = new GridFSBucket(db, { bucketName: "movies" })

    for (const session of expiredSessions) {
      for (let i = 0; i < session.totalChunks; i++) {
        const chunkFilename = `${session.sessionId}_chunk_${i}`
        try {
          const files = await bucket.find({ filename: chunkFilename }).toArray()
          for (const file of files) {
            await bucket.delete(file._id)
          }
        } catch (error) {
          console.error(`Error deleting chunk ${i}:`, error)
        }
      }
    }

    // Delete expired session records
    const result = await db.collection("upload_sessions").deleteMany({ expiresAt: { $lt: new Date() } })

    console.log(`Cleaned up ${result.deletedCount} expired sessions`)
  } finally {
    await client.close()
  }
}

// Run cleanup
cleanupExpiredUploads()
  .then(() => console.log("Cleanup completed"))
  .catch(console.error)
