// Import mongoose — the library that lets Node talk to MongoDB using JavaScript objects
// instead of writing raw database query language
const mongoose = require("mongoose");

// This function connects our backend to the MongoDB database.
// It's "async" because connecting to a database over the internet takes time —
// we don't want the rest of the app to run before the connection is ready.
const connectDB = async () => {
  try {
    // process.env.MONGO_URI reads the secret database connection string
    // from the .env file (never hardcoded directly in the code)
    await mongoose.connect(process.env.MONGO_URI);

    // If we reach this line, the connection succeeded
    console.log("MongoDB connected");
  } catch (err) {
    // If anything goes wrong (wrong password, no internet, wrong URI), this runs instead
    console.error("MongoDB connection failed:", err.message);

    // Exit the whole Node process — there's no point running a server
    // that can't reach its database
    process.exit(1);
  }
};

// Make this function available to other files (like server.js) that need to call it
module.exports = connectDB;
