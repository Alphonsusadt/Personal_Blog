# 📋 Implementation Checklist

## Phase 1: Backend Setup ✅ (DONE - files created)

- [x] Create `cms/server/routes/media.js` with upload endpoints
- [x] Update `cms/server/index.js` to import and use media routes
- [x] Update `cms/package.json` to add multer dependency
- [x] Add static file serving for /uploads

## Phase 2: Frontend Utilities ✅ (DONE - files created)

- [x] Create `src/utils/media.ts` with core utilities
  - [x] countWords()
  - [x] countChars()
  - [x] stripBase64()
  - [x] extractBase64Images()
  - [x] replaceBase64WithUrl()
  - [x] sanitizeContent()
  - [x] compressImage()
  - [x] etc.

- [x] Create `src/lib/mediaUploader.ts` with upload handler
  - [x] uploadImage()
  - [x] attachUploadHandler()
  - [x] sanitizeContent()
  - [x] etc.

## Phase 3: Environment Setup ⏳ (TODO - do manually)

- [ ] Run: `cd cms && npm install multer`
- [ ] Run: `mkdir -p cms/public/uploads`
- [ ] Update `cms/.env` (optional, but recommended):
  ```
  PUBLIC_URL=http://localhost:5000
  ```

## Phase 4: Integration - WritingEditor ⏳ (TODO - you implement)

File: `src/pages/admin/WritingEditor.tsx`

### Quick Changes (5 minutes):

```typescript
// 1. Add imports (after existing imports)
import { countWords, countChars, sanitizeContent } from '../../utils/media';
import { attachUploadHandler } from '../../lib/mediaUploader';

// 2. Replace lines 48-57 (manual word/char counting) with:
const wordCount = countWords(writing.content);
const characterCount = countChars(writing.content);

// 3. Add new useEffect (after existing useEffects, around line 77):
useEffect(() => {
  if (!textareaRef.current) return;

  const insertImageMarkdown = (imageMarkdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setWriting(prev => ({ ...prev, content: `${prev.content}\n${imageMarkdown}\n` }));
      return;
    }
    const start = textarea.selectionStart;
    const newText = `${textarea.value.substring(0, start)}${imageMarkdown}${textarea.value.substring(start)}`;
    setWriting(prev => ({ ...prev, content: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + imageMarkdown.length;
    });
  };

  attachUploadHandler(textareaRef.current, insertImageMarkdown, {
    onError: (error) => {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error}`);
    },
  });
}, []);

