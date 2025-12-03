# Product Requirements Document: DeadDrop Video Upload System

**Version:** 3.3
**Date:** 2025-11-25
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
- Supports folder selection (uploads entire folder with all subfolders and files)
- All file types supported (video, audio, documents, archives, etc.)
- Individual files up to 750GB (Google Drive daily upload limit per file)
- Complete projects unlimited size (multi-hour uploads supported)
- Automatically organizes each upload session into isolated folders
- Preserves original folder structure in Drive
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

**FR-003: Folder Upload**
- System SHALL support folder selection
- System SHALL upload all files within selected folder including all subfolders
- System SHALL preserve original folder structure in Drive
- System SHALL support unlimited folder depth

**FR-004: Large File Support**
- System SHALL support individual files up to 750GB
- System SHALL support unlimited total upload size per session
- System SHALL handle multi-hour uploads without interruption

**FR-005: File Organization**
- System SHALL create unique folder for each upload session
- Folder naming: `{ProjectName}_{YYYY-MM-DD}_{NNN}`
- ProjectName: User-provided or folder name (sanitized)
- Date: Upload date
- Sequential number: Auto-incremented (001, 002, etc.)

**FR-006: Upload Integrity**
- System SHALL verify each file after upload
- Verification SHALL check file size matches original
- Verification SHALL use checksums for integrity validation

**FR-007: Progress Tracking**
- System SHALL display progress per file
- System SHALL display overall batch progress
- System SHALL show upload speed and time remaining
- System SHALL update UI in real-time

**FR-008: Privacy**
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

**TR-003: Browser Compatibility**
- Chrome/Edge: Full support
- Firefox: Full support  
- Safari: Full support (macOS 11.1+, iOS 14.5+)

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
- Minimal scope (drive access for file creation only)
- No server-side file proxy (direct browser-to-Drive upload)

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

**US-001: Client Uploads Video Files**
```
As a law firm client,
I want to upload my entire video project folder,
So that Wildfire Video has all my files organized and ready for editing.

Acceptance Criteria:
- I can click one link to access the upload portal
- I sign in with my Google account
- I select my project folder (not individual files)
- All files and subfolders upload automatically
- I see progress for each file
- I can close my browser and return later
- Upload completes even if my computer sleeps
- I receive confirmation when complete
```

**US-002: Owner Receives Organized Files**
```
As Wildfire Video owner,
I want client uploads organized in separate folders,
So that I can easily find and work with each project.

Acceptance Criteria:
- Each upload session creates new folder
- Folder name includes client/project identifier and date
- Original folder structure is preserved
- Files are verified for integrity
- I can identify who uploaded based on folder timestamp
```

**US-003: Large File Upload**
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
- Folder selection support required (all modern browsers)
- JavaScript File API for large file handling
- Memory limits for very large files (mitigated by chunking)

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

---

## 8. FUTURE ENHANCEMENTS

**Phase 2 (Not in v3.3):**
- Email notification on upload completion
- Upload session persistence (resume after browser close)
- Multi-file parallel upload (currently sequential)
- Admin dashboard for monitoring uploads
- Custom branding per client
- Upload expiration/auto-delete after N days

---

## 9. VERSION HISTORY

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

**For implementation details, see ARCHITECTURE.md**

**END OF PRD**
