# DeadDrop v3.4 - Technical Architecture Documentation

**Last Updated:** 2025-12-01
**Version:** v3.4 (Client-Side Folder Creation)

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

DeadDrop v3.3 uses **server-side OAuth** via the apps-script-oauth2 library and Google Drive API v3 for folder uploads.

**Architecture Pattern:**
- **Client-side:** Minimal OAuth UI + Direct Drive API uploads + Folder management  
- **Server-side:** OAuth2 library handles authentication, token storage, and refresh
- **No file proxy:** Files upload directly from browser to Drive (bandwidth efficient)

**Key Capabilities:**
- Folder selection (entire folder with subfolders)
- Individual files up to 750GB each
- Unlimited total upload size
- Preserves original folder structure in Drive
- Upload verification (size + MD5 checksum)
- Progress tracking per file and overall batch
- Server-side OAuth token management (automatic refresh)

**Architecture Change from v3.2:**
- v3.2: Client-side OAuth with Google Identity Services (GIS) - **BROKEN** due to googleusercontent.com forbidden domain
- v3.3: Server-side OAuth with apps-script-oauth2 library - **WORKS** with Apps Script web apps

---

## Technology Stack

### Frontend

**No OAuth Library Needed**
- Client calls backend for authorization URL
- Opens OAuth popup pointing to Google
- Backend handles callback and token storage

**Google Drive API v3**
- Endpoint: `https://www.googleapis.com/upload/drive/v3/files`
- Method: Resumable upload protocol
- Max file size: 5TB (limited to 750GB by daily quota)
- Access token obtained from backend via `google.script.run.getAccessToken()`

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
    .setScope('https://www.googleapis.com/auth/drive.file')
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

**Upload File in Chunks:**
```javascript
const CHUNK_SIZE = 256 * 1024 * 1024; // 256MB
const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

for (let i = 0; i < totalChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);
  const chunk = file.slice(start, end);
  
  const chunkResponse = await fetch(sessionUrl, {
    method: 'PUT',
    headers: {
      'Content-Range': `bytes ${start}-${end-1}/${file.size}`
    },
    body: chunk
  });
  
  // Status 308 = Resume Incomplete (continue)
  // Status 200/201 = Upload Complete
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
```

**Upload Management:**
```javascript
prepareUpload(projectName, totalFiles, totalSize)  // Creates root folder
createFolderHierarchy(rootFolderId, folderPaths)   // Creates nested folders
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

Use minimal scope:
- `https://www.googleapis.com/auth/drive.file`
- Only allows access to files created by the app
- More secure than full Drive access

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