// 4. Update handleSave() - add sanitizeContent() before save:
const handleSave = async () => {
  if (!writing.title || !writing.id) {
    alert('Title and Slug are required');
    return;
  }

  if (writing.status === 'scheduled' && !writing.publishAt) {
    alert('Mohon isi tanggal dan jam publish untuk penjadwalan');
    return;
  }

  setIsSaving(true);
  try {
    // 👇 ADD THIS LINE - sanitize content before save
    const sanitized = await sanitizeContent(writing.content);

    const payload: Writing = {
      ...writing,
      content: sanitized,  // 👈 Use sanitized content
      readTime: `${Math.max(1, Math.ceil(wordCount / 200))} min`,
    };

    if (writing._id) {
      await api.put(`/api/writings/${writing._id}`, payload);
    } else {
      await api.post('/api/writings', payload);
    }
    alert('Writing saved successfully!');
    navigate('/admin/writings');
  } catch (err) {
    console.error('Save failed:', err);
    alert('Failed to save writing');
  } finally {
    setIsSaving(false);
  }
};
```

### Checklist:
- [ ] Added imports
- [ ] Replaced word/char counting
- [ ] Added attachUploadHandler useEffect
- [ ] Updated handleSave with sanitizeContent()
- [ ] Save and test

---

## Phase 5: Integration - ProjectEditor ⏳ (TODO - copy pattern)

File: `src/pages/admin/ProjectEditor.tsx`

**Just follow the same pattern as WritingEditor, but replace:**
- `writing` → `project`
- `/api/writings` → `/api/projects`

Checklist:
- [ ] Added imports
- [ ] Replaced word/char counting
- [ ] Added attachUploadHandler useEffect
- [ ] Updated handleSave with sanitizeContent()
- [ ] Save and test

---

## Phase 6: Integration - BookEditor ⏳ (TODO - copy pattern)

File: `src/pages/admin/BookEditor.tsx`

**Just follow the same pattern as WritingEditor, but replace:**
- `writing` → `book`
- `/api/writings` → `/api/books`

Checklist:
- [ ] Added imports
- [ ] Replaced word/char counting
- [ ] Added attachUploadHandler useEffect
- [ ] Updated handleSave with sanitizeContent()
- [ ] Save and test

---

## Phase 7: Integration - AboutManager ⏳ (TODO - copy pattern)

File: `src/pages/admin/AboutManager.tsx`

**Just follow the same pattern as WritingEditor, but replace:**
- `writing` → `about`
- `/api/writings` → `/api/about`

Checklist:
- [ ] Added imports
- [ ] Replaced word/char counting
- [ ] Added attachUploadHandler useEffect
- [ ] Updated handleSave with sanitizeContent()
- [ ] Save and test

---

## Phase 8: Integration - HomeManager ⏳ (TODO - copy pattern)

File: `src/pages/admin/HomeManager.tsx`

**Just follow the same pattern as WritingEditor, but replace:**
- `writing` → `home`
- `/api/writings` → `/api/home`

Checklist:
- [ ] Added imports
- [ ] Replaced word/char counting
- [ ] Added attachUploadHandler useEffect
- [ ] Updated handleSave with sanitizeContent()
- [ ] Save and test

---

## Phase 9: Testing ⏳ (TODO - verify everything works)

### Backend Tests:
- [ ] Start backend: `cd cms && npm start`
- [ ] Check `/api/media` routes are available
- [ ] Test POST /api/media/upload with Postman
  - [ ] Upload image file
  - [ ] Verify response has imageUrl
  - [ ] Verify file exists in cms/public/uploads/
- [ ] Check MongoDB 'media' collection has metadata

### Frontend Tests (WritingEditor):
- [ ] Start frontend: `npm run dev`
- [ ] Go to /admin/writings
- [ ] Open WritingEditor
- [ ] **Test Paste**:
  - [ ] Copy image from browser
  - [ ] Paste in textarea
  - [ ] Verify image uploads automatically
  - [ ] Verify markdown has URL (not base64)
- [ ] **Test Drag-Drop**:
  - [ ] Drag image file to textarea
  - [ ] Verify uploads automatically
  - [ ] Verify markdown has URL (not base64)
- [ ] **Test Dialog**:
  - [ ] Click upload button in toolbar
  - [ ] Select image
  - [ ] Enter alt text
  - [ ] Click Insert
  - [ ] Verify markdown has URL (not base64)
- [ ] **Test Word Count**:
  - [ ] Upload image
  - [ ] Check word count doesn't change (base64 not counted)
- [ ] **Test Save**:
  - [ ] Edit title
  - [ ] Save
  - [ ] Verify content in database has URL (not base64)
  - [ ] Check MongoDB: db.writings.findOne()

### Integration Tests (Other Sections):
- [ ] Test ProjectEditor same as WritingEditor
- [ ] Test BookEditor same as WritingEditor
- [ ] Test AboutManager same as WritingEditor
- [ ] Test HomeManager same as WritingEditor

---

## Phase 10: Production Deployment ⏳ (TODO - when ready)

- [ ] Update `.env.production` in frontend with correct API URL
- [ ] Update `cms/.env` with production values
  ```
  MONGODB_URI=mongodb+srv://...
  CMS_PORT=5000
  PUBLIC_URL=https://api.yourdomain.com
  ```
- [ ] Configure reverse proxy (Nginx) to serve /uploads
- [ ] Test uploads in production
- [ ] Monitor database size reduction
- [ ] Verify images are accessible from production domain

---

## 📚 Documentation Reference

While implementing, consult:

1. **For step-by-step guidance**: `INTEGRATION_GUIDE.md`
2. **For API reference**: `IMPLEMENTATION_DOCS.md`
3. **For working code example**: `EXAMPLE_COMPLETE_INTEGRATION.tsx`
4. **For architecture overview**: `ARCHITECTURE_DIAGRAM.txt`
5. **For quick start**: `QUICKSTART.md`

---

## ⏱️ Time Estimate

- Backend setup: 5 minutes
- WritingEditor integration: 5 minutes
- Each other section: 3 minutes (copy pattern)
- Testing: 15 minutes
- **Total: ~45 minutes for complete implementation**

---

## ✅ Success Criteria

When everything is done, you should be able to:

1. ✅ Upload image via paste/drag-drop in any editor
2. ✅ See image appear instantly in textarea (as URL, not base64)
3. ✅ Accurate word/character counts (no base64 inflation)
4. ✅ Save content with image URLs (not base64)
5. ✅ Database shows clean URLs, not bloated base64
6. ✅ All 5 sections work identically
7. ✅ Images persist and render correctly

---

## 🎯 Key Reminders

🔑 **The ONE function that makes it all work**: `sanitizeContent(content)`
   - Call this in your `handleSave()` BEFORE saving to database
   - It extracts base64 → uploads → replaces with URLs

🔑 **Utilities are framework-agnostic**:
   - Can be used in any JavaScript project
   - Not locked to React

🔑 **Minimal changes required**:
   - ~10 lines per section
   - Copy pattern from WritingEditor to others

🔑 **No breaking changes**:
   - Existing base64 content still renders
   - New uploads will be URLs
   - Old content can be migrated later if needed

---

## 🆘 If Something Breaks

1. Check backend is running: `cd cms && npm start`
2. Check browser console for errors
3. Check backend console for upload errors
4. Verify `cms/public/uploads/` directory exists
5. Check MongoDB connection: `mongodb://localhost:27017`
6. Check `.env` files have correct values
7. Try uploading single image via Postman to /api/media/upload

---

**Last Updated**: 2026-03-19
**Status**: Ready to implement!
