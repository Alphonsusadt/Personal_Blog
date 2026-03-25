# Base64 Image Upload - Architecture Diagrams

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CMS Frontend (React)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────┐      ┌──────────────────────────┐          │
│  │  WritingEditor      │      │  ImageUploadDialog       │          │
│  │  ProjectEditor      │◄─────►│                          │          │
│  │  BookEditor         │      │  - File selection        │          │
│  └─────────────────────┘      │  - Compression           │          │
│           │                   │  - Preview               │          │
│           │ save()            │  - Server upload (NEW)   │          │
│           │                   └──────────────────────────┘          │
│           │                                                          │
│           ├─ hasBase64Images()?                                     │
│           │    YES ─► sanitizeMarkdown(content) ──┐                 │
│           │    NO  ─────────────────────────────┬─┘                │
│           │                                     │                   │
│           └─────────────────────────────────────►                  │
│                                                   │                  │
│                    ┌──────────────────────────────┘                │
│                    │ payload with clean URLs                        │
│                    ▼                                                │
│         ┌──────────────────────┐                                   │
│         │   Save to Database   │                                   │
│         │   (MongoDB)          │                                   │
│         └──────────────────────┘                                   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
         │
         │ HTTP Requests
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Express.js Backend (Node)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  Media Routes                                        │           │
│  │  ┌─────────────────────────────────────────────┐    │           │
│  │  │ POST /api/media/upload                      │    │           │
│  │  │  • Validate image type & size               │    │           │
│  │  │  • Save to /public/uploads/                 │    │           │
│  │  │  • Store metadata in MongoDB                │    │           │
│  │  │  • Return image URL                         │    │           │
│  │  └─────────────────────────────────────────────┘    │           │
│  │  ┌─────────────────────────────────────────────┐    │           │
│  │  │ GET /api/media/list                         │    │           │
│  │  │ DELETE /api/media/:filename                 │    │           │
│  │  │ POST /api/media/batch-upload                │    │           │
│  │  └─────────────────────────────────────────────┘    │           │
│  └──────────────────────────────────────────────────────┘           │
│           │                                                          │
│           ├─► MongoDB (media collection)                           │
│           │                                                          │
│           └─► Filesystem (/public/uploads/)                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Image Upload Flow (New)

```
START: User clicks "Upload Foto"
  │
  ├─► ImageUploadDialog opens
  │   • Displays file input
  │   • Shows preview area
  │
  ├─► User selects image
  │   • Validates file type (must be image/*)
  │   • Validates file size (max 5MB)
  │
  ├─► Compression happens
  │   • Load image into canvas
  │   • Resize to max 800px (maintain aspect ratio)
  │   • Compress to JPEG quality 0.8
  │   • Result: ~80% smaller than original
  │   • Shows preview to user
  │
  ├─► User enters alt text (required)
  │   • Important for accessibility
  │   • Used as filename prefix
  │
  ├─► User clicks "Insert" button
  │   • Dialog shows "Uploading..." state
  │   • Converts compressed image to Blob
  │   • Creates FormData with file + altText
  │
  ├─► Upload to server
  │   POST /api/media/upload
  │   Headers: Authorization: Bearer {token}
  │   Body:
  │   - file: Blob (compressed JPEG)
  │   - altText: string
  │
  ├─► Server processes
  │   • Validates auth token
  │   • Validates MIME type again
  │   • Generates unique filename: TIMESTAMP-RANDOM.jpg
  │   • Saves to /public/uploads/
  │   • Records metadata in MongoDB media collection
  │   • Constructs image URL
  │
  ├─► Server responds
  │   {
  │     "success": true,
  │     "imageUrl": "http://localhost:5000/uploads/1705316400000-abc.jpg",
  │     "altText": "user provided alt text",
  │     "fileName": "1705316400000-abc.jpg",
  │     "uploadedAt": "2024-01-15T10:30:00Z"
  │   }
  │
  ├─► Frontend receives response
  │   • Extracts imageUrl
  │   • Creates markdown: ![alt](URL)  ← NOT base64! ✅
  │   • Inserts into editor
  │
  ├─► Dialog closes & resets
  │   • Clears preview
  │   • Clears alt text input
  │   • Returns to initial state
  │
  └─► Content now saved with clean URL
      Markdown:
      ![alt text](http://localhost:5000/uploads/1705316400000-abc.jpg)
      
      NOT:
      ![alt text](data:image/jpeg;base64,/9j/4AAQ...)
```

## 3. Base64 Sanitization Flow (Existing Content)

