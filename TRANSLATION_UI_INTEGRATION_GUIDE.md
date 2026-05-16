# Translation System - UI Integration Guide

## Overview
This guide shows how to integrate the translation UI components into your existing editors (WritingEditor, ProjectEditor, BookEditor).

## Step 1: Add Translation Components to Editor Sidebars

### In WritingEditor.tsx

```tsx
import { TranslationButtonGroup } from '@/components/TranslationButtonGroup';
import { TranslationStatusBadge } from '@/components/TranslationStatusBadge';

export function WritingEditor({ writingId }: Props) {
  const [writing, setWriting] = useState<Writing | null>(null);
  const [translationStatus, setTranslationStatus] = useState(null);

  const handleTranslationComplete = (result) => {
    // Refresh content from database
    fetchWriting(writingId);
    
    // Update UI state
    setTranslationStatus({
      status: 'completed',
      method: result.method,
      language: result.sourceLanguage === 'id' ? 'en' : 'id',
    });

    // Show toast
    showToast('success', `Translation completed with ${result.model || 'Google'}`);
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Editor panel */}
      <div className="col-span-2">
        {/* existing editor UI */}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Translation Section */}
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <h3 className="text-sm font-semibold mb-3">Translation</h3>
          
          <TranslationButtonGroup
            postId={writingId}
            contentType="writing"
            onTranslationStart={(action) => {
              console.log(`Started: ${action}`);
            }}
            onTranslationComplete={handleTranslationComplete}
            onError={(error) => {
              showToast('error', error);
            }}
          />

          {translationStatus && (
            <div className="mt-3">
              <TranslationStatusBadge
                status={translationStatus.status}
                method={translationStatus.method}
                language={translationStatus.language}
                onRollback={() => {
                  // Implement rollback logic here
                  showToast('info', 'Rollback not yet implemented');
                }}
              />
            </div>
          )}
        </div>

        {/* Other sidebar sections */}
      </div>
    </div>
  );
}
```

### In ProjectEditor.tsx

Same pattern as WritingEditor:

```tsx
<div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
  <h3 className="text-sm font-semibold mb-3">Translation</h3>
  
  <TranslationButtonGroup
    postId={projectId}
    contentType="project"
    onTranslationComplete={(result) => {
      fetchProject(projectId);
      showToast('success', `Translated to ${result.targetLanguage}`);
    }}
    onError={(error) => showToast('error', error)}
  />

  {/* Translation status if needed */}
</div>
```

### In BookEditor.tsx

```tsx
<div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
  <h3 className="text-sm font-semibold mb-3">Translation</h3>
  
  <TranslationButtonGroup
    postId={bookId}
    contentType="book"
    onTranslationComplete={(result) => {
      fetchBook(bookId);
      showToast('success', 'Book translated');
    }}
    onError={(error) => showToast('error', error)}
  />
</div>
```

---

## Step 2: Update Database Collections

Add two optional fields to writings, projects, and books collections:

```javascript
// Migration script (run once in MongoDB)
db.writings.updateMany(
  {},
  {
    $set: {
      translationStatus: null,
      translationMetadata: null,
    }
  }
);

db.projects.updateMany(
  {},
  {
    $set: {
      translationStatus: null,
      translationMetadata: null,
    }
  }
);

db.books.updateMany(
  {},
  {
    $set: {
      translationStatus: null,
      translationMetadata: null,
    }
  }
);
```

**Optional Fields** (added by translation routes automatically):
- `translationStatus`: 'pending' | 'completed' | 'failed' | null
- `translationMetadata`: { method, language, timestamp }

---

## Step 3: Create a Toast/Notification System

If you don't have one already:

```tsx
// src/lib/toast.ts
import { toast } from 'sonner'; // or your toast library

export const showToast = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast.info(message),
  loading: (message: string) => toast.loading(message),
};
```

---

## Step 4: Handle Content Refresh

When translation completes, refresh content:

