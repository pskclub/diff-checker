# Ignore Empty Lines Feature

## ภาพรวม

ฟีเจอร์ "Ignore empty lines" ช่วยให้ผู้ใช้สามารถเลือกได้ว่าต้องการให้ระบบนับบรรทัดว่างเป็นส่วนหนึ่งของการเปรียบเทียบหรือไม่

## การใช้งาน

### ตำแหน่ง UI
- อยู่ในส่วนตัวเลือกด้านล่างช่องอัปโหลดไฟล์
- เป็น checkbox ที่สามารถเปิด/ปิดได้
- อยู่ข้างๆ "Ignore whitespace" และ "Show whitespace"

### การทำงาน

#### เมื่อ **ปิด** (Default)
```
File A:          File B:
line 1           line 1
                 
line 2           line 2
                 line 3
line 3           
```

**ผลลัพธ์:**
```diff
  line 1
+                  (empty line added)
  line 2
+ line 3
- line 3
+                  (empty line added)
```

#### เมื่อ **เปิด**
```
File A:          File B:
line 1           line 1
                 
line 2           line 2
                 line 3
line 3           
```

**ผลลัพธ์:**
```diff
  line 1
  line 2
+ line 3
- line 3
```

บรรทัดว่างถูกกรองออกก่อนเปรียบเทียบ

## กรณีการใช้งาน

### 1. เปรียบเทียบโค้ดที่มี Formatting ต่างกัน
```javascript
// File A
function hello() {
  console.log("hello");
}

// File B  
function hello() {

  console.log("hello");

}
```

**เมื่อเปิด Ignore empty lines**: จะเห็นว่าโค้ดเหมือนกัน ไม่มีการเปลี่ยนแปลง

### 2. เปรียบเทียบเอกสาร
```markdown
# File A
## Title

Content here

## Another Title

# File B
## Title
Content here
## Another Title
```

**เมื่อเปิด Ignore empty lines**: จะเห็นว่าเนื้อหาเหมือนกัน แค่ spacing ต่างกัน

### 3. เปรียบเทียบ Configuration Files
```yaml
# File A
name: app
version: 1.0

dependencies:
  - lib1
  - lib2

# File B
name: app
version: 1.0
dependencies:
  - lib1
  - lib2
```

**เมื่อเปิด Ignore empty lines**: จะเห็นว่า config เหมือนกัน

## ข้อดี

1. **ลดความสับสน**: ไม่ต้องสนใจการเปลี่ยนแปลงของบรรทัดว่าง
2. **โฟกัสที่เนื้อหา**: เห็นเฉพาะการเปลี่ยนแปลงที่สำคัญ
3. **เหมาะกับ Code Review**: ไม่ต้องสนใจ formatting
4. **ยืดหยุ่น**: เปิด/ปิดได้ตามต้องการ

## ข้อควรระวัง

1. **อาจพลาดการเปลี่ยนแปลงบางอย่าง**: ถ้าบรรทัดว่างมีความหมาย (เช่น ใน Markdown, Python)
2. **เลขบรรทัดอาจไม่ตรง**: เพราะบรรทัดว่างถูกกรองออก
3. **ไม่เหมาะกับทุกกรณี**: บางครั้งบรรทัดว่างมีความสำคัญ

## เมื่อไหร่ควรใช้

### ✅ ควรเปิด
- เปรียบเทียบโค้ดที่มี formatting ต่างกัน
- Code review ที่ต้องการเห็นเฉพาะการเปลี่ยนแปลงของโค้ด
- เปรียบเทียบไฟล์ที่มีการจัด spacing ต่างกัน
- ต้องการลด noise ในผลลัพธ์

### ❌ ไม่ควรเปิด
- เปรียบเทียบ Markdown (บรรทัดว่างมีความหมาย)
- เปรียบเทียบ Python (indentation สำคัญ)
- เปรียบเทียบไฟล์ที่บรรทัดว่างมีความหมาย
- ต้องการเห็นการเปลี่ยนแปลงทั้งหมด

## การทำงานภายใน

### Algorithm
```typescript
if (ignoreEmptyLines) {
  // Filter out empty lines but keep track of original line numbers
  lines1WithNum = allLines1
    .map((line, idx) => ({ line, originalLineNum: idx + 1 }))
    .filter(item => item.line.trim() !== '');
  lines2WithNum = allLines2
    .map((line, idx) => ({ line, originalLineNum: idx + 1 }))
    .filter(item => item.line.trim() !== '');
} else {
  // Keep all lines including empty ones
  lines1WithNum = allLines1.map((line, idx) => ({ 
    line, 
    originalLineNum: idx + 1 
  }));
  lines2WithNum = allLines2.map((line, idx) => ({ 
    line, 
    originalLineNum: idx + 1 
  }));
}
```

### Key Points
1. **Original Line Numbers**: เก็บเลขบรรทัดต้นฉบับไว้เสมอ
2. **Filter Before Diff**: กรองบรรทัดว่างก่อนทำ diff
3. **Trim Check**: ใช้ `trim()` เพื่อตรวจสอบว่าเป็นบรรทัดว่างจริงๆ

## Session Management

ตั้งค่า "Ignore empty lines" จะถูก:
- ✅ บันทึกใน Session
- ✅ โหลดกลับมาเมื่อเปิด Session
- ✅ Export ไปกับ Session

```typescript
interface SavedSession {
  timestamp: number;
  text1: string;
  text2: string;
  file1Name?: string;
  file2Name?: string;
  ignoreWhitespace: boolean;
  showWhitespace: boolean;
  ignoreEmptyLines?: boolean;  // ← เพิ่มใหม่
}
```

## ตัวอย่างการใช้งานจริง

### ตัวอย่างที่ 1: Code Formatting
```javascript
// Before (File A)
function calculate(a, b) {
  const sum = a + b;
  return sum;
}

// After (File B)
function calculate(a, b) {

  const sum = a + b;
  
  return sum;
  
}
```

**ผลลัพธ์เมื่อเปิด Ignore empty lines**: ไม่มีการเปลี่ยนแปลง ✓

### ตัวอย่างที่ 2: Documentation
```markdown
<!-- File A -->
# Title
Content paragraph 1.
Content paragraph 2.

<!-- File B -->
# Title

Content paragraph 1.

Content paragraph 2.
```

**ผลลัพธ์เมื่อเปิด Ignore empty lines**: ไม่มีการเปลี่ยนแปลง ✓

## สรุป

ฟีเจอร์ "Ignore empty lines" เป็นเครื่องมือที่มีประโยชน์สำหรับการเปรียบเทียบไฟล์ที่มี formatting ต่างกัน ช่วยให้โฟกัสที่เนื้อหาที่สำคัญได้ดีขึ้น แต่ควรใช้อย่างระมัดระวังในกรณีที่บรรทัดว่างมีความหมาย

