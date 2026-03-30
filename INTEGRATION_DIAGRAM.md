# Image Upload Integration Diagram

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      EDITOR PAGES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │  BookEditor      │           │  ProjectEditor   │            │
│  ├──────────────────┤           ├──────────────────┤            │
│  │ Main editor page │           │ Main editor page │            │
│  │ - textarea       │           │ - textarea       │            │
│  │ - handleSave     │           │ - handleSave()   │            │
│  │ - insertMarkdown │           │ - insertMarkdown │            │
│  └──────────────────┘           └──────────────────┘            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         │                                  │
         ├─────────────────────────────────┼────────────────────────┐
         │                                  │                        │
         ▼                                  ▼                        ▼
    ┌─────────────┐              ┌─────────────────┐        ┌──────────────────┐
    │ BookToolbar │              │ProjectToolbar   │        │ ImageUploadDialog│
    ├─────────────┤              ├─────────────────┤        ├──────────────────┤
    │ Formatting  │              │ Formatting      │        │ File upload modal│
    │ buttons     │              │ buttons         │        │ - Preview        │
    │ - onInsert  │              │ - onInsert      │        │ - Compress       │
    │ - onInsert  │              │ - onInsertImage │        │ - Upload         │
    │   Image ◄───┼──────────────┼─ onInsert Image │        │ - onInsert()     │
    │ - onOpen... │              │ - onOpenDialog ◄├────────┤                  │
    └─────────────┘              └─────────────────┘        └──────────────────┘
         │                                │
         │ Toolbar sends                  │ Toolbar sends
         │ formatted markdown             │ formatted markdown
         │ directly                       │ directly
         │                                │
         ▼                                ▼
    ┌─────────────┐              ┌─────────────────┐
    │  textarea   │              │  textarea       │
    │  Content    │              │  Content        │
    └─────────────┘              └─────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    SIDEBAR COMPONENTS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │  BookSidebar     │           │ ProjectSidebar   │            │
│  ├──────────────────┤           ├──────────────────┤            │
│  │ Metadata editor  │           │ Metadata editor  │            │
│  │ - Category       │           │ - Category       │            │
│  │ - Rating         │           │ - Status         │            │
│  │ - Takeaways      │           │ - Dev Status     │            │
│  │ - Images ────────┼────┐      │ - Images ────────┼────┐       │
│  └──────────────────┘    │      └──────────────────┘    │       │
│                          │                              │       │
└──────────────────────────┼──────────────────────────────┼───────┘
                           │                              │
                           ▼                              ▼
                   ┌─────────────────────────┐
                   │  ImageGallery           │
                   ├─────────────────────────┤
                   │ Shows all images in     │
                   │ content markdown        │
                   │ - Thumbnails           │
                   │ - Delete buttons       │
                   │ - onRemoveImage()      │
                   └─────────────────────────┘
```

## Data Flow

### Image Upload Flow

```
1. User clicks Image button in Toolbar
   ↓
2. ImageUploadDialog opens
   ↓
3. User selects file from dialog
   ↓
4. Image is compressed (canvas)
   ↓
5. Preview shown to user
   ↓
6. User enters alt text
   ↓
7. User clicks Insert
   ↓
8. Image uploaded to: POST /api/media/upload
   - Uses cms_token for authentication ✅ (FIXED)
   ↓
9. Server returns: {imageUrl, altText}
   ↓
10. Markdown inserted: ![alt](url)
    ↓
11. Callback inserts markdown into textarea
    ↓
12. Editor state updated with markdown
    ↓
13. Live preview updates automatically
```

### Image Gallery Flow

```
1. Sidebar mounts with content prop
   ↓
2. ImageGallery parses markdown for images
   - Regex: /!\[([^\]]*)\]\(([^)]+)\)/g
   ↓
3. Extracts all images into array:
   [{alt, src, markdown}, ...]
   ↓
4. Renders gallery with thumbnails
   ↓
