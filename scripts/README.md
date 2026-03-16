# Apps Script Publish (Raw Only)

This script exports raw Google Docs/Sheets to GitHub. No Markdown/JSON conversion happens in Apps Script.

## Setup
1. Open Google Apps Script and paste `publish.gs`.
2. Fill `CONFIG`:
   - `SPREADSHEET_ID` (source spreadsheet)
   - `DOCS_FOLDER_ID` (Drive folder for Docs)
   - `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH`
   - `GITHUB_TOKEN` or Secrets sheet config

## Output
- Docs: `raw/docs/*.docx`
- Sheets: `raw/sheets/*.csv`
  - CSV names follow sheet names (e.g. `Profile` -> `profile.csv`).

## Incremental
The script stores hashes in Script Properties and only uploads when content changes.
