# সফর (Safar) - গফরগাঁও ও পাগলা থানা ডিজিটাল পরিবহন সেবা

## 🚀 Cloudflare Pages ডিপ্লয় নির্দেশিকা (100% Guaranteed Zero Error)

Cloudflare Pages বা GitHub-এ সরাসরি ডিপ্লয় করার সময় কোনো বিল্ড এরর যেন না হয়, সেজন্য এই প্রজেক্টে নিম্নলিখিত কনফিগারেশন যুক্ত রয়েছে:
1. `.npmrc` ফাইল (`legacy-peer-deps=true`, `engine-strict=false`)
2. `.node-version` এবং `.nvmrc` ফাইল (`20.18.0`)
3. `firebase@^11.4.0` (Node 20 LTS পুরোপুরি সমর্থিত)

### Cloudflare Pages সেটিংস:
- **Framework Preset**: `Vite` (অথবা `None`)
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (ফাঁকা রাখুন)
- **Node.js version**: `20.18.0` (বা 20)

### লোকাল টেস্ট বা রান করার নিয়ম:
```bash
npm install
npm run build
npm run preview
```
