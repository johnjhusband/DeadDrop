# DeadDrop v3.4

**Google Apps Script folder upload application with server-side OAuth authentication**

Upload entire folders with all subfolders and files directly to Google Drive. Supports individual files up to 750GB with unlimited upload duration.

---

## Features

- ✅ **Folder Upload** - Select entire folder with all subfolders
- ✅ **Preserve Structure** - Original folder hierarchy maintained in Drive  
- ✅ **Large Files** - Individual files up to 750GB each
- ✅ **Unlimited Duration** - Server-side OAuth with automatic token management
- ✅ **Progress Tracking** - Real-time upload status per file
- ✅ **Resumable Uploads** - 256MB chunks with automatic retry
- ✅ **Verification** - File size and MD5 checksum validation
- ✅ **Multi-User** - Each user authorizes with their own Google account

---

## Quick Start

See [INSTALL.md](INSTALL.md) for complete installation instructions.

**Requirements:**
1. Google account
2. Google Cloud Platform project
3. OAuth 2.0 credentials
4. Apps Script project

**Installation Time:** 30-45 minutes

---

## Architecture

**Version:** v3.3 (Server-Side OAuth)

**Frontend:**
- HTML/JavaScript (no frameworks)
- Google Drive API v3 for direct uploads
- OAuth handled server-side (no client-side library)

**Backend:**
- Google Apps Script
- apps-script-oauth2 library for OAuth management
- DriveApp for folder creation

**Key Change from v3.2:**
- v3.2 used client-side OAuth (Google Identity Services) - **BROKEN** due to googleusercontent.com forbidden domain
- v3.3 uses server-side OAuth (apps-script-oauth2 library) - **WORKS** with Apps Script web apps

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical documentation.

---

## Files

- `Code.gs` - Apps Script backend (300 lines)
- `Uploads.html` - Upload interface (818 lines)
- `INSTALL.md` - Installation guide
- `ARCHITECTURE.md` - Technical documentation
- `PRD.md` - Product requirements
- `SESSION_MEMORY.md` - Development notes

---

## Usage

1. Deploy the Apps Script web app
2. Share the web app URL with users
3. Users sign in with their Google account
4. Select folder to upload
5. Files upload directly to your Drive with preserved structure

---

## Limitations

**Google Drive Quotas:**
- 750GB per user per 24 hours (Google's limit, not app limit)
- Individual file size: 750GB max
- Total storage: Depends on your Google Drive plan

**Browser Compatibility:**
- Chrome/Edge: Full support (webkitdirectory)
- Firefox: Full support
- Safari: Full support (macOS 11.1+)

---

## Security

- OAuth 2.0 authentication required
- Tokens stored server-side (PropertiesService.getUserProperties)
- Files upload directly from browser to Drive (no proxy)
- Minimal scope: `drive.file` (only files created by app)
- Users authenticate with their own Google accounts

---

## Support

For issues or questions:
1. Check [INSTALL.md](INSTALL.md) troubleshooting section
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
3. Check [SESSION_MEMORY.md](SESSION_MEMORY.md) for known issues

---

## License

MIT License - See repository for details

---

## Version History

### v3.4 (2025-12-01)
- **PERFORMANCE:** Moved folder hierarchy creation from server-side to client-side
- Folders now created via Drive API directly from browser (no time limits)
- Removed server-side `createFolderHierarchy()` function (no longer needed)
- Fixes timeout errors with large folder structures (7000+ folders)
- No Apps Script execution time limits for folder creation

### v3.3 (2025-11-25)
- **MAJOR:** Switched from client-side OAuth to server-side OAuth
- Added apps-script-oauth2 library
- Removed Google Identity Services (GIS) client-side code
- Fixes Error 400: redirect_uri_mismatch caused by googleusercontent.com forbidden domain
- OAuth2 library handles token refresh automatically
- Simplified installation (removed broken OAuth origin setup)

### v3.2 (2025-11-17)
- Added folder upload support
- OAuth token auto-refresh every 30 minutes
- Unlimited upload duration
- Preserve folder structure in Drive
- **DEPRECATED:** Client-side OAuth doesn't work with Apps Script web apps

### v3.1 (Previous)
- Multiple file selection
- Basic OAuth authentication
- Resumable uploads

---

**For detailed changelog and development notes, see [SESSION_MEMORY.md](SESSION_MEMORY.md)**
