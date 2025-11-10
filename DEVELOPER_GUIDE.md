# Developer Guide - Text Diff Checker

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

## Project Structure

```
app/
├── components/          # Reusable UI components
│   ├── DiffViewer.tsx
│   └── FileUploader.tsx
├── constants/          # Configuration and constants
│   └── diff.constants.ts
├── hooks/              # Custom React hooks
│   ├── useSearch.ts
│   └── useSessionManagement.ts
├── types/              # TypeScript type definitions
│   └── diff.types.ts
├── utils/              # Utility functions
│   ├── diff.utils.ts
│   ├── export.utils.ts
│   ├── file.utils.ts
│   ├── pdf.utils.ts
│   └── ui.utils.ts
└── TextDiffChecker.tsx # Main component
```

## Adding New Features

### Adding a New File Type

1. Update `types/diff.types.ts`:
```typescript
export type FileType = 'txt' | 'docx' | 'pdf' | 'md' | 'csv'; // Add 'csv'
```

2. Update `constants/diff.constants.ts`:
```typescript
export const VALID_FILE_TYPES: FileType[] = ['txt', 'docx', 'pdf', 'md', 'csv'];
export const FILE_TYPE_EXTENSIONS = '.txt,.docx,.pdf,.md,.csv';
```

3. Add extraction logic in `utils/file.utils.ts`:
```typescript
export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.name.split('.').pop()?.toLowerCase() as FileType | undefined;

  try {
    if (fileType === 'txt' || fileType === 'md') {
      return await file.text();
    } else if (fileType === 'csv') {
      // Add CSV parsing logic here
      const text = await file.text();
      return parseCSV(text);
    }
    // ... rest of the code
  }
};
```

### Adding a New Export Format

Add to `utils/export.utils.ts`:

```typescript
export const exportToMarkdown = (diffResult: DiffResult | null): void => {
  if (!diffResult) return;

  const changes = countChanges(diffResult);
  let markdown = `# Text Diff Result\n\n`;
  markdown += `**Added:** +${changes.added} | **Removed:** -${changes.removed}\n\n`;

  diffResult.hunks.forEach(hunk => {
    hunk.changes.forEach(change => {
      const prefix = change.type === 'added' ? '+' : change.type === 'removed' ? '-' : ' ';
      const line = change.line1 || change.line2 || '';
      markdown += `${prefix} ${line}\n`;
    });
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'diff-result.md';
  a.click();
  URL.revokeObjectURL(url);
};
```

### Adding a New View Mode

1. Update `types/diff.types.ts`:
```typescript
export type ViewMode = 'diff' | 'original' | 'modified' | 'side-by-side';
```

2. Add view logic in `components/DiffViewer.tsx`:
```typescript
if (viewMode === 'side-by-side') {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left side: original */}
      {/* Right side: modified */}
    </div>
  );
}
```

### Creating a New Custom Hook

Example: `hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onCompare?: () => void;
  onExport?: () => void;
  onCopy?: () => void;
}

export const useKeyboardShortcuts = ({
  onCompare,
  onExport,
  onCopy,
}: UseKeyboardShortcutsProps): void => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'Enter':
            e.preventDefault();
            onCompare?.();
            break;
          case 's':
            e.preventDefault();
            onExport?.();
            break;
          case 'c':
            if (e.shiftKey) {
              e.preventDefault();
              onCopy?.();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onCompare, onExport, onCopy]);
};
```

## Modifying Existing Features

### Changing Diff Algorithm Parameters

Edit `constants/diff.constants.ts`:

```typescript
// Increase similarity threshold for stricter matching
export const SIMILARITY_THRESHOLD = 0.6; // was 0.4

// Show more context lines
export const CONTEXT_SIZE = 5; // was 3

// Merge hunks more aggressively
export const MERGE_DISTANCE = 10; // was 6
```

### Customizing PDF Extraction

Edit `constants/diff.constants.ts`:

```typescript
// Adjust column detection sensitivity
export const PDF_COLUMN_THRESHOLD = 150; // was 100

// Change spacing behavior
export const PDF_MAX_SPACES = 15; // was 10
```

### Modifying UI Behavior

Edit `constants/diff.constants.ts`:

```typescript
// Change scroll behavior
export const SCROLL_BEHAVIOR: ScrollBehavior = 'auto'; // was 'smooth'

