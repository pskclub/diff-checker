# การปรับปรุงการรองรับ PDF

## สรุปการเปลี่ยนแปลง

โปรเจกต์ได้รับการปรับปรุงให้รองรับไฟล์ PDF ได้ดีขึ้นและรักษา layout ของข้อความได้สมบูรณ์มากขึ้น

## การเปลี่ยนแปลงหลัก

### 1. เปลี่ยนจาก pdf-parse เป็น pdfjs-dist

**เดิม:**
- ใช้ `pdf-parse` library ซึ่งมีข้อจำกัดในการควบคุม text extraction
- ไม่สามารถรักษา layout และ spacing ได้ดี

**ใหม่:**
- ใช้ `pdfjs-dist` โดยตรง (library เดียวกับที่ Mozilla Firefox ใช้)
- ควบคุม text extraction ได้ละเอียดมากขึ้น
- รองรับ positioning และ layout ที่ซับซ้อน

### 2. ฟีเจอร์ที่ปรับปรุง

#### 2.1 การรักษา Layout และ Spacing
- **ตรวจจับและรักษา indentation**: วิเคราะห์ตำแหน่ง X ของข้อความเพื่อรักษาการเยื้อง
- **คำนวณ spacing ระหว่างคำ**: ใช้ระยะห่างจริงระหว่าง text items เพื่อเพิ่ม spaces ที่เหมาะสม
- **รักษา line breaks**: ตรวจจับการขึ้นบรรทัดใหม่จากการเปลี่ยนแปลงของ Y coordinate

#### 2.2 การรองรับ Multi-Column Layouts
- **ตรวจจับ columns อัตโนมัติ**: วิเคราะห์ X positions เพื่อหา column breaks
- **จัดเรียงข้อความตาม column**: อ่านข้อความจากซ้ายไปขวา แล้วจึงไปยัง column ถัดไป
- **เพิ่ม separator ระหว่าง columns**: ใส่บรรทัดว่างระหว่าง columns เพื่อความชัดเจน

#### 2.3 การจัดการ Coordinates
- **แปลง PDF coordinates**: แปลงจาก bottom-up เป็น top-down coordinates
- **ใช้ viewport height**: คำนวณตำแหน่งที่ถูกต้องตาม page size
- **Threshold ที่ปรับแต่งได้**: ใช้ threshold ที่เหมาะสมสำหรับการตรวจจับ same line (3 units)

#### 2.4 Post-Processing
- **ลบ blank lines ที่เกิน**: จำกัดให้มี consecutive blank lines ไม่เกิน 2 บรรทัด
- **Trim whitespace**: ลบ whitespace ที่ไม่จำเป็นท้ายบรรทัด
- **Page separators**: เพิ่ม "--- Page Break ---" ระหว่างหน้า

### 3. การจัดการ SSR (Server-Side Rendering)

- ใช้ **dynamic import** สำหรับ pdfjs-dist เพื่อหลีกเลี่ยงปัญหา SSR
- ตั้งค่า worker path แบบ conditional (เฉพาะ client-side)
- รองรับ Next.js build process

## โครงสร้างโค้ด

### ฟังก์ชันหลัก: `extractTextFromPDF`

```typescript
const extractTextFromPDF = async (arrayBuffer: ArrayBuffer): Promise<string>
```

**ขั้นตอนการทำงาน:**

1. **Load PDF Document**
   - Dynamic import pdfjs-dist
   - ตั้งค่า worker
   - โหลด PDF จาก ArrayBuffer

2. **วนลูปแต่ละหน้า**
   - ดึง text content และ viewport
   - แปลง coordinates เป็น top-down

3. **ตรวจจับ Columns**
   - วิเคราะห์ X positions
   - หา column breaks (gap > 100 units)
   - จัดกลุ่ม items ตาม column

4. **เรียงลำดับ Text Items**
   - เรียงตาม column index
   - เรียงตาม Y position (บนลงล่าง)
   - เรียงตาม X position (ซ้ายไปขวา)

5. **สร้าง Lines**
   - คำนวณ indentation
   - เพิ่ม spacing ระหว่างคำ
   - ตรวจจับ line breaks

6. **Post-Processing**
   - ลบ excessive blank lines
   - รวม pages ด้วย separator

## ตัวอย่างการใช้งาน

### การอัปโหลดไฟล์ PDF

1. เลือกไฟล์ PDF ผ่าน file input
2. ระบบจะ extract text โดยอัตโนมัติ
3. รักษา layout, spacing, และ indentation
4. รองรับ multi-column layouts

### ผลลัพธ์ที่ได้