```
START: User saves writing/project/book
  │
  ├─► handleSave() is called
  │   • Validates title, slug, etc.
  │
  ├─► Check: hasBase64Images(payload.content)?
  │   │
  │   YES ──► Trigger sanitization
  │   │      call sanitizeMarkdown(content)
  │   │
  │   NO  ──► Skip to regular save
  │
  ├─► Sanitization Process
  │   │
  │   ├─► Extract all base64 images
  │   │   Regex: /!\[([^\]]*)\]\((data:[^)]*)\)/g
  │   │   Result: Array of {altText, base64Data}
  │   │
  │   ├─► For each base64 image:
  │   │   │
  │   │   ├─► Convert base64 to File object
  │   │   │   • Split data URL: "data:image/jpeg;base64,DATA"
  │   │   │   • Decode base64 to bytes
  │   │   │   • Create Blob with MIME type
  │   │   │   • Wrap in File object
  │   │   │
  │   │   ├─► Upload via /api/media/upload
  │   │   │   POST to server with File
  │   │   │   Get back imageUrl
  │   │   │
  │   │   ├─► Record mapping
  │   │   │   {
  │   │   │     'data:image/jpeg;base64,...': 'http://localhost:5000/uploads/file1.jpg'
  │   │   │   }
  │   │   │
  │   │   └─► Report progress
  │   │       (1/5 images uploaded, 2/5 images uploaded, etc.)
  │   │
  │   ├─► Replace all base64 with URLs
  │   │   For each mapping:
  │   │   - Find markdown: ![alt](base64)
  │   │   - Replace with: ![alt](url)
  │   │
  │   ├─► Handle errors gracefully
  │   │   • If individual image fails: skip and continue
  │   │   • If all fail: show warning but continue to save
  │   │   • Never lose content due to upload failures
  │   │
  │   └─► Return sanitized content
  │       All base64 replaced with URLs ✅
  │
  ├─► Save payload to database
  │   • Content now contains URLs, not base64
  │   • MongoDB stores clean data
  │   • Images are served from /public/uploads/
  │
  ├─► Success message
  │   "Writing saved successfully!"
  │   (User doesn't need to know sanitization happened)
  │
  └─► User navigated to list view
      (Content is now clean and performant)

RESULT: Old base64 images automatically migrated to URLs!
```

## 4. Data Flow - What Changes in Database

```
BEFORE (with base64):
┌─────────────────────────────────────────────────────┐
│ MongoDB: writings collection                         │
├─────────────────────────────────────────────────────┤
│ {                                                   │
│   "_id": "...",                                     │
│   "title": "My Article",                           │
│   "content": "# Introduction\n\n               │
│              ![screenshot](data:image/jpeg;base64,  │
│              /9j/4AAQSkZJRgABA...                   │
│              [2.5 MB of base64 characters]          │
│              ...)\n\n## Body...",    ← HUGE! ❌   │
│   "status": "published"                             │
│ }                                                   │
│                                                     │
│ Document size: ~2.5 MB (just for 3 images!)        │
└─────────────────────────────────────────────────────┘

AFTER (with URLs):
┌─────────────────────────────────────────────────────┐
│ MongoDB: writings collection                         │
├─────────────────────────────────────────────────────┤
│ {                                                   │
│   "_id": "...",                                     │
│   "title": "My Article",                           │
│   "content": "# Introduction\n\n               │
│              ![screenshot]                          │
│              (http://localhost:5000/                │
│               uploads/1705316400000-abc.jpg)\n\n   │
│              ## Body...",                    ← 520 B! ✅
│   "status": "published"                             │
│ }                                                   │
│                                                     │
│ MongoDB: media collection (metadata)                │
├─────────────────────────────────────────────────────┤
│ {                                                   │
│   "_id": "...",                                     │
│   "filename": "1705316400000-abc.jpg",             │
│   "originalName": "screenshot.jpg",                 │
│   "url": "http://localhost:5000/uploads/...",      │
│   "size": 45230,                                   │
│   "mimetype": "image/jpeg",                        │
│   "uploadedAt": "2024-01-15T10:30:00Z",           │
│   "uploadedBy": "user123"                          │
│ }                                                   │
│                                                     │
│ Filesystem: /public/uploads/                       │
├─────────────────────────────────────────────────────┤
│ 1705316400000-abc.jpg (45 KB)                      │
│ 1705316400001-def.jpg (52 KB)                      │
│ 1705316400002-ghi.jpg (38 KB)                      │
└─────────────────────────────────────────────────────┘

SIZE COMPARISON:
Before: 2.5 MB (base64 in document)
After:  520 B  (content) + 45 KB (filesystem)
        = 45.5 KB TOTAL ✅
        
REDUCTION: 2.5 MB → 45.5 KB = 98.2% smaller! 🎉
```

## 5. Component Interaction Diagram