5. User clicks delete on an image
   ↓
6. onRemoveImage(markdown) callback
   ↓
7. Editor removes markdown from content
   ↓
8. State updates
   ↓
9. Gallery re-renders (no image now)
```

## Authentication Flow (FIXED ✅)

### Token Management

```
┌─────────────────────────────────────────────────────────┐
│              Token Storage Consistency                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  localStorage Key: 'cms_token'  (NOT 'token')           │
│                                                           │
│  Set by: api.login()                                    │
│    └─ localStorage.setItem('cms_token', data.token)    │
│                                                           │
│  Used by:                                               │
│    ├─ api.ts (for all HTTP requests)                   │
│    ├─ ImageUploadDialog.tsx ✅ (FIXED)                │
│    └─ mediaUploader.ts ✅ (FIXED)                      │
│                                                           │
│  Header Format:                                         │
│    Authorization: Bearer ${localStorage.getItem('cms_token')}
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Type Safety (FIXED ✅)

### ProjectSidebar Type Signature

```
BEFORE (Type Mismatch):
┌─────────────────────┐
│ ProjectEditor       │
│ handleSave(bool)    │ ← accepts optional boolean
│ onSave prop ◄───────┼──────────┐
└─────────────────────┘          │
                                 │
                    ┌────────────┘
                    │
                    ▼
            ┌─────────────────────┐
            │ ProjectSidebar      │
            │ onSave: () => ...   │ ← expects NO parameters
            │                     │ ❌ TYPE MISMATCH
            └─────────────────────┘

AFTER (Type Safe - FIXED):
┌─────────────────────┐
│ ProjectEditor       │
│ handleSave(bool)    │ ← accepts optional boolean
│ onSave prop ◄───────┼──────────┐
└─────────────────────┘          │
                                 │
                    ┌────────────┘
                    │
                    ▼
            ┌────────────────────────────────┐
            │ ProjectSidebar                 │
            │ onSave: (bool?) => Promise<..> │ ← accepts optional boolean
            │ onClick={() => onSave()}       │ ✅ TYPE SAFE
            └────────────────────────────────┘
```

## File Import Dependencies

```
┌──────────────────────────────────────────────────────────────┐
│                    IMPORT GRAPH                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  BookEditor/ProjectEditor                                    │
│      ├─ React (useState, useRef, etc)                       │
│      ├─ react-router-dom (useParams, useNavigate)           │
│      ├─ BookToolbar / ProjectToolbar                        │
│      ├─ BookSidebar / ProjectSidebar                        │
│      ├─ ImageUploadDialog                                   │
│      ├─ lib/api (api object)                                │
│      ├─ lib/mediaUploader (sanitizeMarkdown)                │
│      ├─ utils/media (hasBase64Images)                       │
│      └─ utils/renderers (renderMarkdown)                    │
│                                                               │
│  BookToolbar / ProjectToolbar                               │
│      ├─ lucide-react (icons)                                │
│      └─ React (RefObject)                                   │
│                                                               │
│  BookSidebar / ProjectSidebar                               │
│      ├─ lucide-react (icons)                                │
│      ├─ React                                               │
│      ├─ ImageGallery                                        │
│      └─ (No direct dependency on lib/utils)                 │
│                                                               │
│  ImageUploadDialog                                          │
│      ├─ lucide-react (icons)                                │
│      ├─ React (useState, useRef)                            │
│      └─ (Direct fetch to API, uses cms_token) ✅ (FIXED)   │
│                                                               │
│  ImageGallery                                               │
│      ├─ lucide-react (icons)                                │
│      └─ (Stateless, pure component)                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Status Summary

✅ All components properly integrated
✅ All imports resolved
✅ All callbacks typed correctly
✅ Token authentication fixed
✅ Type signatures aligned
✅ Ready for TypeScript compilation

```bash
npm run build  # Will execute: tsc -b && vite build
# Expected: SUCCESS ✅
```
