# Product Requirements Document: DeadDrop Video Upload System

**Version:** 3.5.13
**Date:** 2026-01-26
**Product Owner:** John
**Target Users:** Law firm clients uploading professional video content to Wildfire Video

---

## 1. PROBLEM STATEMENT

Wildfire Video currently uses a shared Google Drive folder for all client video uploads. This creates two critical problems:

1. **Privacy Risk:** Clients can see each other's marketing content. Law firms competing in the same markets gain visibility into competitor video strategies, which is unacceptable.

2. **File Size Limitations:** Professional 4K video production generates files ranging from small to 2.37GB+ per clip (ProRes 422 HQ at ~4-6GB/minute). Complete projects may contain dozens of files totaling up to 1TB. Current Apps Script-based solutions are limited to ~500MB and single-file uploads, which is inadequate for professional video workflows.

**Reality Check:** Clients already have Google accounts (they're currently uploading to shared Drive folders), so OAuth authentication is acceptable and solves both problems.

---

## 2. SOLUTION

Build a video upload system using Google Drive API with OAuth that:
- Provides ONE upload link for all clients
- Requires Google account authentication (OAuth 2.0)
- Supports file selection (single file, multiple files, or entire folder with subfolders)
- Works on desktop (Windows, Mac, Linux) and mobile (iPhone, Android)
- All file types supported (video, audio, documents, archives, etc.)
- Individual files up to 750GB (Google Drive daily upload limit per file)
- Complete projects unlimited size (multi-hour uploads supported)
- Automatically organizes each upload session into isolated folders
- Preserves original folder structure in Drive (when folder selected)
- Uses naming convention: `{project_name}_{date}_{sequential_number}/`
- Allows users to walk away during multi-hour uploads
- Verifies upload integrity after completion
- Prevents clients from seeing each other's uploads
- Costs $0/month to operate

---

## 3. REQUIREMENTS

### 3.1 Functional Requirements

**FR-001: Single Upload URL**
- System SHALL provide one URL for all clients
- No client-specific tokens or pre-approval required
- URL SHALL remain valid indefinitely
- "Anyone with the link" can access

**FR-002: OAuth Authentication**
- System SHALL use OAuth 2.0
- Users SHALL authenticate with any Google account
- System SHALL NOT require pre-approved test users
- OAuth consent screen SHALL be published to Production

**FR-003: File and Folder Upload**
- System SHALL support single file selection
- System SHALL support multiple file selection
- System SHALL support folder selection (desktop browsers only)
- System SHALL upload all files within selected folder including all subfolders
- System SHALL preserve original folder structure in Drive (when folder selected)
- System SHALL support unlimited folder depth
- Selection method SHALL be transparent to user (one interface adapts to device capability)

**FR-004: Large File Support**
- System SHALL support individual files up to 750GB
- System SHALL support unlimited total upload size per session
- System SHALL handle multi-hour uploads without interruption

**FR-005: File Organization**
- System SHALL create unique folder for each upload session
- Folder naming: `{ProjectName}_{YYYY-MM-DD}_{NNN}`
- ProjectName: User-provided or folder name or first filename (sanitized)
- Date: Upload date
- Sequential number: Auto-incremented (001, 002, etc.)

**FR-006: Upload Integrity**
- System SHALL verify each file after upload
- Verification SHALL check file size matches original
- Verification SHALL use checksums for integrity validation

**FR-007: Privacy**
- Each user's files SHALL upload to owner's Drive (not uploader's Drive)
- Uploaders SHALL NOT have access to other uploads
- Uploaders SHALL NOT have access to Drive folder (view-only for their upload only)

### 3.2 Technical Requirements

**TR-001: Platform**
- Backend: Google Apps Script
- Frontend: HTML + JavaScript
- Storage: Google Drive
- API: Google Drive API v3

**TR-002: OAuth**
- OAuth 2.0 Protocol
- Scope: Drive access (minimal scope for file creation only)
- User type: External
- Publishing status: In production

**TR-003: Browser/Device Compatibility**
- **Desktop (full support - file and folder upload):**
  - Chrome/Edge: Full support
  - Firefox: Full support
  - Safari: Full support (macOS 11.1+)
- **Mobile (file upload only - folder upload not supported by mobile browsers):**
  - iOS Safari: File upload support (iOS 14.5+)
  - Android Chrome: File upload support
  - Note: Mobile browsers do not support folder selection; users select individual files

**TR-004: Deployment**
- Deploy as: Web app
- Execute as: Me (owner)
- Who has access: Anyone

### 3.3 Non-Functional Requirements

**NFR-001: Performance**
- Upload speed: Limited by user's internet connection
- No server-side proxy bottleneck
- Efficient chunking for large files

**NFR-002: Reliability**
- Resumable uploads: Support interruption and continuation
- Token refresh: Automatic handling of OAuth token expiration
- Error handling: Graceful failure with user-friendly messages
- Retry logic: Automatic retry on transient failures

**NFR-003: Security**
- OAuth 2.0 authentication required
- Minimal scope (drive.file + userinfo.email)
- Chunk uploads proxied through Apps Script server (required due to CORS)

**NFR-004: Cost**
- Infrastructure: $0/month (Google Apps Script free tier)
- Storage: Included in owner's Google Drive plan
- Bandwidth: Free (direct browser-to-Drive)

**NFR-005: Maintainability**
- Code documentation: Inline comments + external docs
- Version control: Git repository
- Deployment: Via Apps Script editor

---

## 4. USER STORIES

**US-001: Client Uploads Video Files from Desktop**
```
As a law firm client on a desktop computer,
I want to upload my entire video project folder,
So that Wildfire Video has all my files organized and ready for editing.

Acceptance Criteria:
- I can click one link to access the upload portal
- I sign in with my Google account
- I can select my project folder OR individual files
- All files and subfolders upload automatically (if folder selected)
- I see progress for each file
- I can close my browser and return later
- Upload completes even if my computer sleeps
- I receive confirmation when complete
```

**US-002: Client Uploads Video Files from Mobile**
```
As a law firm client on my iPhone or Android,
I want to upload video files from my device,
So that I can send footage to Wildfire Video without needing a computer.

Acceptance Criteria:
- I can access the upload portal from my mobile browser
- I sign in with my Google account
- I can select one or more files from my device
- Files upload with progress indication
- I receive confirmation when complete
```

**US-003: Owner Receives Organized Files**
```
As Wildfire Video owner,
I want client uploads organized in separate folders,
So that I can easily find and work with each project.

Acceptance Criteria:
- Each upload session creates new folder
- Folder name includes client/project identifier and date
- Original folder structure is preserved (for folder uploads)
- Files are verified for integrity
- I can identify who uploaded based on folder timestamp
```

**US-004: Large File Upload**
```
As a client uploading 4K ProRes video,
I want to upload files up to 750GB each,
So that I don't need to compress or split my professional footage.

Acceptance Criteria:
- Individual files up to 750GB supported
- Upload continues for hours without interruption
- OAuth tokens refresh automatically
- Upload resumes if interrupted
- File integrity verified after upload
```

---

## 5. CONSTRAINTS & LIMITATIONS

**Google Drive API Quotas:**
- 750GB per user per 24 hours (Google's limit)
- Cannot exceed this even with extended uploads
- Users must wait 24 hours if limit reached

**Browser Limitations:**
- Folder selection: Desktop browsers only (Chrome, Firefox, Safari, Edge)
- Mobile browsers: File selection only (no folder upload capability)
- JavaScript File API for large file handling
- Memory limits for very large files (mitigated by chunking)

**Installation Limitations:**
- Google Cloud Console configuration (OAuth credentials, consent screen) requires manual steps
- Cannot be fully automated without account access to customer's Google Workspace organization

---

## 6. SUCCESS METRICS

**Primary Metrics:**
- Upload success rate: >95%
- Average file size: >500MB (validates large file capability)
- User satisfaction: Qualitative feedback from clients

**Secondary Metrics:**
- Upload sessions per month
- Total data uploaded per month
- Average files per upload session
- OAuth authorization success rate
- Mobile vs desktop usage ratio

---

## 7. RISKS & MITIGATION

**Risk 1: OAuth Token Expiration During Long Uploads**
- Mitigation: Implement automatic token refresh mechanism
- No user intervention required during multi-hour uploads

**Risk 2: Browser Tab Closed During Upload**
- Mitigation: Use resumable upload protocol
- Users can return to same upload session
- Session persistence where possible

**Risk 3: User Exceeds 750GB Daily Quota**
- Mitigation: Clear error message explaining quota
- Suggest splitting upload across multiple days
- Document quota limitation in client email

**Risk 4: Apps Script Quota Limits**
- Mitigation: Direct browser-to-Drive upload (no script quota consumed)
- Only folder creation uses Apps Script quota (minimal)

**Risk 5: Installation Errors**
- Mitigation: Clear step-by-step documentation with screenshots
- Troubleshooting section for common errors

**Risk 6: OAuth State Token Errors**
- Mitigation: Improved error handling in authCallback
- User-friendly error messages with recovery instructions
- Documentation of common causes (wrong Script ID in redirect URI)

---

## 8. VERSION HISTORY

**v3.5.13 (2026-01-26):**
- Chunk uploads now proxied through server (CORS fix)
- Added uploadChunk() server function
- Reduced chunk size to 32MB (google.script.run limit)
- Added userinfo.email scope for folder sharing
- Upload starts automatically when files selected
- Changed button text from "Choose" to "Upload"

**v3.5 (2025-01-13):**
- Added mobile device support (iPhone, Android) for file uploads (FR-003, TR-003)
- Added support for single/multiple file selection alongside folder selection (FR-003)
- Added user story for mobile upload (US-002)
- Added OAuth state token error risk and mitigation

**v3.4 (2025-12-01):**
- Moved folder hierarchy creation from server-side to client-side
- Fixes timeout errors with large folder structures (7000+ folders)

**v3.3 (2025-11-25):**
- No requirements changes
- Implementation changed to server-side OAuth (see ARCHITECTURE.md for details)

**v3.2 (2025-11-17):**
- Added folder upload requirement (FR-003)
- Added unlimited upload duration (FR-004)
- Added folder structure preservation (FR-003)

**v3.1 (Previous):**
- Initial requirements for multiple file upload
- OAuth authentication
- Large file support

---

## 9. GLOSSARY

- **Google Workspace organization:** The customer's Google account domain (equivalent to "tenant" in Microsoft terminology)
- **OAuth consent screen:** Google's authorization page shown to users when they sign in

---

**For implementation details, see ARCHITECTURE.md**

**END OF PRD**
