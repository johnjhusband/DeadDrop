// Code.gs
/**
 * DeadDrop v3.5.17 - Backend
 * Server-Side OAuth + Drive API File/Folder Upload
 * Supports: Desktop (file + folder), Mobile (file only)
 *
 * v3.5.17 Update (2026-01-26):
 * - Added supportsAllDrives=true to createUploadSession() for cross-workspace folder access
 * - Fixes 404 "File not found" on final chunk when uploading to folders shared across workspaces
 *
 * v3.5.16 Update (2026-01-26):
 * - Added Authorization header to uploadChunk() to prevent session invalidation
 *
 * v3.5.14 Update (2026-01-26):
 * - Added detailed logging to uploadChunk() for debugging server-side failures
 *
 * v3.5.13 Update (2026-01-26):
 * - Added uploadChunk() server-side function to proxy chunk uploads (avoids CORS)
 * - Browser sends chunks to Apps Script, which forwards to Drive API
 *
 * v3.5.8 Update (2026-01-26):
 * - Added userinfo.email scope to get user's email for folder sharing
 * - Fixes 401 error when prepareUpload() calls userinfo API
 *
 * v3.5.7 Update (2026-01-26):
 * - Fixed CORS "Failed to fetch" error on chunk uploads
 * - prepareUpload() now shares folder with authenticated user (addEditor)
 * - createUploadSession() uses OAuth2 library token (user's token) for client-side compatibility
 * - User token works because folder is shared with them
 *
 * v3.5.6 Update (2026-01-25):
 * - Fixed 404 upload error: createUploadSession() now uses ScriptApp.getOAuthToken()
 *   to match DriveApp folder creation (both use owner's credentials)
 * - Previous OAuth2 library token caused 404 because user token can't access
 *   folders created by DriveApp in owner's Drive
 *
 * v3.5.5 Update (2025-01-25):
 * - Fixed duplicate folder nesting bug in folder uploads (frontend fix)
 *
 * v3.5.5 Update (2025-01-16):
 * - Admin must sign in first via web app to initialize OAuth (documented in INSTALL.md)
 *
 * v3.5.4 Update (2025-01-16):
 * - Added clearAllAuth() utility function to fix state token errors
 *
 * v3.5.3 Update (2025-01-16):
 * - Fixed CORS error on chunk uploads by using consistent OAuth2 library token
 * - createUploadSession() now uses OAuth2 library token instead of ScriptApp.getOAuthToken()
 * - Returns accessToken to client for use in chunk upload Authorization headers
 * - INSTALL.md updated: removed GCP project linking step (was causing drive.file scope issues)
 *
 * v3.5.2 Update (2025-01-16):
 * - Added createUploadSession() server-side function for resumable uploads
 * - Fixes 404 error when client tried to call Drive API directly
 *
 * v3.5.1 Update (2025-01-16):
 * - Added createFolder() server-side function for folder hierarchy creation
 * - Fixes permission error when creating subfolders (drive.file scope issue)
 * - Folder creation now uses owner's DriveApp permissions instead of user's OAuth token
 *
 * v3.5 Update (2025-01-13):
 * - Added mobile device support (iPhone, Android) for file uploads
 * - Backend unchanged - mobile support handled entirely in frontend
 * - prepareUpload() now handles both file and folder uploads
 *
 * v3.4 Update (2025-12-01):
 * - Moved folder hierarchy creation from server-side to client-side
 * - Folders now created via Drive API directly from browser (no time limits)
 * - Removed createFolderHierarchy() server-side function (no longer needed)
 * - Fixes timeout errors with large folder structures (7000+ folders)
 *
 * v3.3 Major Update:
 * - Switched from client-side OAuth to server-side OAuth using apps-script-oauth2 library
 * - Removed client-side GIS OAuth code (incompatible with Apps Script web apps)
 * - OAuth2 library handles token storage and refresh automatically
 * - Fixes Error 400: redirect_uri_mismatch caused by googleusercontent.com forbidden domain
 */

