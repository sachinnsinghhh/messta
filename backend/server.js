// Load environment variables from .env into process.env
// This MUST be the very first line that runs, before anything else needs those variables
require("dotenv").config();

// Import our configured Express app (routes, middleware already set up)
const app = require("./src/app");

// Import our database connection function
const connectDB = require("./src/config/db");

// Use the PORT from .env if it exists, otherwise default to 5000
const PORT = process.env.PORT || 5000;

// Connect to the database FIRST, and only start accepting web requests
// once that succeeds — this avoids the server running with no database
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});