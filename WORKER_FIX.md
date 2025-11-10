# การแก้ไขปัญหา PDF.js Worker

## 🐛 ปัญหาที่พบ

```
Setting up fake worker failed: "Failed to fetch dynamically imported module: 
http://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.296/pdf.worker.min.js"
```

### สาเหตุ

1. **ใช้ HTTP แทน HTTPS**: CDN URL ใช้ `http://` ซึ่งถูก block โดย browser ที่ใช้ HTTPS
2. **CORS Issues**: บาง CDN อาจมีปัญหา CORS
3. **CDN Availability**: cdnjs.cloudflare.com อาจมีปัญหาในบางเวลา

---

## ✅ วิธีแก้ไข

### แก้ไขที่ทำ

เปลี่ยนจาก:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

เป็น:
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

### เหตุผล

1. **ใช้ HTTPS**: ป้องกันปัญหา mixed content
2. **ใช้ unpkg**: CDN ที่เชื่อถือได้และรวดเร็ว
3. **ใช้ .mjs**: ไฟล์ worker แบบ ES Module ที่ทันสมัย
4. **Version Matching**: ใช้ version เดียวกับ pdfjs-dist ที่ติดตั้ง

---

## 🔄 ทางเลือกอื่นๆ

### ทางเลือกที่ 1: ใช้ jsDelivr CDN

```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

**ข้อดี:**
- CDN ที่เร็วและเชื่อถือได้
- รองรับ npm packages โดยตรง

**ข้อเสีย:**
- อาจถูก block ในบางประเทศ

### ทางเลือกที่ 2: ใช้ Local Worker (แนะนำสำหรับ Production)

#### ขั้นตอนที่ 1: Copy worker file

สร้าง script ใน `package.json`:
```json
{
  "scripts": {
    "postinstall": "cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs"
  }
}
```

#### ขั้นตอนที่ 2: ใช้ local path

```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

**ข้อดี:**
- ไม่ต้องพึ่งพา external CDN
- เร็วกว่า (ไม่ต้อง fetch จาก CDN)
- ทำงานได้แม้ offline

**ข้อเสีย:**
- ต้อง setup เพิ่มเติม
- เพิ่มขนาด bundle

### ทางเลือกที่ 3: ใช้ Next.js Static Files

#### ขั้นตอนที่ 1: สร้างโฟลเดอร์ public

```bash
mkdir -p public
```

#### ขั้นตอนที่ 2: Copy worker

```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

#### ขั้นตอนที่ 3: ใช้ในโค้ด

```typescript
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}
```

---

## 🎯 แนะนำสำหรับแต่ละสถานการณ์

### Development
```typescript
// ใช้ unpkg (ง่ายและรวดเร็ว)
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

### Production
```typescript
// ใช้ local worker (เร็วและเชื่อถือได้)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
```

### Hybrid (แนะนำ)
```typescript
if (typeof window !== 'undefined') {
  // ลองใช้ local ก่อน ถ้าไม่มีใช้ CDN
  const localWorker = '/pdf.worker.min.mjs';
  const cdnWorker = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = localWorker;
  
  // Fallback to CDN if local fails
  fetch(localWorker, { method: 'HEAD' })
    .catch(() => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorker;
    });
}
```

---

## 🔧 การ Setup Local Worker (แนะนำ)

### ขั้นตอนที่ 1: สร้าง Script

สร้างไฟล์ `scripts/copy-pdf-worker.js`:

```javascript
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const dest = path.join(__dirname, '../public/pdf.worker.min.mjs');

// สร้างโฟลเดอร์ public ถ้ายังไม่มี
if (!fs.existsSync(path.join(__dirname, '../public'))) {
  fs.mkdirSync(path.join(__dirname, '../public'));
}

// Copy file
fs.copyFileSync(source, dest);
console.log('✅ PDF worker copied to public folder');
```

### ขั้นตอนที่ 2: เพิ่ม Script ใน package.json

```json
{
  "scripts": {
    "postinstall": "node scripts/copy-pdf-worker.js",
    "dev": "npm run postinstall && next dev",
    "build": "npm run postinstall && next build"
  }
}
```

### ขั้นตอนที่ 3: Update Code

```typescript
const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    if (typeof window !== 'undefined') {
      // ใช้ local worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    }
    
    // ... rest of the code
  }
}
```

### ขั้นตอนที่ 4: Update .gitignore

```
# PDF.js worker (generated)
public/pdf.worker.min.mjs
```

---

## 📊 เปรียบเทียบทางเลือก

| ทางเลือก | ความเร็ว | ความเชื่อถือได้ | ความยาก | แนะนำ |
|---------|---------|----------------|---------|-------|
| unpkg CDN | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Dev |
| jsDelivr CDN | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Dev |
| Local Worker | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Prod |
| Hybrid | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Best |

---

## 🧪 การทดสอบ

### ทดสอบว่า Worker ทำงาน

```typescript
// เพิ่มใน extractTextFromPDF
console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc);

// ตรวจสอบใน Browser Console
// ควรเห็น: Worker source: https://unpkg.com/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs
```

### ทดสอบการโหลด PDF

1. เปิด Browser DevTools
2. ไปที่ Network tab
3. อัปโหลดไฟล์ PDF
4. ตรวจสอบว่ามีการโหลด `pdf.worker.min.mjs` สำเร็จ

---

## ⚠️ ข้อควรระวัง

### 1. Version Mismatch

**ปัญหา**: Worker version ไม่ตรงกับ pdfjs-dist version

**วิธีแก้**:
```typescript
// ใช้ dynamic version
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

### 2. CORS Issues

**ปัญหา**: CDN ถูก block โดย CORS policy

**วิธีแก้**:
- ใช้ CDN ที่รองรับ CORS (unpkg, jsDelivr)
- หรือใช้ local worker

### 3. Content Security Policy (CSP)

**ปัญหา**: CSP block การโหลด worker จาก external source

**วิธีแก้**:
```typescript
// ใน next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "worker-src 'self' https://unpkg.com;"
          }
        ]
      }
    ];
  }
};
```

---

## 📝 สรุป

### การแก้ไขปัจจุบัน (Quick Fix)
```typescript
pdfjsLib.GlobalWorkerOptions.workerSrc = 
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
```

**ข้อดี:**
- ✅ แก้ไขง่าย (1 บรรทัด)
- ✅ ใช้ HTTPS
- ✅ Version matching อัตโนมัติ
- ✅ ทำงานได้ทันที

**ข้อเสีย:**
- ⚠️ ต้องพึ่งพา external CDN
- ⚠️ อาจช้าในบางพื้นที่

### แนะนำสำหรับ Production
ใช้ local worker ด้วย postinstall script เพื่อ:
- ⚡ ความเร็วสูงสุด
- 🔒 ความเชื่อถือได้สูงสุด
- 📦 ไม่ต้องพึ่งพา external services

---

## 🎉 ผลลัพธ์

หลังจากแก้ไข:
- ✅ PDF worker โหลดสำเร็จ
- ✅ ไม่มี CORS errors
- ✅ ไม่มี mixed content warnings
- ✅ PDF extraction ทำงานได้ปกติ
- ✅ Build สำเร็จ

**PDF features พร้อมใช้งานแล้ว!** 🚀

