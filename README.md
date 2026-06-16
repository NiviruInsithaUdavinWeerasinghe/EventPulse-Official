# EventPulse - Official Documentation Branch

This branch is dedicated exclusively to documentation, workflow guidelines, and project specifications. No source code should be placed in this branch.

---

## 🚀 Team Developer Workflow

Direct pushes to the `main` branch are blocked. All team members must use the following workflow to propose changes:

### 1. Jira Issue Link
* Find your assigned task on Jira (e.g., `EP-7`, `EP-26`).
* Use the Jira issue key in your branch names and commit messages to link work automatically.

### 2. Create a Local Branch
Create your feature branch from the latest `main` branch:
```bash
git checkout main
git pull origin main
git checkout -b feature/username/EP-XX-short-description
```
*(Replace `username` with your name/username and `EP-XX` with your actual Jira issue key, e.g., `feature/niviru/EP-7-view-floorplan`)*


### 3. Stage and Commit
Stage your files and write a commit message prefixed with the Jira issue key:
```bash
git add .
git commit -m "EP-XX: description of changes"
```

### 4. Push and Open a Pull Request
Push your branch to GitHub and create a Pull Request to merge into `main`:
```bash
git push -u origin feature/username/EP-XX-short-description
```

### 5. Pull Approved Changes
Once the PR is merged on GitHub, pull the changes locally:
```bash
git checkout main
git pull origin main
```