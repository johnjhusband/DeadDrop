<!-- INSTALL.md -->
# Installation Instructions - DeadDrop v3.5.13

**Server-Side OAuth + Drive API for Folder Upload (750GB per file, unlimited duration)**

**Time Required:** 35-50 minutes

**v3.5.13 Changes (2026-01-26):**
- Proxy chunk uploads through server to avoid CORS blocking

**v3.5.12 Changes (2026-01-26):**
- Added detailed chunk upload logging for debugging

**v3.5.11 Changes (2026-01-26):**
- Removed Authorization header from chunk uploads (CORS fix attempt)

**v3.5.10 Changes (2026-01-26):**
- Improved error logging to show in UI instead of console

**v3.5.9 Changes (2026-01-26):**
- Changed button text from "Choose" to "Upload"
- Added detailed error logging for debugging

**v3.5.8 Changes (2026-01-26):**
- Added userinfo.email scope (fixes 401 error on folder sharing)

**v3.5.7 Changes (2026-01-26):**
- Fixed CORS "Failed to fetch" error on chunk uploads
- Folder now shared with user so their OAuth token can access it for uploads

**v3.5.6 Changes (2026-01-25):**
- Upload now starts automatically when files/folder selected (removed Start Upload button)
- Fixed 404 upload error (createUploadSession uses owner's token to match DriveApp)

**v3.5.5 Changes (2025-01-25):**
- Fixed duplicate folder nesting bug in folder uploads

**v3.5.5 Changes (2025-01-16):**
- Added Step 8: Admin Authorization - admin must sign in first via web app to initialize OAuth
- Steps renumbered (now 9 steps)

**v3.5.3 Changes (2025-01-16):**
- Removed Step 4 (Link Apps Script to GCP Project) - this was causing permission errors
- Apps Script now uses its default project for DriveApp (required for drive.file scope compatibility)

**v3.5 Changes (2025-01-13):**
- Step 3: Added new GCP project creation for users with existing OAuth configurations

---

## Step 1: Create Apps Script Project (5 min)

1. Go to https://script.google.com
2. Click New project
3. Click "Untitled project" at top left
4. Name it: `DeadDrop Console`
5. Delete placeholder code in Code.gs
6. Copy all code from `Code.gs` in this repo
7. Paste into Code.gs, click Save
8. Click + next to Files → HTML
9. Name it: `Uploads`
10. Copy all code from `Uploads.html` in this repo
11. Paste, click Save
12. Click gear icon ⚙️ (Project Settings)
13. Check "Show appsscript.json manifest file in editor"
14. Click `< Editor` to go back
15. Click `appsscript.json` in the file list
16. Replace all contents with `appsscript.json` from this repo
17. Click Save

---

## Step 2: Add OAuth2 Library (3 min)

**Add the apps-script-oauth2 library for server-side authentication:**

1. In Apps Script editor, click + next to Libraries (left sidebar)
2. Script ID: `1B7FSrk5Zi6L1rSxxTDgDEUsPzlukDsi4KGuTMorsTQHhGBzBkMun4iDF`
3. Click **Look up**
4. Select latest version from dropdown
5. Click **Add**

---

## Step 3: Enable Drive API and Configure Auth (15 min)

1. Open new tab → https://console.cloud.google.com
2. Click the project dropdown at top (next to "Google Cloud")
3. Click **New Project** (top right of popup)
4. Project name: `DeadDrop Console`
5. Click **Create**
6. Wait for notification to complete
7. Click **SELECT PROJECT**
8. ☰ menu → APIs & Services → Library
9. Search: `Google Drive API`
10. Click it → ENABLE
11. ☰ menu → APIs & Services → OAuth consent screen
12. Click **Get Started**
13. App Information:
   - App name: `DeadDrop Console`
   - User support email: (your email)
   - Click Next
14. Audience:
   - Select user type: **External**
   - Click Next
15. Contact Information:
   - Email address: (your email)
   - Click Next
16. Finish:
   - Check "I agree to Google API Services User Data Policy"
   - Click Continue
   - Click Create
17. Click **Audience** in left menu
18. Click **PUBLISH APP**
19. Click **Confirm**

---

## Step 4: Create OAuth Credentials (5 min)

**First, get your Script ID:**
1. Go to https://script.google.com
2. Click your project name
3. Click gear icon ⚙️ (left side)
4. Find "Script ID" - copy it here: _______________

**Now create the redirect URI:**
5. Take this template: `https://script.google.com/macros/d/PASTE_YOUR_SCRIPT_ID_HERE/usercallback`
6. Replace `PASTE_YOUR_SCRIPT_ID_HERE` with your actual Script ID
7. You now have your redirect URI (save it temporarily)

**Create OAuth credentials:**
8. Go to https://console.cloud.google.com
9. ☰ menu → APIs & Services → Credentials
10. + CREATE CREDENTIALS → OAuth client ID
11. Application type: Web application
12. Name: `DeadDrop Web Client`
13. Authorized JavaScript origins → + ADD URI
14. Enter: `https://script.google.com`
15. Authorized redirect URIs → + ADD URI
16. Paste your redirect URI from step 7 (https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercallback)
17. Click + ADD URI again
18. Enter: `https://script.google.com`
19. CREATE
20. Copy Client ID - save it temporarily
21. Copy Client secret - save it temporarily
22. OK

---

## Step 5: Create Drive Folder (2 min)

1. Go to https://drive.google.com
2. New → Folder → Name: `DeadDrop Drive` → CREATE
3. Open folder
4. Copy ID from URL (the part after `/folders/`)

---

## Step 6: Configure Script Properties (3 min)

1. Go to https://script.google.com
2. Open your Apps Script project (the one you created in Step 1)
3. Click gear icon ⚙️ → Project Settings
4. Scroll to Script Properties section
5. Click "Add script property"
6. Add these three properties one at a time:

| Property | Value |
|----------|-------|
| ROOT_FOLDER_ID | (folder ID from Step 5) |
| OAUTH_CLIENT_ID | (Client ID from Step 4) |
| OAUTH_CLIENT_SECRET | (Client secret from Step 4) |

7. Click "Save script properties"

---

## Step 7: Deploy (5 min)

1. Click Deploy → New deployment
2. Click gear ⚙️ → Web app
3. Execute as: Me
4. Who has access: Anyone
5. Deploy
6. Authorize → Choose account
7. Check both permission boxes
8. Click Allow
9. Copy Web App URL

---

## Step 8: Admin Authorization (1 min)

**Required:** Admin must sign in first to initialize OAuth for all users.

1. Open Web App URL in a browser (not incognito)
2. Click **Sign in with Google**
3. Sign in with your **admin Google account** (the account that owns the script)
4. Click **Continue** → **Allow**
5. Popup closes - you should see the upload interface

---

## Step 9: Test (5 min)

1. Open Web App URL in incognito window
2. Click **Sign in with Google**
3. Popup window opens with Google OAuth consent screen
4. Sign in with your Google account
5. Click **Continue** → **Allow**
6. Popup closes automatically
7. Main page should now show upload interface
8. Click **Choose folder** → select test folder
9. Upload starts automatically → verify files upload to Drive

---

## Share with Clients

Send this email to your clients:

```
Hi [Client Name],

Please use this link to upload your video files:

[PASTE YOUR WEB APP URL HERE]

Instructions:
1. Click the link
2. Sign in with any Google account (Gmail or work account)
3. (Optional) Enter a project name for your upload
4. Click "Choose folder" and select your entire project folder
5. Upload starts automatically
6. Wait for all files to complete

Features:
- Upload entire folders with subfolders (structure preserved in Drive)
- Individual files up to 750GB each
- Unlimited upload duration (server-side OAuth with automatic token management)
- Automatic verification ensures file integrity
- Resumable uploads - if interrupted, they continue from where they stopped

Your files are private and secure. Only you and Wildfire Video can access them.

Thanks,
[Your Name]
Wildfire Video
```

---

## Troubleshooting

### Sign in button does nothing

**Issue:** Clicking "Sign in with Google" has no effect

**Solutions:**
- Check browser console (F12 > Console) for script errors
- Hard refresh page (Ctrl+Shift+R) to clear cache
- Ensure deployment was updated to new version (Deploy > Manage deployments > Edit > New version)
- Verify Script Properties has OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET set
- Check that apps-script-oauth2 library is added

### Authentication popup closes immediately

**Issue:** OAuth popup opens and closes without showing Google sign-in

**Solutions:**
- Verify OAuth Client ID in Script Properties matches Cloud Console
- Ensure OAuth consent screen is published to Production
- Check Authorized redirect URIs includes correct Script ID
- Check browser console for errors
- Try different browser or incognito mode

### "User not authorized" error

**Issue:** After signing in, get authorization error

**Solutions:**
- Verify apps-script-oauth2 library is installed (Step 2)
- Check that redirect URI in OAuth credentials uses correct Script ID
- Ensure both redirect URIs are added (script.google.com/macros/d/.../usercallback AND script.google.com)
- Check Apps Script execution logs (View > Logs) for detailed errors

### Upload fails immediately

**Issue:** File validation error or immediate failure

**Solutions:**
- Verify individual file size <750GB
- Check ROOT_FOLDER_ID is correct in Script Properties
- Run testConfig() function in Apps Script to verify folder access
- Ensure folder was selected (not individual files)
- Check browser console for Drive API errors

### Upload starts but fails mid-upload

**Issue:** Upload progresses then errors

**Solutions:**
- Check internet connection stability
- Verify Drive storage quota not full
- Check browser console for Drive API errors
- Verify access token is valid (OAuth2 library handles refresh automatically)

### Can't find uploaded file

**Issue:** Upload succeeds but file not in Drive

**Solutions:**
- Check "DeadDrop Drive" folder in owner's Drive (not uploader's)
- Verify ROOT_FOLDER_ID points to correct folder
- Check Apps Script execution logs (View > Logs) for errors
- Look for folder with today's date (e.g., ProjectName_2025-11-25_001)
- Check inside subfolders - folder structure is preserved from original

### "Daily upload limit reached"

**Issue:** Error after uploading 750GB in 24 hours

**Solutions:**
- This is Google Drive's quota per user per 24 hours (not a bug)
- Wait 24 hours for quota to reset
- Inform client about the limit
- Spread large uploads across multiple days

---

## Updating Code Later

**When you modify Code.gs or Uploads.html:**

1. Edit files in Apps Script editor
2. Click **Save** (saves to editor)
3. Click **Deploy** > **Manage deployments**
4. Click **✏️ Edit** (pencil icon)
5. Change **Version** to **New version**
6. Click **Deploy**
7. Click **Done**
8. **Your URL stays the same**
9. Refresh upload page in browser (Ctrl+Shift+R)

**Remember:** Save ≠ Deploy. You must deploy to make changes live.

---

**END OF INSTALLATION GUIDE**
