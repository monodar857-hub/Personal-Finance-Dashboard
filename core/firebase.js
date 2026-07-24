

import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }              from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCkmYf2_Sx-ORe3iTJd0a8zY6HswjKa-D8",
  authDomain:        "financeku-cec96.firebaseapp.com",
  projectId:         "financeku-cec96",
  storageBucket:     "financeku-cec96.appspot.com",
  messagingSenderId: "32330497759",
  appId:             "1:32330497759:web:f8c6535931533d7115736a",
};
// ────────────────────────────────────────────────────────

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Export instance Auth & Firestore
export const auth = getAuth(app);
export const db   = getFirestore(app);

console.log("✅ Firebase initialized:", app.name);
