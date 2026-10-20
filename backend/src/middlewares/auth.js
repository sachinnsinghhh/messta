// Import the Firebase Admin SDK to verify tokens on the server
const admin = require("firebase-admin");

// Middleware function that inspects incoming HTTP requests for valid Firebase authorization tokens
const verifyFirebaseToken = async (req, res, next) => {
  try {
    // Read the Authorization header sent by the client (format: "Bearer <token>")
    const authHeader = req.headers.authorization;

    // Check if the Authorization header is missing or does not start with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Reject request with 401 Unauthorized
      return res.status(401).json({
        success: false,
        message: "Access denied. No authorization token provided.",
      });
    }

    // Extract the raw token string by splitting off the word "Bearer"
    const idToken = authHeader.split("Bearer ")[1];

    // Verify the authenticity and expiration of the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Attach the verified user details (uid, email) to the request object
    // This allows subsequent route handlers to know exactly who made the request
    req.user = decodedToken;

    // Pass control to the next middleware or controller function in the route
    next();
  } catch (error) {
    // If the token is fake, manipulated, or expired, reject with 401 Unauthorized
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authorization token.",
      error: error.message,
    });
  }
};

// Export the middleware so protected routes can use it
module.exports = verifyFirebaseToken;