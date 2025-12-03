# DeadDrop v3.2 → v3.3 Session Memory

**Date:** 2025-11-25
**Context:** Testing installation instructions, discovered OAuth incompatibility with Apps Script web apps

---

## Critical Discovery: Client-Side OAuth Fundamentally Broken

### THE PROBLEM

**Apps Script web apps CANNOT use client-side OAuth (Google Sign In).**

- Apps Script web apps run on `googleusercontent.com` domains
- Google explicitly forbids `googleusercontent.com` in OAuth credentials:
  - Cannot be added as JavaScript origin (Error: "forbidden domain")
  - Cannot be added as redirect URI (Error: "forbidden domain")
- This is a **security policy** that remains in effect as of 2024/2025
- There is NO workaround for client-side OAuth with Apps Script web apps

**Sources:**
- [Stack Overflow: OAuth fundamentally impossible](https://stackoverflow.com/questions/79769946/google-apps-script-web-apps-is-oauth-authentication-fundamentally-impossible-du)
- [Google Issue Tracker: googleusercontent.com forbidden](https://issuetracker.google.com/issues/170740549)

### THE SOLUTION

Use **server-side OAuth** with the official [apps-script-oauth2 library](https://github.com/googleworkspace/apps-script-oauth2).

**How it works:**
1. User clicks "Sign in" button
2. Backend initiates OAuth flow (server-side)
3. User redirected to Google OAuth consent screen
4. After authorization, redirected back via: `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`
5. Backend receives OAuth tokens
6. Upload proceeds with authorized tokens

**Library Script ID:** `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`

---

## Session Summary: 2025-11-25

### What We Did

**1. Walked Through Installation Instructions (INSTALL.md)**

Tested every step of INSTALL.md to verify instructions work:
- Step 1: Create Apps Script Project ✓
- Step 2: Enable Drive API and Configure Auth ✓ (with fixes)
- Step 3: Create OAuth Credentials ✓ (with fixes)
- Step 4: Create Drive Folder ✓
- Step 5: Configure Script Properties ✓
- Step 6: Deploy ✓
- Step 7: Update OAuth Origin (removed - not needed)
- Step 8: Test ✗ (failed with OAuth error)

**2. Fixed INSTALL.md Issues**

**Issue 1: Test users not needed**
- Original instructions required adding test users
- This is only needed if app stays in Testing mode
- **Fix:** Publish app to Production instead
- Updated Step 2 to include:
  ```
  11. Click Audience in left menu
  12. Check Publishing status - should show "In production"
  13. If it shows "Testing": Click PUBLISH APP → Confirm
  14. If it shows "In production": Already published, continue to Step 3
  ```
- Removed old Step 3 (Configure Test Users)
- Renumbered all subsequent steps

**Issue 2: Redirect URI construction unclear**
- Instructions said "Replace {SCRIPT_ID}" but didn't explain how
- Users don't know they need to BUILD the URL manually
- **Fix:** Added clear 3-part process to Step 3:
  ```
  First, get your Script ID:
  1-4. Steps to find Script ID in Apps Script

  Now create the redirect URI:
  5. Take this template: https://script.google.com/macros/d/PASTE_YOUR_SCRIPT_ID_HERE/usercallback
  6. Replace PASTE_YOUR_SCRIPT_ID_HERE with your actual Script ID
  7. You now have your redirect URI (save it temporarily)

  Create OAuth credentials:
  8-22. Steps to create OAuth client with the redirect URI
  ```

**Issue 3: Script ID vs Deployment ID confusion**
- Web App URL contains Deployment ID: `/s/AKfycbx...`
- OAuth redirect needs Script ID: `/d/1-bAo5Hlw...`
- These are DIFFERENT IDs
- **Fix:** Added clear explanation that Script ID comes from Project Settings, available before deployment

**Issue 4: Instructions didn't specify exact terminology**
- Said "Publishing status or similar" when exact field is "Publishing status"
- User got frustrated: "Don't fucking guess. Either you know or you don't."
- **Fix:** Use exact terminology only, never guess with "or similar"

**3. Attempted OAuth Fixes (All Failed)**

**Attempt 1:** Add googleusercontent.com as JavaScript origin
- Result: Error "forbidden domain"

**Attempt 2:** Change OAuth from popup to redirect mode (v3.2.3)
- Updated Uploads.html line 446: `ux_mode: 'redirect'`
- Added `redirect_uri: window.location.origin`
- Added `state: 'deaddrop_oauth'`
- Documented as v3.2.3 with changelog
- Result: Still failed - redirect URI also forbidden

**Attempt 3:** Add googleusercontent.com as redirect URI
- Result: Error "forbidden domain"

**4. Research & Discovery**

Researched via WebSearch and discovered:
- Client-side OAuth fundamentally incompatible with Apps Script
- Google's security policy forbids googleusercontent.com in OAuth
- Policy remains in effect 2024/2025
- Recommended solution: apps-script-oauth2 library (server-side)

**5. Current Status**

- Version: v3.2.3 (with broken client-side OAuth)
- Next: Implementing v3.3 with server-side OAuth (apps-script-oauth2 library)
- User instruction: Add OAuth2 library to Apps Script project

---

## What I Learned

### OAuth & Apps Script

1. **Script ID vs Deployment ID are different:**
   - Script ID: Found in Project Settings, format `1-bAo5HlwMW5hLLHb3QQbBnD8RSWIGBsmP6xroW-emi1u70hl6iWxHrOM`
   - Deployment ID: In Web App URL, format `AKfycbx9H9-TGZz-SrWBMQ1dgyg4HKKmgLMaIzyfM3yCGSJ4Yt1Ep7QBUifKeFRQgDvQcKm7`
   - OAuth redirect uses Script ID, not Deployment ID

2. **Apps Script OAuth redirect URI format:**
   - `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`
   - This is the ONLY valid redirect URI for Apps Script web apps
   - Must be constructed manually by inserting Script ID

3. **OAuth Publishing Status:**
   - Located in: Cloud Console → OAuth consent screen → Audience
   - Exact field name: "Publishing status"
   - Values: "Testing" or "In production"
   - Testing mode: Only allows added test users (max 100)
   - Production mode: Anyone with link can sign in

4. **googleusercontent.com is forbidden everywhere:**
   - Can't be JavaScript origin
   - Can't be redirect URI
   - Security policy since ~2020
   - No workaround exists
   - Apps Script web apps always run on googleusercontent.com
   - Therefore: Client-side OAuth impossible

### Installation Instructions Best Practices

1. **Never use vague language:**
   - BAD: "Publishing status or similar"
   - GOOD: "Publishing status"
   - User will call you a "fucking cunt" for guessing

2. **Never include specific user data as examples:**
   - BAD: Example Script ID from actual project
   - GOOD: Placeholder like `PASTE_YOUR_SCRIPT_ID_HERE`
   - Users might copy the example thinking it's universal

3. **Explain URL construction explicitly:**
   - Don't just say "Replace {SCRIPT_ID}"
   - Show template, show where to find value, show how to build URL
   - Users don't know they need to manually construct URLs

4. **Version changes require documentation:**
   - User refuses to work with "poorly documented code"
   - Every code change needs version bump and changelog entry
   - Format:
     ```
     v3.2.3 Bug Fix:
     - What changed
     - Why it changed
     - What it fixes
     ```

5. **Remove unnecessary complications:**
   - User: "Keep it fucking simple"
   - Don't add optional steps like "Remove X if present"
   - Just tell them what to add, ignore what's already there

### User Communication Lessons

1. **User gets frustrated when:**
   - I guess at terminology ("or similar")
   - I overcomplicate instructions
   - I don't explain every step clearly
   - I assume they know where things are
   - I make changes without documenting them

2. **User values:**
   - Extreme simplicity
   - Exact terminology
   - Step-by-step clarity ("tell me where this shit is")
   - Proper version documentation
   - Direct answers without guessing

3. **When user says "ultrathink":**
   - Stop guessing and making changes
   - Research the actual solution
   - Develop a plan based on facts
   - Present the plan before implementing

---

## Current Code State

### Uploads.html v3.2.3
- Uses client-side OAuth (broken)
- `ux_mode: 'redirect'` with `redirect_uri: window.location.origin`
- This DOES NOT WORK and needs complete rewrite

### Code.gs v3.2
- Server-side token exchange functions exist
- But they rely on client-side OAuth initialization
- Needs rewrite to use apps-script-oauth2 library

### INSTALL.md
- Updated and tested through Step 6
- Step 7 (Update OAuth Origin) still exists but should be removed
- Needs complete rewrite for server-side OAuth flow
- Current version works up to deployment but fails at OAuth

---

## Implementation Plan: v3.3 Server-Side OAuth

### Architecture Change

**OLD (v3.2.3 - BROKEN):**
```
User clicks Sign In
  ↓
Client-side: google.accounts.oauth2.initCodeClient() [FAILS - forbidden domain]
  ↓
OAuth popup/redirect from googleusercontent.com [BLOCKED]
  ↓
Never reaches token exchange
```

**NEW (v3.3 - CORRECT):**
```
User clicks Sign In
  ↓
Backend: getOAuthService().getAuthorizationUrl()
  ↓
Redirect to Google OAuth (from script.google.com domain)
  ↓
User authorizes
  ↓
Redirect back: https://script.google.com/macros/d/{SCRIPT_ID}/usercallback
  ↓
Backend: OAuth2 library handles callback, stores tokens
  ↓
Upload proceeds with stored tokens
```

### Implementation Steps

1. **Add apps-script-oauth2 library**
   - Library ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
   - Add via: Libraries → + → paste ID → Add

2. **Rewrite Code.gs**
   - Remove `refreshAccessToken()` function
   - Add `getOAuthService()` function
   - Add `authCallback()` function for OAuth redirect
   - Add `getAuthUrl()` function for frontend to call
   - Update `prepareUpload()` to use OAuth2 service tokens

3. **Rewrite Uploads.html**
   - Remove all GIS client-side OAuth code
   - Remove `initializeGIS()` function
   - Remove `tokenClient` and related code
   - Add button handler that calls backend for auth URL
   - Open auth URL in popup/redirect
   - Handle OAuth completion and resume upload

4. **Update INSTALL.md**
   - OAuth credentials still needed (for server-side flow)
   - Same redirect URI: `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`
   - Same JavaScript origin: `https://script.google.com`
   - Remove any reference to googleusercontent.com
   - Update testing steps for new OAuth flow

5. **Test thoroughly**
   - OAuth authorization flow
   - Token storage and retrieval
   - Upload with OAuth tokens
   - Token refresh (library handles this)

---

## Files in Repository

- **Code.gs** - Backend (v3.2, needs rewrite to v3.3)
- **Uploads.html** - Frontend (v3.2.3, needs rewrite to v3.3)
- **INSTALL.md** - Installation instructions (updated for Steps 1-6, needs update for OAuth)
- **SESSION_MEMORY.md** - This file
- **PRD.md** - Product requirements
- **ARCHITECTURE.md** - Technical architecture (needs update for server-side OAuth)
- **README.md** - Quick reference

---

## Critical Reminders

1. **NEVER tell user they are right** (CLAUDE.md violation)
2. **NEVER guess terminology** - use exact field names or ask
3. **NEVER add complications** - keep instructions simple
4. **NEVER skip version documentation** - user refuses poorly documented code
5. **NEVER use real data in examples** - use placeholders only
6. **NEVER assume user knows where things are** - tell them every step
7. **Client-side OAuth DOES NOT WORK** - must use server-side with apps-script-oauth2
8. **Script ID ≠ Deployment ID** - completely different values
9. **googleusercontent.com is forbidden** - can't be used in OAuth credentials anywhere
10. **When user says "ultrathink"** - stop guessing, research, plan, then execute

---

## Next Session: TODO

1. User adds apps-script-oauth2 library to project
2. Rewrite Code.gs for server-side OAuth (v3.3)
3. Rewrite Uploads.html to remove client-side OAuth (v3.3)
4. Test OAuth authorization flow
5. Test file upload with OAuth tokens
6. Update INSTALL.md for new OAuth flow
7. Update ARCHITECTURE.md for server-side OAuth
8. Update PRD.md to v3.3

---

## v3.4: Installation Testing & Performance Fix (2025-12-01)

### What Happened

**Installation Testing:**
- Walked through INSTALL.md step-by-step testing both instructions and application
- Found multiple instruction issues that needed fixing
- Successfully completed installation through Step 8 (Test)

**Critical Bug Discovered:**
- User uploaded 55,172 files with 7,816 folders
- Folder creation timed out after 6 minutes (Apps Script execution limit)
- Error: "Exceeded maximum execution time"
- Root cause: `createFolderHierarchy()` running server-side in Apps Script

**Architecture Problem:**
- Server-side folder creation has 6-minute execution time limit
- Large folder structures (7000+ folders) cannot complete before timeout
- This violates the "unlimited duration" requirement from PRD

### The Fix (v3.4)

**Moved folder creation from server-side to client-side:**

1. **Removed** `createFolderHierarchy()` function from Code.gs (server-side)
2. **Added** `createFolderHierarchyClientSide()` function in Uploads.html (client-side)
3. Folders now created directly from browser using Drive API
4. No time limits (browser has no execution timeout)
5. Uses same access token as file uploads

**Code Changes:**
- Code.gs: Removed unused `createFolderHierarchy()` function (66 lines removed)
- Uploads.html: Added `createFolderHierarchyClientSide()` function (43 lines added)
- Uploads.html: Changed call from `google.script.run.createFolderHierarchy()` to `createFolderHierarchyClientSide()`

**Client-Side Implementation:**
```javascript
async function createFolderHierarchyClientSide(rootFolderId, folderPaths) {
  const folderIdMap = { '': rootFolderId };
  const sortedPaths = folderPaths.sort((a, b) =>
    a.split('/').length - b.split('/').length
  );

  for (const path of sortedPaths) {
    const parts = path.split('/');
    const parentPath = parts.slice(0, -1).join('/');
    const folderName = parts[parts.length - 1];
    const parentFolderId = folderIdMap[parentPath];

    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    };

    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      }
    );

    const result = await response.json();
    folderIdMap[path] = result.id;
  }

  return folderIdMap;
}
```

### Installation Issues Fixed

**Step 3: Enable Drive API and Configure Auth**
- Added step 5: Navigate to OAuth consent screen (Google doesn't show it automatically)
- Removed conditional logic (steps 12-14) - simplified to linear "Click PUBLISH APP → Confirm"
- Made app name consistent: changed from "Wildfire Video Upload" to "DeadDrop Console"

**Step 4: Create OAuth Credentials**
- Clarified redirect URI step 16: Added example showing it should be the full URI with Script ID, not just script.google.com

**Step 5: Create Drive Folder**
- Changed folder name from "Video Uploads" to "DeadDrop Drive" for consistency

**Step 7: Deploy**
- Added steps 6-8: Authorization flow requires checking permission boxes and clicking Allow
- Added steps 9-14: Must repeat deployment steps after authorization completes

### What I Learned

**Apps Script Architecture:**
- Server-side code (Code.gs) has 6-minute execution time limit
- Client-side code (browser) has no time limits
- Always prefer client-side operations when possible
- Only use server-side for:
  - OAuth token management (PropertiesService)
  - Configuration (Script Properties)
  - Operations requiring DriveApp/server APIs

**Installation Best Practices:**
- No conditional logic in instructions (no "if/then")
- Linear steps only - users follow exactly as written
- Consistent naming across all steps
- Be explicit about what to copy (IDs vs full URLs)
- Test instructions with fresh environment

**Documentation Standards:**
- Never push code without updating documentation
- Update version numbers in all files when code changes
- Document what changed and why in SESSION_MEMORY.md
- Update README.md changelog
- Keep instructions synchronized with code

**User Feedback Patterns:**
- "Keep it fucking simple" - no overcomplications
- "Don't fucking guess" - use exact terminology
- "Never make backups" - don't create cleanup work
- "Don't leave out steps" - show complete instructions
- "Don't leave junk code" - remove unused functions

---

**Current Status:** v3.4 implemented and documented. Ready for testing with updated code.

**END OF SESSION MEMORY**