// Configuration - Set in Script Properties
function getConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();
  return {
    ROOT_FOLDER_ID: scriptProperties.getProperty('ROOT_FOLDER_ID'),
    OAUTH_CLIENT_ID: scriptProperties.getProperty('OAUTH_CLIENT_ID'),
    OAUTH_CLIENT_SECRET: scriptProperties.getProperty('OAUTH_CLIENT_SECRET'),
    MAX_FILE_SIZE: 750 * 1024 * 1024 * 1024 // 750GB
  };
}

/**
 * Creates OAuth2 service for Google Drive API
 * Uses apps-script-oauth2 library for server-side authentication
 */
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

/**
 * Serves the upload page or handles OAuth callback
 */
function doGet(e) {
  // Check if this is an OAuth callback
  if (e.parameter.state || e.parameter.code) {
    return authCallback(e);
  }

  // Serve the upload page
  const template = HtmlService.createTemplateFromFile('Uploads');

  return template.evaluate()
    .setTitle('Upload Video - Wildfire Video')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handles OAuth callback from Google
 * Called automatically when user authorizes the app
 */
function authCallback(request) {
  const service = getOAuthService();
  const isAuthorized = service.handleCallback(request);

  if (isAuthorized) {
    return HtmlService.createHtmlOutput(
      '<script>window.close();</script>' +
      '<p>Authorization successful! You can close this window and return to the upload page.</p>'
    );
  } else {
    return HtmlService.createHtmlOutput(
      '<p>Authorization denied. Please try again.</p>'
    );
  }
}

/**
 * Gets authorization URL for frontend to open
 * Called by frontend when user clicks "Sign in"
 */
function getAuthUrl() {
  const service = getOAuthService();
  return service.getAuthorizationUrl();
}

/**
 * Checks if user has authorized the app
 * Called by frontend on page load
 */
function isAuthorized() {
  const service = getOAuthService();
  return service.hasAccess();
}

/**
 * Gets access token for authenticated requests
 * Called by frontend before upload
 */
function getAccessToken() {
  const service = getOAuthService();

  if (!service.hasAccess()) {
    throw new Error('User not authorized');
  }

  return service.getAccessToken();
}

/**
 * Logs out user by revoking OAuth token
 */
function logout() {
  const service = getOAuthService();
  service.reset();
  return { success: true };
}

/**
 * Creates folder for batch upload and returns folder ID
 * Called by authenticated user before initiating batch resumable upload
 * @param {string} projectName - User-provided name or first filename (without extension)
 * @param {number} totalFiles - Number of files in this batch
 * @param {number} totalSize - Total size of all files in bytes
 * @returns {Object} {success, folderId, folderName, message}
 */
function prepareUpload(projectName, totalFiles, totalSize) {
  Logger.log('prepareUpload called for batch upload');
  Logger.log('Project name: ' + projectName);
  Logger.log('Total files: ' + totalFiles);
  Logger.log('Total size: ' + totalSize + ' bytes (' + (totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB)');

  try {
    const config = getConfig();

    // Validate total size (recommended limit: 1TB)
    const MAX_BATCH_SIZE = 1024 * 1024 * 1024 * 1024; // 1TB
    if (totalSize > MAX_BATCH_SIZE) {
      Logger.log('WARNING: Batch size exceeds 1TB recommendation');
      // Don't fail - just log warning
    }

    // Get root folder
    const rootFolder = DriveApp.getFolderById(config.ROOT_FOLDER_ID);

    // Generate folder name from project name
    const folderName = generateFolderName(projectName, rootFolder);
    Logger.log('Generated folder name: ' + folderName);

    // Create folder for entire batch
    const uploadFolder = rootFolder.createFolder(folderName);
    const folderId = uploadFolder.getId();

    Logger.log('Batch upload folder created with ID: ' + folderId);

    // Get authenticated user's email and share folder with them
    // This allows user's OAuth token to access the folder for uploads
    const service = getOAuthService();
    const token = service.getAccessToken();
    const userInfoResponse = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const userInfo = JSON.parse(userInfoResponse.getContentText());
    const userEmail = userInfo.email;

    Logger.log('Sharing folder with user: ' + userEmail);
    uploadFolder.addEditor(userEmail);

    Logger.log('Ready to receive ' + totalFiles + ' files');

    return {
      success: true,
      folderId: folderId,
      folderName: folderName,
      message: 'Folder ready for ' + totalFiles + ' files (' + (totalSize / 1024 / 1024 / 1024).toFixed(2) + ' GB total)'
    };

  } catch (error) {
    Logger.log('ERROR in prepareUpload: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);

    return {
      success: false,
      message: 'Failed to prepare upload: ' + error.message
    };
  }
}

/**
 * Generates folder name: projectName_YYYY-MM-DD_001
 * @param {string} projectName - User-provided project name or first filename (already sanitized)
 * @param {Folder} rootFolder - Parent folder for sequential numbering
 * @returns {string} Formatted folder name
 */
function generateFolderName(projectName, rootFolder) {
  // Remove extension if present (in case first filename was used)
  const baseName = projectName.replace(/\.[^/.]+$/, '');

  // Sanitize (remove special characters, replace spaces)
  const sanitized = baseName.replace(/[^a-zA-Z0-9-_\s]/g, '_').replace(/\s+/g, '_');

  // Get date
  const date = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Get next sequential number by counting existing folders
  const sequential = getNextSequential(rootFolder);
  const paddedSeq = ('000' + sequential).slice(-3);

  return sanitized + '_' + date + '_' + paddedSeq;
}

/**
 * Gets next sequential number by counting folders
 */
function getNextSequential(rootFolder) {
  const folders = rootFolder.getFolders();
  let count = 0;
  while (folders.hasNext()) {
    folders.next();
    count++;
  }
  return count + 1;
}

/**
 * Creates a single folder inside a parent folder
 * Called by client-side code to create folder hierarchy
 * Uses owner's DriveApp permissions (not user's OAuth token)
 * @param {string} folderName - Name of folder to create
 * @param {string} parentFolderId - ID of parent folder
 * @returns {Object} {success, folderId, message}
 */
function createFolder(folderName, parentFolderId) {
  try {
    const parentFolder = DriveApp.getFolderById(parentFolderId);
    const newFolder = parentFolder.createFolder(folderName);
    return { success: true, folderId: newFolder.getId() };
  } catch (error) {
    Logger.log('ERROR in createFolder: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * Creates a resumable upload session for a file
 * Called by client-side code before uploading file chunks
 * Uses OAuth2 library token (user's token) - user has folder access via sharing in prepareUpload()
 * @param {string} fileName - Name of the file
 * @param {string} mimeType - MIME type of the file
 * @param {string} parentFolderId - ID of parent folder
 * @returns {Object} {success, sessionUrl, accessToken, message}
 */
function createUploadSession(fileName, mimeType, parentFolderId) {
  try {
    // Use OAuth2 library token (user's token) - user has editor access to folder
    // Folder was shared with user in prepareUpload(), so their token can access it
    // This token works for client-side fetch requests (no CORS issues)
    const service = getOAuthService();
    const accessToken = service.getAccessToken();

    const metadata = {
      name: fileName,
      mimeType: mimeType,
      parents: [parentFolderId]
    };

    const response = UrlFetchApp.fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        contentType: 'application/json',
        headers: {
          'Authorization': 'Bearer ' + accessToken
        },
        payload: JSON.stringify(metadata),
        muteHttpExceptions: true
      }
    );

    if (response.getResponseCode() === 200) {
      const sessionUrl = response.getHeaders()['Location'];
      // Return accessToken so client can use same token for chunk uploads
      return { success: true, sessionUrl: sessionUrl, accessToken: accessToken };
    } else {
      Logger.log('ERROR creating upload session: ' + response.getContentText());
      return { success: false, message: response.getContentText() };
    }
  } catch (error) {
    Logger.log('ERROR in createUploadSession: ' + error.toString());
    return { success: false, message: error.message };
  }
}

/**
 * Uploads a chunk to a resumable upload session
 * Called by client-side code to proxy uploads through server (avoids CORS)
 * @param {string} sessionUrl - The resumable session URL
 * @param {string} chunkBase64 - Chunk data as base64 string
 * @param {number} start - Start byte position
 * @param {number} end - End byte position (exclusive)
 * @param {number} totalSize - Total file size
 * @param {string} accessToken - OAuth access token for authorization
 * @returns {Object} {success, status, message}
 */
function uploadChunk(sessionUrl, chunkBase64, start, end, totalSize, accessToken) {
  try {
    Logger.log('uploadChunk START: bytes ' + start + '-' + (end - 1) + '/' + totalSize);
    Logger.log('uploadChunk: base64 length = ' + chunkBase64.length);
    Logger.log('uploadChunk: accessToken provided = ' + (accessToken ? 'yes' : 'no'));

    const chunkData = Utilities.base64Decode(chunkBase64);
    Logger.log('uploadChunk: decoded to ' + chunkData.length + ' bytes');

    const contentRange = 'bytes ' + start + '-' + (end - 1) + '/' + totalSize;
    Logger.log('uploadChunk: Content-Range = ' + contentRange);
    Logger.log('uploadChunk: session URL = ' + sessionUrl.substring(0, 80) + '...');

    Logger.log('uploadChunk: calling UrlFetchApp.fetch...');
    const response = UrlFetchApp.fetch(sessionUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': contentRange,
        'Authorization': 'Bearer ' + accessToken
      },
      payload: chunkData,
      muteHttpExceptions: true
    });
    Logger.log('uploadChunk: fetch completed');

    const status = response.getResponseCode();
    Logger.log('uploadChunk: response status = ' + status);

    if (status === 200 || status === 201) {
      Logger.log('uploadChunk: SUCCESS - upload complete');
      return { success: true, status: status, complete: true };
    } else if (status === 308) {
      Logger.log('uploadChunk: SUCCESS - chunk received, more expected');
      return { success: true, status: status, complete: false };
    } else {
      const errorBody = response.getContentText();
      Logger.log('uploadChunk ERROR: status=' + status + ' body=' + errorBody);
      return { success: false, status: status, message: 'HTTP ' + status + ': ' + errorBody };
    }
  } catch (error) {
    Logger.log('uploadChunk EXCEPTION: ' + error.toString());
    Logger.log('uploadChunk EXCEPTION stack: ' + error.stack);
    return { success: false, message: 'Server exception: ' + error.message };
  }
}

/**
 * Test configuration
 */
function testConfig() {
  const config = getConfig();
  Logger.log('ROOT_FOLDER_ID: ' + config.ROOT_FOLDER_ID);
  Logger.log('OAUTH_CLIENT_ID: ' + config.OAUTH_CLIENT_ID);
  Logger.log('OAUTH_CLIENT_SECRET: ' + (config.OAUTH_CLIENT_SECRET ? 'Set' : 'Not set'));

  try {
    const folder = DriveApp.getFolderById(config.ROOT_FOLDER_ID);
    Logger.log('✓ Folder accessible: ' + folder.getName());
  } catch (e) {
    Logger.log('✗ Error accessing folder: ' + e.toString());
  }

  const service = getOAuthService();
  Logger.log('OAuth service initialized: ' + (service ? 'Yes' : 'No'));
  Logger.log('User authorized: ' + (service.hasAccess() ? 'Yes' : 'No'));
}

/**
 * Clears all stored OAuth data - run this to fix state token errors
 */
function clearAllAuth() {
  PropertiesService.getUserProperties().deleteAllProperties();
  Logger.log('All user properties cleared');
}
