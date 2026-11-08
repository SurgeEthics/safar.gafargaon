# সফর গফরগাঁও - ফায়ারবেস কনফিগারেশন গাইড (Firebase Setup Guide)

'সফর' অ্যাপে ফায়ারবেস ফায়ারস্টোর (Firestore Database) সম্পূর্ণ ইন্টিগ্রেটেড রয়েছে।

## 📁 ফোল্ডারের ফাইলসমূহ:
- `firestore.rules`: ডেটাবেস সিকিউরিটি রুলস (নিরাপদ রিড/রাইট অ্যাক্সেস)।
- `firebase.json`: ফায়ারবেস হোস্টিং ও রুলস ডিপ্লয়মেন্ট কনফিগ।
- `firebase-blueprint.json`: কালেকশন ও ডেটা স্কিমা।

---

## 🔑 কিভাবে নিজের ফায়ারবেস প্রজেক্ট সংযুক্ত করবেন:

1. **[console.firebase.google.com](https://console.firebase.google.com)** এ যান ও একটি নতুন প্রজেক্ট তৈরি করুন (যেমন: `safar-gafargaon`)।
2. **Firestore Database** চালু করুন (Start in test mode or production mode)।
3. প্রজেক্ট সেটিংসে গিয়ে **Web App (</>)** রেজিস্টার করুন এবং আপনার নিজস্ব কনফিগ কীগুলো সংগ্রহ করুন।
4. প্রজেক্টের রুট ডিরেক্টরিতে `.env` ফাইল খুলুন (বা `.env.example` কপি করে `.env` তৈরি করুন) এবং আপনার কীগুলো বসিয়ে দিন:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
   VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
   ```
5. সিকিউরিটি রুলস ডিপ্লয় করতে টার্মিনালে রান করুন:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

## ⚡ রিয়েল-টাইম লাইভ সিঙ্ক ফিচার:
- **অনলাইন বুকিং**: যাত্রী রিকোয়েস্ট পাঠালে সাথে সাথে চালকের স্ক্রিনে সাউন্ড ও ভাইব্রেশন সহ নোটিফিকেশন বাজে (`onSnapshot`)।
- **লাইভ ড্রাইভার স্ট্যাটাস**: চালক অনলাইন/অফলাইন টগল করলে তা ম্যাপে তাৎক্ষণিক পরিবর্তন হয়।
- **অ্যাডমিন কন্ট্রোল**: অ্যাডমিন প্যানেল থেকে কোনো ভাড়া বা স্ট্যান্ড এডিট করলে সব ইউজারের ফোনে তাৎক্ষণিক সিঙ্ক হয়।
- **অফলাইন সাপোর্ট**: নেটওয়ার্ক ডিসকানেক্ট হলেও অ্যাপ বন্ধ হবে না, লোকাল ক্যাশ থেকে ডাটা লোড হবে।
