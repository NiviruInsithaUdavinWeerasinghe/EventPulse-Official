# EventPulse - Official

EventPulse is a next-generation event coordination and dynamic mapping platform built on the MERN stack.

---

## 🚀 Developer Workflow & Contribution Guidelines

To maintain code quality and tracking, direct pushes to the `main` branch are disabled. All team members must follow this workflow:

### 1. Identify Your Jira Issue
* Find your assigned task on Jira (e.g., `EP-7`, `EP-26`).
* Make note of the issue key, as it must be referenced in your branch names and commit messages to sync with Jira automatically.

### 2. Create a Local Branch
Always create your branch from the latest `main` branch:
```bash
git checkout main
git pull origin main
git checkout -b feature/username/EP-XX-short-description
```
*(Replace `username` with your name/username and `EP-XX` with your actual Jira issue key, e.g., `feature/niviru/EP-7-view-floorplan`)*


### 3. Commit with Jira Issue Key
Stage your files and write a commit message prefixed with your Jira issue key:
```bash
git add .
git commit -m "EP-XX: your detailed commit message here"
```

### 4. Push to Remote Branch
Push your branch to GitHub:
```bash
git push -u origin feature/username/EP-XX-short-description
```

### 5. Create a Pull Request (PR)
* Open a Pull Request on GitHub to merge your branch into `main`.
* Wait for code review and approval before merging.

### 6. Update Your Local Workspace
Once merged on GitHub, pull the changes back into your local `main` branch:
```bash
git checkout main
git pull origin main
```