```
┌──────────────────────────────────────┐
│   React Components                    │
├──────────────────────────────────────┤
│                                      │
│  WritingEditor                       │
│  ├─ handleSave()                     │
│  ├─ insertImageMarkdown()            │
│  └─ [NEW] sanitizes base64           │
│         │                            │
│         ▼                            │
│  ImageUploadDialog                   │
│  ├─ [NEW] uploads to server          │
│  ├─ handleFileSelect()               │
│  ├─ handleInsert() [CHANGED]         │
│  └─ shows progress                   │
│         │                            │
│         ▼                            │
│  projectEditor, bookEditor           │
│  (same pattern)                      │
│                                      │
└──────────────────────────────────────┘
         │
         │ use
         │
┌──────────────────────────────────────┐
│   Utility Functions                   │
├──────────────────────────────────────┤
│                                      │
│  src/lib/mediaUploader.ts            │
│  ├─ uploadImage()                    │
│  ├─ uploadImages()                   │
│  ├─ sanitizeContent() [FIXED]        │
│  ├─ [NEW] sanitizeMarkdown()         │
│  ├─ attachUploadHandler()            │
│  └─ prepareImageUpload()             │
│         │                            │
│         ▼                            │
│  src/utils/media.ts                  │
│  ├─ extractBase64Images()            │
│  ├─ replaceBase64WithUrl()           │
│  ├─ [NEW] hasBase64Images()          │
│  ├─ [NEW] getBase64ImageCount()      │
│  ├─ stripBase64()                    │
│  ├─ compressImage()                  │
│  └─ validateFile()                   │
│         │                            │
│         ▼                            │
│  src/lib/api.ts                      │
│  └─ fetch() calls                    │
│                                      │
└──────────────────────────────────────┘
         │
         │ HTTP
         │
┌──────────────────────────────────────┐
│   Express.js Backend                  │
├──────────────────────────────────────┤
│                                      │
│  cms/server/routes/media.js          │
│  ├─ POST /api/media/upload           │
│  ├─ POST /api/media/batch-upload     │
│  ├─ GET /api/media/list              │
│  └─ DELETE /api/media/:filename      │
│         │                            │
│         ├─► MongoDB (metadata)       │
│         └─► Filesystem (images)      │
│                                      │
└──────────────────────────────────────┘
```

## 6. Sanitization State Machine

```
                      START
                        │
                        ▼
        ┌───────────────────────────┐
        │ User clicks Save Button    │
        └───────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────┐
        │ Validate content exists   │
        └───────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────────┐
        │ hasBase64Images(content)?             │
        └──────────────────────────────────────┘
                    │           │
                   YES          NO
                    │           │
        ┌───────────▼           │
        │ Start Sanitization    │
        │ (show loading state)  │
        │                       │
        │ Extract base64        │
        │ images from content   │
        │                       │
        ├─ For each image:      │
        │  ├─ Convert to blob   │
        │  ├─ Upload to server  │
        │  └─ Get URL back      │
        │                       │
        │ Replace all base64    │
        │ with URLs             │
        │                       │
        │ Return clean content  │
        └─────────┬─────────────┤
                  │             │
                  └──────┬──────┘
                         │
                         ▼
        ┌───────────────────────────┐
        │ Create payload            │
        │ {content: clean}          │
        └───────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────┐
        │ Save to database          │
        │ api.post() or api.put()   │
        └───────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────┐
        │ Success!                  │
        │ Navigate to list view     │
        └───────────────────────────┘
                        │
                        ▼
                      END
```

## 7. Error Handling Flow

```
Upload Error Scenarios:
│
├─ FILE TYPE ERROR (not an image)
│  └─► setError('File harus berupa gambar')
│      └─► Show error in dialog, user can retry
│
├─ FILE SIZE ERROR (> 5MB)
│  └─► setError('Ukuran file maksimal 5MB')
│      └─► Show error in dialog, user can retry
│
├─ AUTH ERROR (401 Unauthorized)
│  └─► Response: 401, error: 'Unauthorized'
│      └─► setError('Authentication failed')
│          └─► User must login again
│
├─ NETWORK ERROR (connection failed)
│  └─► fetch() throws error
│      └─► catch block: setError('Upload gagal')
│          └─► Show error, user can retry
│
├─ SERVER ERROR (500)
│  └─► Response: 500, error: 'Internal error'
│      └─► setError(error.message)
│          └─► Show error, user can retry
│
└─ SANITIZATION ERROR (during save)
   ├─ Some images fail to upload
   │  └─► Skip failed images, continue with others
   │      └─► Successful ones still get replaced
   │
   └─ All images fail
      └─► Show warning: "Beberapa gambar gagal..."
          └─► Still save content with remaining base64
              └─► User can retry sanitization later

PRINCIPLE: Never lose user content due to image upload failures ✅
```

## 8. Performance Timeline

```
OPERATION TIMELINE:

New Image Upload:
├─ File selection:              ~100 ms
├─ Compression (canvas):        ~500 ms
├─ Preview rendering:           ~100 ms
├─ Upload to server:            ~1-5 seconds (network dependent)
├─ Server processing:           ~200 ms
├─ Response received:           ~1-5 seconds (network dependent)
├─ Markdown inserted:           ~50 ms
└─ Total end-to-end:            ~2-11 seconds ✅

Base64 Sanitization (3 images):
├─ Extract patterns:            ~50 ms
├─ Convert each to blob:        ~150 ms (×3) = 450 ms
├─ Upload each:                 ~1-5 seconds (×3) = 3-15 seconds
├─ Replace in content:          ~100 ms
└─ Total end-to-end:            ~3.6-15.6 seconds ✅

Database operations:
├─ Save to MongoDB:             ~50-200 ms
└─ Return to UI:                ~10 ms

Network time dominates. Local testing much faster than production.
```

---

**All diagrams show the complete flow from user action to persistent storage.**
