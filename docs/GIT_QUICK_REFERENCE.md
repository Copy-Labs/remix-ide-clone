# Git Integration Quick Reference

## Quick Navigation

### Access Git Panel
```
Sidebar → Git Icon (4th tab) → Git Panel Opens
```

### Initial Setup
| Action | Steps |
|--------|-------|
| **New Repository** | Git Panel → "Initialize Repository" |
| **Clone Repository** | Git Panel → "Clone Repository" → Enter URL → Clone |
| **Configure User** | Settings Icon → Enter Name/Email → Save |

## Tab Overview

### 1. Changes Tab (Default)
| Element | Action | Result |
|---------|--------|--------|
| File with 🟢 | Click "+" | Stage new file |
| File with 🔴 | Click "+" | Stage modified file |
| "Stage All" | Click | Stage all changes |
| Commit Message | Type + "Commit Changes" | Create commit |

### 2. Branches Tab
| Element | Action | Result |
|---------|--------|--------|
| "New Branch" | Click → Enter name → Create | New branch created |
| Branch name | Click merge icon | Switch to branch |
| Branch name | Click trash icon | Delete branch |
| "Add Remote" | Click → Enter name/URL → Add | Remote added |
| Remote upload icon | Click | Push to remote |
| Remote download icon | Click | Pull from remote |

### 3. History Tab
| Element | Description |
|---------|-------------|
| Commit list | Shows chronological commit history |
| Commit hash | 7-character identifier |
| Author info | Name, email, timestamp |

### 4. GitHub Tab
| State | Available Actions |
|-------|------------------|
| **Not Connected** | "Connect to GitHub" → Enter token → Connect |
| **Connected** | Create Repo, Browse Repos, Disconnect |

## Common Workflows

### Basic Development Flow
```
1. Initialize/Clone → 2. Configure User → 3. Make Changes → 
4. Stage Changes → 5. Commit → 6. Push (optional)
```

### Feature Branch Flow
```
1. Create Branch → 2. Switch to Branch → 3. Make Changes → 
4. Commit Changes → 5. Push Branch → 6. Switch to Main
```

### GitHub Integration Flow
```
1. Connect GitHub → 2. Browse/Create Repos → 3. Clone/Push → 
4. Manage Repositories
```

## Status Icons Reference

| Icon | Meaning | Action Available |
|------|---------|------------------|
| 🟢 | New file (untracked) | Stage with "+" |
| 🔴 | Modified file | Stage with "+" |
| 🗑️ | Deleted file | Stage with "+" |
| 📋 | Staged file | Ready for commit |

## Button Reference

### Header Buttons
| Icon | Function |
|------|----------|
| ⚙️ | Open Git configuration |
| 🔄 | Refresh all Git data |

### Action Buttons
| Button | Location | Function |
|--------|----------|----------|
| "Initialize Repository" | Welcome screen | Create new Git repo |
| "Clone Repository" | Welcome screen | Clone existing repo |
| "Stage All" | Changes tab | Stage all modified files |
| "Commit Changes" | Changes tab | Create commit with message |
| "New Branch" | Branches tab | Create new branch |
| "Add Remote" | Branches tab | Add remote repository |
| "Create Repo" | GitHub tab | Create GitHub repository |
| "Connect to GitHub" | GitHub tab | Authenticate with GitHub |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate between form fields |
| Enter | Submit forms/dialogs |
| Escape | Close dialogs |

## Error States

| Error Type | Common Cause | Solution |
|------------|--------------|----------|
| "Git user name and email must be configured" | No user config | Set name/email in settings |
| "GitHub token not configured" | No GitHub token | Connect to GitHub with valid token |
| Network errors | Connection issues | Check internet, retry operation |
| "Repository name already exists" | Duplicate repo name | Use different repository name |

## Quick Troubleshooting

| Problem | Quick Fix |
|---------|-----------|
| Git panel not loading | Click refresh button |
| Changes not showing | Click refresh in Changes tab |
| Can't commit | Check user configuration |
| GitHub connection failed | Verify token permissions |
| Push/pull failed | Check remote URL and permissions |

## Configuration Requirements

### Before First Commit
- ✅ Git user name configured
- ✅ Git user email configured

### For GitHub Integration
- ✅ GitHub Personal Access Token
- ✅ Token has required permissions (repo access)

### For Remote Operations
- ✅ Remote repository configured
- ✅ Authentication credentials (if private repo)

## Best Practices Summary

### Commit Messages
- Start with action verb (Add, Fix, Update)
- Keep under 50 characters for first line
- Be descriptive and clear

### Branch Names
- Use prefixes: `feature/`, `fix/`, `hotfix/`
- Include issue numbers when applicable
- Use kebab-case: `feature/user-authentication`

### GitHub Tokens
- Use minimal required permissions
- Rotate tokens regularly
- Keep tokens secure

This quick reference provides immediate access to the most common Git integration actions and troubleshooting steps.