- **Text ที่มี indentation**: รักษาการเยื้องของย่อหน้า
- **Tables**: รักษา column alignment (ในระดับหนึ่ง)
- **Multi-column documents**: อ่านตาม column order
- **Page breaks**: แสดง separator ระหว่างหน้า

## การปรับแต่ง Parameters

### Thresholds ที่สำคัญ

```typescript
const columnThreshold = 100;      // Minimum gap for column break
const sameLineThreshold = 3;      // Y difference for same line
const minGapForSpace = 5;         // Minimum gap to add space
const maxSpaces = 10;             // Maximum spaces to add
const maxBlankLines = 2;          // Maximum consecutive blank lines
```

### การปรับแต่งตามความต้องการ

- **เพิ่ม columnThreshold**: หากต้องการตรวจจับ columns ที่ห่างกันมากขึ้น
- **ลด sameLineThreshold**: หากข้อความในบรรทัดเดียวกันมี Y ที่แตกต่างกัน
- **ปรับ spacing calculation**: แก้ไขสูตร `Math.floor(gap / 4)` ตามความเหมาะสม

## Dependencies

### ติดตั้งแล้ว

```json
{
  "dependencies": {
    "pdfjs-dist": "^5.4.296"
  },
  "devDependencies": {
    "@types/pdfjs-dist": "^2.10.378"
  }
}
```

### ถอนการติดตั้ง

```json
{
  "dependencies": {
    "pdf-parse": "ถูกลบออก"
  }
}
```

## ข้อจำกัดและข้อควรระวัง

### ข้อจำกัด

1. **Complex Tables**: Tables ที่ซับซ้อนอาจไม่รักษา alignment ได้สมบูรณ์
2. **Rotated Text**: ข้อความที่หมุนอาจไม่ถูกต้อง
3. **Images**: ไม่สามารถ extract text จากรูปภาพ (ต้องใช้ OCR)
4. **Scanned PDFs**: PDF ที่เป็นรูปภาพต้องใช้ OCR

### ข้อควรระวัง

1. **ไฟล์ขนาดใหญ่**: PDF ที่มีหลายร้อยหน้าอาจใช้เวลานาน
2. **Memory usage**: การ load PDF ขนาดใหญ่ใช้ memory มาก
3. **Font encoding**: บาง fonts อาจมีปัญหาการ encode ตัวอักษร

## การทดสอบ

### ทดสอบด้วยไฟล์ PDF ประเภทต่างๆ

1. **Simple text PDF**: ข้อความธรรมดา 1 column
2. **Multi-column PDF**: เอกสารที่มีหลาย columns
3. **PDF with tables**: เอกสารที่มี tables
4. **PDF with indentation**: เอกสารที่มีการเยื้อง
5. **Mixed layout PDF**: เอกสารที่มี layout ผสม

### ตัวอย่างการทดสอบ

```bash
# Build project
npm run build

# Run development server
npm run dev

# Test with various PDF files
# - Upload PDF file
# - Check text extraction quality
# - Verify layout preservation
```

## การพัฒนาต่อในอนาคต

### ฟีเจอร์ที่อาจเพิ่มเติม

1. **OCR Support**: รองรับ scanned PDFs ด้วย Tesseract.js
2. **Table Detection**: ตรวจจับและรักษา table structure ได้ดีขึ้น
3. **Font Analysis**: วิเคราะห์ font size และ style
4. **Image Extraction**: ดึงรูปภาพออกมาแสดง
5. **Progress Indicator**: แสดง progress bar สำหรับไฟล์ขนาดใหญ่
6. **Caching**: cache ผลลัพธ์เพื่อความเร็ว

### การปรับปรุงประสิทธิภาพ

1. **Web Worker**: ย้าย PDF processing ไปทำใน Web Worker
2. **Lazy Loading**: โหลดเฉพาะหน้าที่ต้องการ
3. **Streaming**: ประมวลผลแบบ streaming สำหรับไฟล์ใหญ่

## สรุป

การปรับปรุงนี้ทำให้ Text Diff Checker รองรับไฟล์ PDF ได้ดีขึ้นอย่างมาก โดย:

✅ รักษา layout และ spacing ของข้อความ
✅ รองรับ multi-column layouts
✅ ตรวจจับและรักษา indentation
✅ จัดการ page breaks อย่างเหมาะสม
✅ ใช้ pdfjs-dist ที่มีประสิทธิภาพสูง
✅ รองรับ Next.js SSR

ผลลัพธ์คือการเปรียบเทียบไฟล์ PDF ที่แม่นยำและอ่านง่ายมากขึ้น!

