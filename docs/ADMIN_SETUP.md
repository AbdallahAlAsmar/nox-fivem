# Admin Access Setup Guide

This guide explains how to set up admin access for the NOXES project management system.

## Overview

The project management system is now secured with:
1. **Auth Guard**: Only logged-in users can access the admin panel
2. **Admin Check**: Only users with admin role/metadata can create/edit/delete projects
3. **Persistent Storage**: Projects are stored in `data/projects.json` for easy editing
4. **REST API**: Full CRUD operations via `/api/projects` (public) and `/api/admin/projects` (admin-only)

## Setting Up Admin Users

### Option 1: Via Clerk Dashboard (Recommended)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Users** → **Manage Users**
3. Find or create the user you want to make an admin
4. Click on the user and select **Edit** → Metadata
5. Add metadata fields:
   - `role`: Set to `"admin"`
   - Or use `isAdmin`: Set to `true` (boolean)
6. Click Save

### Option 2: Via Clerk API

Use Clerk's API to update user metadata:

```bash
# Install Clerk CLI
npm install -g @clerk/clerk-cli

# Update user metadata
clerk users update <userId> \
  --public-metadata='{"role":"admin"}'
```

### Option 3: Via Discord Bot (Optional)

If you want to manage admin users via Discord:

1. Connect a Discord bot to your Clerk application
2. Create a command like `/admin @user add`
3. The bot would call Clerk's API to update user metadata

## Current Admin Users

As the project owner, you can test the system:

1. Sign in to NOXES
2. Go to **Dashboard** → **Admin**
3. You should see the Projects Management page
4. Existing projects retrieved from `data/projects.json`:
   - NOXES for FiveM (Flagship project)
   - NOXES Nexus (Beta preview)

## Using the Admin Panel

Once logged in as an admin:

### Adding a New Project

1. Click **"Add Project"** button
2. Fill in all required fields:
   - **Project Name**: e.g., "NOXES Discord Bot"
   - **Audience**: e.g., "For community managers"
   - **Description**: Short description
   - **Long Description**: Detailed description
   - **Stage**: e.g., "MVP", "Beta", "Production"
   - **Highlights**: Max 5 features/benefits
   - **Metrics**: Max 5 metrics (label + value pairs)
   - **Architecture**: Max 5 stack items
3. Click **"Create"**

### Editing a Project

1. Click **"Edit"** on any project card
2. Update the fields as needed
3. Click **"Update"**

### Deleting a Project

1. Click **"Delete"** on any project card
2. Confirm deletion
3. Project is permanently removed

## File Structure

```
apps/web/
├── data/
│   └── projects.json          # Project storage
├── app/
│   ├── api/
│   │   ├── projects/         # Public API (read-only)
│   │   │   └── route.ts
│   │   └── admin/
│   │       └── projects/     # Admin API (Full CRUD)
│   │           └── route.ts
│   └── dashboard/
│       └── admin/
│           └── projects/     # Admin UI
│               └── page.tsx
```

## API Endpoints

### Public - GET /api/projects

Returns all projects (no auth required)

**Response:**
```json
[
  {
    "id": "fivem",
    "name": "NOXES for FiveM",
    "audience": "For FiveM server owners",
    "description": "...",
    ...
  }
]
```

### Admin-Protected - POST /api/admin/projects

Create a new project

**Request:**
```json
{
  "name": "Project Name",
  "audience": "Target audience",
  "description": "Short description",
  "longDescription": "Long description",
  "stage": "Stage name",
  "highlights": ["Feature 1", "Feature 2"],
  "metrics": [
    {"label": "Metric", "value": "Value"}
  ],
  "architecture": ["Stack 1", "Stack 2"],
  "href": "/project-url"
}
```

### Admin-Protected - PUT /api/admin/projects

Update an existing project

**Request:**
```json
{
  "id": "project-id",
  "name": "Updated name",
  "audience": "Updated audience",
  ...
}
```

### Admin-Protected - DELETE /api/admin/projects?id=<id>

Delete a project

**Query Parameter:**
- `id`: Project ID to delete

## Security Notes

1. **Admin Role Check**: The system checks for `role: "admin"` or `isAdmin: true` in user metadata
2. **Authentication Required**: All admin API endpoints require a valid Clerk session
3. **CORS**: Admin API is protected by Clerk middleware
4. **Rate Limiting**: Clerk API has built-in rate limiting
5. **Audit Logging**: Consider adding logging for admin actions (optional)

## Next Steps (Optional)

1. **Add Role Management UI**: Create a page for users to manage their roles
2. **Email Notifications**: Notify users when role is changed
3. **Audit Logs**: Track all admin actions in a database table
4. **Discord Bot Integration**: Create commands for managing projects
5. **PostgreSQL Storage**: Move from JSON file to PostgreSQL for better scaling

## Troubleshooting

### "Forbidden: Admin only" Error

- Verify user has admin role/metadata in Clerk
- Admin metadata must be `{"role": "admin"}` or `{"isAdmin": true}`

### Changes Not Appearing on Landing Page

- Wait a moment for the API cache
- Clear browser cache and reload
- Check server logs for API errors

### "Cannot find user" in Admin Panel

- Ensure user is properly authenticated in Clerk
- Check browser console for Clerk errors

## Support

For issues or questions, contact the NOXES team or check the official documentation.