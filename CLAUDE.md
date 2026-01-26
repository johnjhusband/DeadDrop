# CLAUDE.md - DeadDrop Project

## Version Management

**ALWAYS increment version numbers when modifying code files.**

Files that need version updates:
- `Code.gs` - header comment (e.g., `DeadDrop v3.5.10 - Backend`)
- `Uploads.html` - header comment (e.g., `DeadDrop v3.5.10 - Frontend`)
- `INSTALL.md` - title and changelog

When making changes:
1. Increment the patch version (e.g., 3.5.10 → 3.5.11)
2. Add a changelog entry describing the change
3. Update ALL THREE files to the same version

## Project Structure

- `Code.gs` - Google Apps Script backend (server-side)
- `Uploads.html` - Frontend HTML/JS served by Apps Script
- `INSTALL.md` - Installation instructions for end users
- `appsscript.json` - Apps Script manifest (OAuth scopes, libraries, webapp settings)

## Deployment

User deploys manually to Google Apps Script by copying file contents. After code changes:
1. Copy updated Code.gs to Apps Script editor
2. Copy updated Uploads.html to Apps Script editor
3. Save (Ctrl+S)
4. Deploy → Manage deployments → Edit → New version → Deploy

## Key Technical Details

- OAuth2 library handles user authentication
- DriveApp creates folders (runs as script owner)
- Folders are shared with authenticated user so their token can upload
- Chunk uploads use user's OAuth token (returned from createUploadSession)
- `executeAs: USER_DEPLOYING` in appsscript.json means server code runs as owner
