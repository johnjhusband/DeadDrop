# DeadDrop v3.5.13 - Technical Architecture Documentation

**Last Updated:** 2026-01-26
**Version:** v3.5.13 (Server-Side Upload Proxy)

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [OAuth 2.0 Server-Side Flow](#oauth-20-server-side-flow)
4. [Drive API Resumable Upload](#drive-api-resumable-upload)
5. [Batch Upload Architecture](#batch-upload-architecture)
6. [Apps Script Backend](#apps-script-backend)
7. [Critical Implementation Details](#critical-implementation-details)
8. [API References](#api-references)

---

## Overview

DeadDrop v3.5.13 uses **server-side OAuth** via the apps-script-oauth2 library and Google Drive API v3 for file/folder uploads.

**Architecture Pattern:**
- **Client-side:** OAuth UI + File selection + Progress display
- **Server-side:** OAuth2 library handles authentication, token storage, refresh, upload session creation, folder creation, and chunk upload proxy
- **Server proxy:** File chunks are sent to Apps Script which forwards to Drive API (required due to CORS restrictions)

**Key Capabilities:**
- Folder selection (entire folder with subfolders) - desktop only
- Single/multiple file selection - desktop and mobile
- Individual files up to 750GB each
- Unlimited total upload size
- Preserves original folder structure in Drive
- Server-side OAuth token management (automatic refresh)
- Mobile device support (iPhone, Android)

---

## Technology Stack

### Frontend

**No OAuth Library Needed**
- Client calls backend for authorization URL
- Opens OAuth popup pointing to Google
- Backend handles callback and token storage

**Mobile Detection**
- Detects device type (mobile vs desktop)
- Mobile: File selection only (no folder upload)
- Desktop: File and folder selection

**Google Drive API v3**
- Endpoint: `https://www.googleapis.com/upload/drive/v3/files`
- Method: Resumable upload protocol
- Max file size: 5TB (limited to 750GB by daily quota)
- Upload session created server-side via `google.script.run.createUploadSession()`
- Chunks uploaded via `google.script.run.uploadChunk()` (server proxy, avoids CORS)
- Chunk size: 32MB (must fit in google.script.run ~50MB limit after base64 encoding)

### Backend

**Google Apps Script**
- Runtime: V8 JavaScript engine
- Service: HtmlService for templated HTML
- Service: DriveApp for folder creation
- Library: apps-script-oauth2 for OAuth management

**apps-script-oauth2 Library**
- Library ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
- Source: https://github.com/googleworkspace/apps-script-oauth2
- Handles: Authorization, token exchange, token storage, token refresh
- Storage: PropertiesService.getUserProperties()

---

## OAuth 2.0 Server-Side Flow

### Why Server-Side OAuth?

**Client-Side OAuth (GIS) Doesn't Work:**
- Apps Script web apps run on `googleusercontent.com` domains
- Google forbids `googleusercontent.com` as OAuth JavaScript origin or redirect URI
- Error: `400: redirect_uri_mismatch` / `forbidden domain`
- This is a security policy with no workaround

**Server-Side OAuth Works:**
- OAuth flow initiated from `script.google.com` domain (allowed)
- Redirect URI: `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback`
- Backend handles all OAuth interactions
- Frontend just triggers the flow and receives tokens

### Implementation

**1. Backend: OAuth Service Setup**

```javascript
function getOAuthService() {
  const config = getConfig();
  
  return OAuth2.createService('drive')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setClientId(config.OAUTH_CLIENT_ID)
    .setClientSecret(config.OAUTH_CLIENT_SECRET)
    .setCallbackFunction('authCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email')
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}
```

**2. Frontend: Trigger Authorization**

```javascript
function handleSignIn() {
  google.script.run
    .withSuccessHandler(authUrl => {
      const popup = window.open(authUrl, 'oauth', 'width=600,height=700');
      
      // Poll for popup close
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          checkAuthorization(); // Verify user is now authorized
        }
      }, 500);
    })
    .getAuthUrl();
}
```

**3. Backend: Handle Callback**

```javascript
function authCallback(request) {
  const service = getOAuthService();
  const isAuthorized = service.handleCallback(request);
  
  if (isAuthorized) {
    return HtmlService.createHtmlOutput(
      '<script>window.close();</script>' +
      '<p>Authorization successful!</p>'
    );
  } else {
    return HtmlService.createHtmlOutput('<p>Authorization denied.</p>');
  }
}
```

**4. Frontend: Get Access Token for Upload**

```javascript
async function startUpload() {
  // Get access token from backend
  accessToken = await new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .getAccessToken();
  });
  
  // Use token for Drive API requests
  const response = await fetch(driveApiUrl, {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
}
```

### OAuth Flow Diagram

```
User clicks "Sign In"
  ↓
Frontend: google.script.run.getAuthUrl()
  ↓
Backend: OAuth2.createService().getAuthorizationUrl()
  ↓
Returns: https://accounts.google.com/o/oauth2/auth?client_id=...
  ↓
Frontend: window.open(authUrl, 'oauth', 'popup')
  ↓
User authorizes in Google OAuth popup
  ↓
Google redirects to: https://script.google.com/macros/d/{SCRIPT_ID}/usercallback?code=...
  ↓
Backend: authCallback(request) receives authorization code
  ↓
Backend: OAuth2 library exchanges code for tokens, stores in UserProperties
  ↓
Popup closes
  ↓
Frontend: Polls for popup close, then calls checkAuthorization()
  ↓
Backend: isAuthorized() returns true
  ↓
Frontend: Shows upload interface
  ↓
User selects files
  ↓
Frontend: Calls getAccessToken()
  ↓
Backend: Returns service.getAccessToken() (OAuth2 library handles refresh if needed)
  ↓
Frontend: Uses access token for Drive API uploads
```

### Token Management

**Automatic Token Refresh:**
- apps-script-oauth2 library handles token expiration automatically
- When `getAccessToken()` is called, library checks if token is expired
- If expired, library uses refresh token to get new access token
- No manual refresh logic needed in application code

**Token Storage:**
- Tokens stored in `PropertiesService.getUserProperties()`
- Scoped to the user who authorized (not global to all users)
- Persists across sessions
- Secure (not accessible from client-side)

---

## Drive API Resumable Upload

### Upload Protocol

**Initiate Upload Session:**
```javascript
const metadata = {
  name: file.name,
  mimeType: file.type,
  parents: [folderId]
};

const initResponse = await fetch(
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
  {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  }
);

const sessionUrl = initResponse.headers.get('Location');
```

**Upload File in Chunks (via Server Proxy):**
```javascript
const CHUNK_SIZE = 32 * 1024 * 1024; // 32MB (must fit in google.script.run limit)
const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

for (let i = 0; i < totalChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const chunk = file.slice(start, end);

  // Convert chunk to base64 for transfer to server
  const chunkBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(chunk);
  });

  // Upload via server (avoids CORS)
  const result = await new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      .uploadChunk(sessionUrl, chunkBase64, start, end, file.size);
  });

  // Status 308 = Resume Incomplete (continue)
  // Status 200/201 = Upload Complete
}
```

**Server-Side uploadChunk Function:**
```javascript
function uploadChunk(sessionUrl, chunkBase64, start, end, totalSize) {
  const chunkData = Utilities.base64Decode(chunkBase64);
  const contentRange = 'bytes ' + start + '-' + (end - 1) + '/' + totalSize;

  const response = UrlFetchApp.fetch(sessionUrl, {
    method: 'PUT',
    headers: { 'Content-Range': contentRange },
    payload: chunkData,
    muteHttpExceptions: true
  });

  return { success: true, status: response.getResponseCode() };
}
```

---

## Batch Upload Architecture

### Folder Structure Preservation

**1. Extract Folder Paths from Files:**
```javascript
function extractFolderPaths(files) {
  const paths = new Set();
  
  files.forEach(file => {
    if (file.webkitRelativePath) {
      const parts = file.webkitRelativePath.split('/');
      parts.pop(); // Remove filename
      
      let currentPath = '';
      parts.forEach(part => {
        currentPath += (currentPath ? '/' : '') + part;
        paths.add(currentPath);
      });
    }
  });
  
  return Array.from(paths);
}
```

**2. Create Folder Hierarchy in Drive:**
```javascript
function createFolderHierarchy(rootFolderId, folderPaths) {
  const folderIdMap = { '': rootFolderId };

  // Sort by depth (shallowest first)
  const sortedPaths = folderPaths.sort((a, b) =>
    a.split('/').length - b.split('/').length
  );

  sortedPaths.forEach(path => {
    const parts = path.split('/');
    const parentPath = parts.slice(0, -1).join('/');
    const folderName = parts[parts.length - 1];

    const parentFolder = DriveApp.getFolderById(folderIdMap[parentPath]);
    const newFolder = parentFolder.createFolder(folderName);
    folderIdMap[path] = newFolder.getId();
  });

  return folderIdMap;
}
```

**3. Upload Files to Correct Folders:**
```javascript
files.forEach(file => {
  // Get folder path from webkitRelativePath
  const parts = file.webkitRelativePath.split('/');
  parts.pop(); // Remove filename
  const folderPath = parts.join('/');
  
  // Get target folder ID
  const targetFolderId = folderIdMap[folderPath];
  
  // Upload file to target folder
  uploadFile(file, targetFolderId);
});
```

---

## Apps Script Backend

### Core Functions

**OAuth Management:**
```javascript
getOAuthService()      // Creates OAuth2 service instance
getAuthUrl()           // Returns authorization URL for frontend
authCallback(request)  // Handles OAuth callback from Google
isAuthorized()         // Checks if user has valid tokens
getAccessToken()       // Returns access token (auto-refreshes if needed)
logout()               // Revokes tokens
clearAllAuth()         // Clears all stored OAuth data (troubleshooting)
```

**Upload Management:**
```javascript
prepareUpload(projectName, totalFiles, totalSize)          // Creates root folder, shares with user
createFolder(folderName, parentFolderId)                   // Creates single subfolder
createUploadSession(fileName, mimeType, parentFolderId)    // Creates resumable upload session
uploadChunk(sessionUrl, chunkBase64, start, end, totalSize) // Uploads chunk to Drive (proxy)
```

**Configuration:**
```javascript
getConfig()  // Reads Script Properties (CLIENT_ID, CLIENT_SECRET, ROOT_FOLDER_ID)
testConfig() // Verifies configuration is correct
```

---

## Critical Implementation Details

### 1. Script ID vs Deployment ID

**Script ID:**
- Found in: Apps Script → ⚙️ Project Settings
- Format: `1-bAo5HlwMW5hLLHb3QQbBnD8RSWIGBsmP6xroW-emi1u70hl6iWxHrOM`
- Used for: OAuth redirect URI (`/macros/d/{SCRIPT_ID}/usercallback`)

**Deployment ID:**
- Found in: Web App URL
- Format: `AKfycbx...` (in URL `/macros/s/{DEPLOYMENT_ID}/exec`)
- Used for: Accessing deployed web app

### 2. OAuth Redirect URIs

Must add TWO redirect URIs:
1. `https://script.google.com/macros/d/{SCRIPT_ID}/usercallback` - callback handler
2. `https://script.google.com` - fallback

### 3. JavaScript Origins

Only ONE origin needed:
- `https://script.google.com`

Do NOT add googleusercontent.com (forbidden).

### 4. Token Scopes

Use minimal scopes:
- `https://www.googleapis.com/auth/drive.file` - Access to files created by the app
- `https://www.googleapis.com/auth/userinfo.email` - Get user's email for folder sharing

### 5. Folder Sharing

Folders created by DriveApp belong to the script owner. To allow users to upload:
- prepareUpload() gets user's email via userinfo API
- Folder is shared with user as editor via addEditor()
- User's OAuth token can then access the folder for uploads

---

## API References

### apps-script-oauth2 Library
- GitHub: https://github.com/googleworkspace/apps-script-oauth2
- Library ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`

### Google Drive API v3
- Documentation: https://developers.google.com/drive/api/v3/reference
- Resumable Upload: https://developers.google.com/drive/api/guides/manage-uploads#resumable

### Google Apps Script
- Documentation: https://developers.google.com/apps-script
- HtmlService: https://developers.google.com/apps-script/reference/html
- PropertiesService: https://developers.google.com/apps-script/reference/properties

---

**END OF ARCHITECTURE DOCUMENTATION**
