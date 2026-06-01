/* ============================================================
   RETELL MEDIA — firebase-config.js
   ============================================================ */

/* ── Firebase ──────────────────────────────────────────────── */
var firebaseConfig = {
  apiKey:            "AIzaSyBP56_ntBf3vl9ycWwFON1sBeQoZLMO4vI",
  authDomain:        "retell-media.firebaseapp.com",
  projectId:         "retell-media",
  messagingSenderId: "737289608100",
  appId:             "1:737289608100:web:6746601bcabb8b7f81bf31"
};

firebase.initializeApp(firebaseConfig);

var db   = firebase.firestore();
var auth = firebase.auth();

/* ── Cloudinary (ücretsiz görsel yükleme) ──────────────────── */
/* cloudinary.com → ücretsiz kayıt → Settings → Upload →
   Upload Presets → Add (Unsigned) → cloud name ve preset adını girin */
var cloudinaryConfig = {
  cloudName:    "BURAYA_CLOUD_NAME",
  uploadPreset: "BURAYA_UPLOAD_PRESET"
};