```tsx
const handleTranslationComplete = async (result) => {
  // Re-fetch from server to get updated translations
  const updated = await fetch(`/api/writings/${writingId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  // Update UI with new title/content
  setWriting(updated);

  // The editor will auto-detect localized content and display accordingly
  showToast.success('Translation complete! Content updated.');
};
```

---

## Step 5: Display Localized Content

Your editors likely already handle LocalizedText. Ensure they:

1. **Detect language** from user context or localStorage
2. **Resolve LocalizedText** by primary language, then fallback
3. **Display appropriate version** in editor

```tsx
// In editor input
const displayText = resolveLocalizedText(writing.title, currentLanguage);
// Result: if currentLanguage='en' and writing.title has both {en, id}, show en version
```

---

## Step 6: Update Component Exports

Add new components to your component barrel export:

```tsx
// src/components/index.ts
export { TranslationButtonGroup } from './TranslationButtonGroup';
export { TranslationStatusBadge } from './TranslationStatusBadge';
export { /* other exports */ } from './...';
```

---

## Usage Examples

### Example 1: Simple Integration

```tsx
import { TranslationButtonGroup } from '@/components';

<TranslationButtonGroup
  postId={writingId}
  contentType="writing"
  onTranslationComplete={(result) => {
    refetch();
    toast.success('Translated successfully');
  }}
  onError={(error) => {
    toast.error(error);
  }}
/>
```

### Example 2: With Loading State

```tsx
const [loading, setLoading] = useState(false);

<TranslationButtonGroup
  postId={writingId}
  contentType="writing"
  disabled={loading}
  onTranslationStart={() => setLoading(true)}
  onTranslationComplete={(result) => {
    setLoading(false);
    refetch();
  }}
  onError={(error) => {
    setLoading(false);
    toast.error(error);
  }}
/>
```

### Example 3: With Status Badge

```tsx
const [status, setStatus] = useState(null);

<>
  <TranslationButtonGroup
    postId={writingId}
    contentType="writing"
    onTranslationComplete={(result) => {
      setStatus({
        status: 'completed',
        method: result.method,
        language: 'en',
      });
      refetch();
    }}
  />
  
  {status && <TranslationStatusBadge {...status} />}
</>
```

---

## Styling Notes

The components use Tailwind CSS utility classes:

- **Button colors**: Blue (Translate), Purple (Hybrid), Pink (Smart AI)
- **Status colors**: Green (completed), Yellow (pending), Red (failed)
- **Icon sizes**: w-3 h-3 for buttons, w-4 h-4 for status badge

Adjust if your design system differs:

```tsx
// Example: Override button classes
<button className="custom-button-class">
  {loading ? '...' : 'Translate'}
</button>
```

---

## API Response Handling

All translation endpoints return:

```typescript
{
  success: boolean;
  title?: string;           // Translated title
  content?: string;         // Translated content
  method?: string;          // 'google_translate' | 'hybrid' | 'smartai'
  model?: string;           // Model used (e.g., 'llama-2-70b-chat')
  duration?: number;        // Milliseconds
  characterUnified?: boolean; // Only for smartai
  error?: string;           // Error message if !success
}
```

---

## Testing the Integration

1. **Start CMS server**: `npm run dev` in cms/
2. **Start frontend**: `npm run dev` in root/
3. **Open writing/project/book editor**
4. **Click "Translate" button**
5. **Verify**:
   - ✅ Loading spinner appears
   - ✅ Model name displayed
   - ✅ Success toast after 1-5 seconds
   - ✅ Content in sidebar shows updated status
   - ✅ Refresh page: content persists (saved to DB)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Button disabled | Check `disabled` prop or loading state |
| No response | Verify CMS server is running on :5001 |
| 401 Unauthorized | Check `cms_token` in localStorage |
| 429 Rate Limited | Wait 60 seconds, then retry |
| 503 Service Error | All models failed; check API keys in .env |
| Toast not showing | Ensure toast provider wrapped around app |

---

## Optional Enhancements

### 1. Auto-Refresh Content
```tsx
onTranslationComplete={async (result) => {
  // Auto-fetch updated content
  const response = await fetch(`/api/writings/${writingId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const updated = await response.json();
  setWriting(updated);
}}
```

### 2. Track Translation History
```tsx
const [history, setHistory] = useState([]);

onTranslationComplete={(result) => {
  setHistory(prev => [...prev, {
    timestamp: new Date(),
    method: result.method,
    model: result.model,
  }]);
}
```

### 3. Keyboard Shortcut
```tsx
useEffect(() => {
  const handleKeyPress = (e) => {
    if (e.ctrlKey && e.key === 't') {
      handleTranslate('hybrid'); // Quick hybrid translate
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

---

**Integration Time**: ~15 minutes for basic setup
**Optional Enhancements**: +5-10 minutes each
