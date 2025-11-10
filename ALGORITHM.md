# Myers Diff Algorithm - คำอธิบายโดยละเอียด

## ภาพรวม

Myers Diff Algorithm เป็นอัลกอริทึมที่ใช้ในการหาความแตกต่างระหว่างสองลำดับ (sequences) ที่มีประสิทธิภาพสูง พัฒนาโดย Eugene W. Myers ในปี 1986 และเป็นอัลกอริทึมที่ Git ใช้ในการทำ diff

## หลักการทำงาน

### 1. Edit Graph
อัลกอริทึมสร้าง "edit graph" ซึ่งเป็นกราฟ 2 มิติ:
- แกน X แทนลำดับแรก (file A)
- แกน Y แทนลำดับที่สอง (file B)
- เส้นทางในกราฟแทนการแปลง A ไปเป็น B

### 2. การเคลื่อนที่ในกราฟ
มี 3 ประเภท:
- **Diagonal**: เมื่อตัวอักษรตรงกัน (ไม่มีการเปลี่ยนแปลง)
- **Horizontal**: ลบตัวอักษรจาก A (removed)
- **Vertical**: เพิ่มตัวอักษรจาก B (added)

### 3. D-path
- D คือจำนวนการแก้ไข (edit distance)
- D-path คือเส้นทางที่ใช้การแก้ไข D ครั้ง
- อัลกอริทึมหาเส้นทางที่สั้นที่สุด (D น้อยที่สุด)

## ตัวอย่างการทำงาน

### Input:
```
A = "ABCABBA"
B = "CBABAC"
```

### Edit Graph:
```
    C  B  A  B  A  C
  +--+--+--+--+--+--+
A |  |  |\ |  |\ |  |
  +--+--+--+--+--+--+
B |  |\ |  |\ |  |  |
  +--+--+--+--+--+--+
C |\ |  |  |  |  |\ |
  +--+--+--+--+--+--+
A |  |  |\ |  |\ |  |
  +--+--+--+--+--+--+
B |  |\ |  |\ |  |  |
  +--+--+--+--+--+--+
B |  |\ |  |\ |  |  |
  +--+--+--+--+--+--+
A |  |  |\ |  |\ |  |
  +--+--+--+--+--+--+
```

เส้นทแยง (\) = ตัวอักษรตรงกัน

### Output:
```
- A
- B
  C
+ B
  A
  B
- B
  A
+ C
```

## Implementation Details

### 1. Forward Search (myersDiff)
```typescript
const myersDiff = (arr1: string[], arr2: string[]): DiffLine[] => {
  const m = arr1.length;
  const n = arr2.length;
  const max = m + n;
  const v: Map<number, number> = new Map();
  const trace: Map<number, number>[] = [];

  v.set(1, 0);

  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v));

    for (let k = -d; k <= d; k += 2) {
      // หา x ที่ดีที่สุดสำหรับ k-diagonal นี้
      let x: number;
      
      const goDown = k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0));
      
      if (goDown) {
        x = v.get(k + 1) || 0;  // ไปลง (add)
      } else {
        x = (v.get(k - 1) || 0) + 1;  // ไปขวา (remove)
      }

      let y = x - k;

      // เดินตามเส้นทแยงเท่าที่ทำได้
      while (x < m && y < n && arr1[x] === arr2[y]) {
        x++;
        y++;
      }

      v.set(k, x);

      // ถ้าถึงจุดสิ้นสุดแล้ว
      if (x >= m && y >= n) {
        return backtrackMyers(arr1, arr2, trace, m, n);
      }
    }
  }

  return backtrackMyers(arr1, arr2, trace, m, n);
};
```

