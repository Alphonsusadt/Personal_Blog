# 🚀 LANGKAH START SERVER PORTFOLIO

## 📋 Checklist Sebelum Start:

### ✅ Prerequisites:
- [ ] Node.js installed (v16+)
- [ ] MongoDB installed dan running (untuk CMS)
- [ ] File cms/.env sudah ada dan terisi

### 🔧 Manual Start (Jika Script Gagal):

#### 1. Start CMS Backend (Terminal 1):
```bash
cd d:\alphonsus-portfolio-website-design\cms
npm run dev
```
**Expected output:** "CMS API server running on http://localhost:5001"

#### 2. Start Frontend (Terminal 2):
```bash
cd d:\alphonsus-portfolio-website-design  
npm run dev
```
**Expected output:** "Local: http://localhost:5173/"

### 🐛 Common Errors & Solutions:

#### Error: "MongoDB connection failed"
**Solution:** 
- Install MongoDB: https://www.mongodb.com/try/download/community
- Start MongoDB service: `net start MongoDB` (as admin)

#### Error: "Port 5001 already in use"
**Solution:** 
- Kill process: Find PID with `netstat -ano | findstr :5001`
- Kill: `taskkill /PID [PID_NUMBER] /F`

#### Error: "TypeScript compilation failed"
**Solution:**
- Run: `npm run build` to see specific errors
- Fix syntax errors in .tsx files

#### Error: "Cannot find module"
**Solution:**
- Run: `npm install` in both root and cms folders

### 📱 Access URLs:
- 🌐 **Frontend:** http://localhost:5173
- 🖥️ **CMS API:** http://localhost:5001  
- 👨‍💼 **Admin Panel:** http://localhost:5173/admin
- 📊 **API Test:** http://localhost:5001/api/stats

### 🔑 Default Login:
- **Username:** admin
- **Password:** [check cms/.env ADMIN_PASSWORD value]

---
**Quick Start:** Double-click `START_SERVERS_WITH_DIAGNOSTICS.bat`