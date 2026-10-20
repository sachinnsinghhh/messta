// Import initializeApp from the official Firebase SDK to create our web app instance
import { initializeApp } from "firebase/app";

// Import getAuth to enable Firebase's user management and session tracking service
// Import GoogleAuthProvider so users can log in with a single click using their Google account
// Import signInWithPopup to open the secure Google OAuth login window
// Import signInWithEmailAndPassword to authenticate existing users with their credentials
// Import createUserWithEmailAndPassword to register brand new user accounts
// Import signOut to terminate the current active session
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";

// This configuration object holds the public identifiers that link your site to your Firebase project
// Replace these strings with your exact keys from the Firebase console
const firebaseConfig = {
  // Unique API key for client-side Firebase requests
   apiKey: "AIzaSyC7Y1zx-wVn8CGh_OLpMEPpc5fPR6mJr3I",
  // The domain used by Firebase to handle authentication redirects and popups
   authDomain: "messta-f489e.firebaseapp.com",
  // The unique project identifier in Google Cloud / Firebase
  projectId: "messta-f489e",
  // Cloud storage bucket location for future file uploads (like food photos)
storageBucket: "messta-f489e.firebasestorage.app",
  // Unique sender ID for Firebase Cloud Messaging push notifications
  messagingSenderId: "244712366751",
  // Unique application ID for this web client registered inside your Firebase project
appId: "1:244712366751:web:a66f8647c38ddbea7178aa",
 measurementId: "G-TP2RKME00G"
};

// Initialize the Firebase app using the configuration object above
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication service and export the instance for our app to use
export const auth = getAuth(app);

// Create a new instance of the Google OAuth provider and export it
export const googleProvider = new GoogleAuthProvider();

// Export all the authentication action functions so our Login page can use them directly
export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
};