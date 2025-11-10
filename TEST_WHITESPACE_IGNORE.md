# Test Cases for Whitespace Ignore Feature

## Test Setup
1. Open the application in browser
2. Navigate to the Text Diff Checker
3. Enable/disable "Ignore whitespace (spaces, tabs, etc.)" checkbox
4. Compare the results

---

## Test Case 1: Multiple Spaces Between Words

### Input
**Text 1:**
```
Hello    World
```

**Text 2:**
```
Hello World
```

### Expected Results

#### With "Ignore whitespace" DISABLED:
- **Line-level**: Shows as MODIFIED (yellow background)
- **Character-level**: Shows 3 removed spaces in red with strikethrough
- **Change count**: +1 added, -1 removed

#### With "Ignore whitespace" ENABLED:
- **Line-level**: Shows as EQUAL (no highlighting)
- **Character-level**: No differences shown
- **Change count**: +0 added, -0 removed

---

## Test Case 2: Tabs vs Spaces

### Input
**Text 1:**
```
Hello	World
```
(Tab character between Hello and World)

**Text 2:**
```
Hello    World
```
(4 spaces between Hello and World)

### Expected Results

#### With "Ignore whitespace" DISABLED:
- **Line-level**: Shows as MODIFIED
- **Character-level**: Shows tab removed and spaces added
- **Change count**: +1 added, -1 removed

#### With "Ignore whitespace" ENABLED:
- **Line-level**: Shows as EQUAL
- **Character-level**: No differences shown
- **Change count**: +0 added, -0 removed

---

## Test Case 3: Leading and Trailing Whitespace

### Input
**Text 1:**
```
   Hello World   
```

**Text 2:**
```
Hello World
```

### Expected Results

#### With "Ignore whitespace" DISABLED:
- **Line-level**: Shows as MODIFIED
- **Character-level**: Shows removed leading/trailing spaces
- **Change count**: +1 added, -1 removed

#### With "Ignore whitespace" ENABLED:
- **Line-level**: Shows as EQUAL
- **Character-level**: No differences shown
- **Change count**: +0 added, -0 removed

---

## Test Case 4: Newlines and Line Breaks

### Input
**Text 1:**
```
Hello

World
```
(Empty line between Hello and World)

**Text 2:**
```
Hello
World
```
(No empty line)

### Expected Results

#### With "Ignore whitespace" DISABLED:
- **Line-level**: Shows empty line as REMOVED
- **Change count**: +0 added, -1 removed

#### With "Ignore whitespace" ENABLED:
- **Line-level**: Shows empty line as REMOVED (empty lines are handled by separate option)
- **Change count**: +0 added, -1 removed

**Note**: Use "Ignore empty lines" option to ignore empty lines

---

## Test Case 5: Mixed Whitespace Changes

### Input
**Text 1:**
```
The  quick   brown
fox  jumps    over
```

**Text 2:**
```
The quick brown
fox jumps over
```

### Expected Results

#### With "Ignore whitespace" DISABLED:
- **Line-level**: Both lines show as MODIFIED
- **Character-level**: Shows removed extra spaces
- **Change count**: +2 added, -2 removed

#### With "Ignore whitespace" ENABLED:
- **Line-level**: Both lines show as EQUAL
- **Character-level**: No differences shown
- **Change count**: +0 added, -0 removed

---

## Test Case 6: Whitespace Only Differences

### Input
**Text 1:**
```
HelloWorld
```

**Text 2:**
```
Hello World
```

### Expected Results

#### With "Ignore whitespace" DISABLED:
- **Line-level**: Shows as MODIFIED
- **Character-level**: Shows added space
- **Change count**: +1 added, -1 removed

#### With "Ignore whitespace" ENABLED:
- **Line-level**: Shows as EQUAL
- **Character-level**: No differences shown
- **Change count**: +0 added, -0 removed

---

## Test Case 7: Content Changes with Whitespace

### Input
**Text 1:**
```
Hello    World
```

**Text 2:**
```
Hello Universe
```

### Expected Results

#### With "Ignore whitespace" DISABLED:
- **Line-level**: Shows as MODIFIED
- **Character-level**: Shows "World" removed and "Universe" added, plus whitespace changes
- **Change count**: +1 added, -1 removed

#### With "Ignore whitespace" ENABLED:
- **Line-level**: Shows as MODIFIED (content is different)
- **Character-level**: Shows only "World" → "Universe" change, ignores whitespace
- **Change count**: +1 added, -1 removed

---

## Test Case 8: Show Whitespace Visualization

### Input
**Text 1:**
```
Hello	World
```
(Tab character)

**Text 2:**
```
Hello World
```
(Space character)

### Expected Results

#### With "Show whitespace" ENABLED:
- Tabs shown as: `→   `
- Spaces shown as: `·`
- Display: `Hello→···World` vs `Hello·World`

#### With both "Ignore whitespace" and "Show whitespace" ENABLED:
- Whitespace characters are visualized but not compared
- No differences shown in comparison

---

## Test Case 9: Session Saving

### Steps
1. Enter text with whitespace differences
2. Enable "Ignore whitespace"
3. Click "Compare"
4. Click "Save Session"
5. Reload page
6. Load saved session

### Expected Results
- Session should restore with "Ignore whitespace" enabled
- Comparison results should match original

---

## Test Case 10: Export Functionality

### Steps
1. Compare texts with whitespace differences
2. Enable "Ignore whitespace"
3. Click "Export" button

### Expected Results
- Exported HTML should reflect the comparison with whitespace ignored
- No whitespace-only differences should appear in export

---

## Automated Test Script (Optional)

```javascript
// Run in browser console
const testWhitespaceIgnore = () => {
  const tests = [
    {
      name: "Multiple spaces",
      text1: "Hello    World",
      text2: "Hello World",
      expectedEqual: true
    },
    {
      name: "Tabs vs spaces",
      text1: "Hello\tWorld",
      text2: "Hello    World",
      expectedEqual: true
    },
    {
      name: "Leading/trailing",
      text1: "   Hello World   ",
      text2: "Hello World",
      expectedEqual: true
    }
  ];
  
  console.log("Running whitespace ignore tests...");
  // Test implementation here
};
```

---

## Performance Test

### Large File Test
**Input**: Two files with 10,000 lines each, differing only in whitespace

### Expected Results
- Comparison should complete in reasonable time (< 5 seconds)
- Memory usage should remain stable
- No browser freezing or crashes

---

## Edge Cases

### Test Case 11: Empty Strings
- Text 1: `""` (empty)
- Text 2: `"   "` (only whitespace)
- Expected: Equal when ignoring whitespace

### Test Case 12: Only Whitespace
- Text 1: `"   \t\n   "`
- Text 2: `"\t   \n\t"`
- Expected: Equal when ignoring whitespace

### Test Case 13: Unicode Whitespace
- Text 1: `"Hello\u00A0World"` (non-breaking space)
- Text 2: `"Hello World"` (regular space)
- Expected: Equal when ignoring whitespace (if \s regex matches it)

---

## Browser Compatibility

Test on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

---

## Regression Tests

Ensure existing features still work:
- ✅ PDF file comparison
- ✅ DOCX file comparison
- ✅ Search functionality
- ✅ View mode switching (Diff/Original/Modified)
- ✅ Copy to clipboard
- ✅ Export to HTML
- ✅ Session management

