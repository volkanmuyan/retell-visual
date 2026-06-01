/* ============================================================
   RETELL MEDIA — firebase-config.js
   Firebase projenizi oluşturduktan sonra aşağıdaki değerleri
   Firebase Console → Proje Ayarları → Uygulamalarınız bölümünden
   kopyalayıp yapıştırın.
   ============================================================ */

var firebaseConfig = {
  apiKey:            "BURAYA_API_KEY",
  authDomain:        "BURAYA_PROJECT_ID.firebaseapp.com",
  projectId:         "BURAYA_PROJECT_ID",
  storageBucket:     "BURAYA_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "BURAYA_SENDER_ID",
  appId:             "BURAYA_APP_ID"
};

firebase.initializeApp(firebaseConfig);

var db      = firebase.firestore();
var auth    = firebase.auth();
var storage = firebase.storage();