### 2. Backtracking (backtrackMyers)
```typescript
const backtrackMyers = (
  arr1: string[],
  arr2: string[],
  trace: Map<number, number>[],
  m: number,
  n: number
): DiffLine[] => {
  const diff: DiffLine[] = [];
  let x = m;
  let y = n;

  // ย้อนกลับจากจุดสิ้นสุดไปจุดเริ่มต้น
  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const k = x - y;

    // หาว่าเราเดินมาจากทิศทางไหน
    const prevK = (k === -d || (k !== d && (v.get(k - 1) || 0) < (v.get(k + 1) || 0))) 
      ? k + 1 
      : k - 1;
    const prevX = v.get(prevK) || 0;
    const prevY = prevX - prevK;

    // เดินตามเส้นทแยง (equal)
    while (x > prevX && y > prevY) {
      diff.unshift({
        type: 'equal',
        line1: arr1[x - 1],
        line2: arr2[y - 1],
        lineNum1: x,
        lineNum2: y
      });
      x--;
      y--;
    }

    if (d > 0) {
      if (x > prevX) {
        // ไปขวา = removed
        diff.unshift({
          type: 'removed',
          line1: arr1[x - 1],
          line2: null,
          lineNum1: x,
          lineNum2: null
        });
        x--;
      } else if (y > prevY) {
        // ไปลง = added
        diff.unshift({
          type: 'added',
          line1: null,
          line2: arr2[y - 1],
          lineNum1: null,
          lineNum2: y
        });
        y--;
      }
    }
  }

  return diff;
};
```

## Complexity Analysis

### Time Complexity
- **Best Case**: O(N) เมื่อไฟล์เหมือนกันหรือแตกต่างกันเล็กน้อย
- **Average Case**: O(ND) โดย N = m + n, D = edit distance
- **Worst Case**: O(N²) เมื่อไฟล์แตกต่างกันทั้งหมด

### Space Complexity
- O(ND) สำหรับเก็บ trace
- O(D) สำหรับ v array

## ข้อดีของ Myers Algorithm

1. **Optimal**: หาเส้นทางที่สั้นที่สุดเสมอ (minimum edit distance)
2. **Efficient**: เร็วกว่า LCS แบบธรรมดาในหลายกรณี
3. **Natural**: ผลลัพธ์ดูเป็นธรรมชาติและอ่านง่าย
4. **Industry Standard**: ใช้ใน Git, SVN, และเครื่องมืออื่นๆ

## ข้อเสียและข้อจำกัด

1. **Memory**: ใช้หน่วยความจำมากเมื่อไฟล์แตกต่างกันมาก
2. **Worst Case**: ช้าเมื่อไฟล์แตกต่างกันทั้งหมด
3. **Implementation**: ซับซ้อนกว่า LCS แบบธรรมดา

## การปรับปรุงเพิ่มเติม

### 1. Similarity Threshold
```typescript
const calculateSimilarity = (str1: string, str2: string): number => {
  const charDiff = getCharacterDiff(str1, str2);
  const equalChars = charDiff.filter(c => c.type === 'equal').length;
  const maxLen = Math.max(str1.length, str2.length);
  return equalChars / maxLen;
};

// ใช้ threshold 40% สำหรับตัดสินว่าเป็น modified หรือไม่
const SIMILARITY_THRESHOLD = 0.4;
```

### 2. Hunk Grouping
```typescript
const CONTEXT_SIZE = 3;      // จำนวนบรรทัด context
const MERGE_DISTANCE = 6;    // ระยะห่างสูงสุดที่จะรวม hunks
```

## References

1. Myers, E. W. (1986). "An O(ND) Difference Algorithm and Its Variations"
2. Git Source Code: diff.c
3. [The Myers diff algorithm: part 1](https://blog.jcoglan.com/2017/02/12/the-myers-diff-algorithm-part-1/)

## สรุป

Myers Diff Algorithm เป็นอัลกอริทึมที่มีประสิทธิภาพและให้ผลลัพธ์ที่ดีที่สุดสำหรับการหาความแตกต่างระหว่างไฟล์ การนำมาใช้ใน Diff Checker ทำให้ได้ผลลัพธ์ที่ใกล้เคียง Git มากที่สุด

