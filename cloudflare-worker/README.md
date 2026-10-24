# সফর গফরগাঁও - ক্লাউডফ্লেয়ার লাইভ লোকেশন সার্ভার (Cloudflare Worker Setup)

এই ক্লাউডফ্লেয়ার ওয়ার্কার (Cloudflare Worker) ব্যবহার করে যাত্রী ও চালকের লাইভ জিপিএস লোকেশন রিয়েল-টাইমে (WebSockets & REST API) আদান-প্রদান করা যায়।

---

## ১ মিনিটে ক্লাউডফ্লেয়ারে ডিপ্লয় করার নিয়ম (Deploy via Wrangler CLI)

১. টার্মিনাল ওপেন করে এই ফোল্ডারে যান:
```bash
cd cloudflare-worker
```

২. ক্লাউডফ্লেয়ার একাউন্টে লগইন করুন (যদি আগে না করা থাকে):
```bash
npx wrangler login
```

৩. এক কমান্ডেই ডিপ্লয় করুন:
```bash
npx wrangler deploy
```

৪. ডিপ্লয় সফল হলে একটি সাবডোমেন পাবেন, যেমন:
`https://safar-gafargaon-live.<your-subdomain>.workers.dev`

৫. সফর অ্যাপ্লিকেশনের ম্যাপের উপরের **"ক্লাউডফ্লেয়ার সেটিংস"** বাটনে ক্লিক করে আপনার এই URL টি পেস্ট করুন। ব্যস, পুরো গফরগাঁওয়ের সকল যাত্রী ও চালক একসাথে লাইভ ট্র্যাক হতে থাকবে!

---

## ক্লাউডফ্লেয়ার ড্যাশবোর্ড থেকে ডিপ্লয় করার নিয়ম (No CLI required)

১. [https://dash.cloudflare.com](https://dash.cloudflare.com) এ লগইন করুন।
২. বামপাশের মেনু থেকে **Workers & Pages** এ যান।
৩. **Create Application** -> **Create Worker** বাটনে ক্লিক করুন।
৪. নাম দিন `safar-gafargaon-live` এবং **Deploy** চাপুন।
৫. এবার **Quick Edit** বাটনে ক্লিক করে `worker.js` ফাইলের কোডটুকু কপি করে সেখানে পেস্ট করে **Save and Deploy** করে দিন!
৬. প্রাপ্ত URL টি অ্যাপে বসিয়ে লাইভ ট্র্যাকিং উপভোগ করুন।