// Adjust highlight duration
export const HIGHLIGHT_DURATION = 3000; // was 2000 (milliseconds)
```

## Testing

### Unit Testing Example

```typescript
// __tests__/utils/diff.utils.test.ts
import { myersDiff, calculateSimilarity } from '@/app/utils/diff.utils';

describe('myersDiff', () => {
  it('should detect additions', () => {
    const result = myersDiff(['a'], ['a', 'b'], (x) => x);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('equal');
    expect(result[1].type).toBe('added');
  });

  it('should detect removals', () => {
    const result = myersDiff(['a', 'b'], ['a'], (x) => x);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('equal');
    expect(result[1].type).toBe('removed');
  });
});

describe('calculateSimilarity', () => {
  it('should return 1 for identical strings', () => {
    expect(calculateSimilarity('hello', 'hello', false)).toBe(1);
  });

  it('should return 0 for completely different strings', () => {
    expect(calculateSimilarity('abc', 'xyz', false)).toBe(0);
  });
});
```

### Component Testing Example

```typescript
// __tests__/components/FileUploader.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploader } from '@/app/components/FileUploader';

describe('FileUploader', () => {
  it('should switch between file and text mode', () => {
    const onInputModeChange = jest.fn();
    
    render(
      <FileUploader
        file={null}
        text=""
        inputMode="file"
        label="Test"
        color="red"
        onFileChange={() => {}}
        onTextChange={() => {}}
        onInputModeChange={onInputModeChange}
        onRemoveFile={() => {}}
        onClearText={() => {}}
      />
    );

    const textButton = screen.getByText('ข้อความ');
    fireEvent.click(textButton);
    
    expect(onInputModeChange).toHaveBeenCalledWith('text');
  });
});
```

## Common Tasks

### Debugging PDF Extraction

Add logging in `utils/pdf.utils.ts`:

```typescript
const processPage = async (page: any, viewport: any): Promise<string> => {
  const textContent = await page.getTextContent();
  
  // Add debug logging
  console.log('Page items:', textContent.items.length);
  console.log('Viewport:', viewport.width, viewport.height);
  
  // ... rest of the code
};
```

### Optimizing Performance

1. **Memoize expensive computations:**
```typescript
import { useMemo } from 'react';

const diffResult = useMemo(
  () => computeDiffResult(text1, text2, ignoreWhitespace, ignoreEmptyLines),
  [text1, text2, ignoreWhitespace, ignoreEmptyLines]
);
```

2. **Lazy load heavy components:**
```typescript
import dynamic from 'next/dynamic';

const DiffViewer = dynamic(() => import('./components/DiffViewer'), {
  loading: () => <p>Loading...</p>,
});
```

### Adding Internationalization

1. Create language files:
```typescript
// i18n/th.ts
export const th = {
  compare: 'เปรียบเทียบ',
  save: 'บันทึก Session',
  // ...
};

// i18n/en.ts
export const en = {
  compare: 'Compare',
  save: 'Save Session',
  // ...
};
```

2. Use in components:
```typescript
import { useTranslation } from 'next-i18next';

const { t } = useTranslation();
<button>{t('compare')}</button>
```

## Best Practices

1. **Always use TypeScript types** - Don't use `any`
2. **Extract constants** - No magic numbers
3. **Write small functions** - Single responsibility
4. **Use custom hooks** - Reusable logic
5. **Component composition** - Small, focused components
6. **Error handling** - Always handle errors gracefully
7. **Performance** - Use React.memo, useMemo, useCallback when needed
8. **Accessibility** - Add ARIA labels and keyboard support

## Troubleshooting

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build
```

### Type Errors

```bash
# Check TypeScript errors
npx tsc --noEmit
```

### PDF Worker Issues

If PDF extraction fails, check:
1. Worker file exists: `public/pdf.worker.min.mjs`
2. Worker version matches pdfjs-dist version
3. CORS settings allow worker loading

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Getting Help

1. Check existing documentation
2. Search for similar issues
3. Create a detailed bug report with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details
   - Error messages/logs

