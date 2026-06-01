/* ============================================================
   RETELL MEDIA — firebase-config.js

   1) Firebase Console → Proje Ayarları → Uygulamalarınız
      bölümünden kopyalayıp yapıştırın.
   2) Cloudinary: cloudinary.com → ücretsiz kayıt → Settings →
      Upload → Upload Presets → Add (Unsigned) → Cloud Name ve
      Preset Name değerlerini aşağıya girin.
   ============================================================ */

/* ── Firebase ──────────────────────────────────────────────── */
var firebaseConfig = {
  apiKey:            "BURAYA_API_KEY",
  authDomain:        "BURAYA_PROJECT_ID.firebaseapp.com",
  projectId:         "BURAYA_PROJECT_ID",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId:             "BURAYA_APP_ID"
};

firebase.initializeApp(firebaseConfig);

var db   = firebase.firestore();
var auth = firebase.auth();

/* ── Cloudinary (ücretsiz görsel yükleme) ──────────────────── */
var cloudinaryConfig = {
  cloudName:    "BURAYA_CLOUD_NAME",    /* Örn: "retell-media" */
  uploadPreset: "BURAYA_UPLOAD_PRESET"  /* Unsigned preset adı */
};
