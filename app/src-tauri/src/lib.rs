use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};
use tauri::Manager;

const SCHEMA_VERSION: u32 = 1;
const WORKSPACE_FILE: &str = "workspace.json";
const TEMP_FILE: &str = "workspace.json.tmp";
const BACKUP_FILE: &str = "workspace.json.bak";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct Panel {
    id: u64,
    title: String,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct WorkspaceDocument {
    schema_version: u32,
    panels: Vec<Panel>,
    active_panel_id: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceLoad {
    workspace: Option<WorkspaceDocument>,
    path: String,
}

fn validate_workspace(workspace: &WorkspaceDocument) -> Result<(), String> {
    if workspace.schema_version != SCHEMA_VERSION {
        return Err(format!(
            "Unsupported workspace schema version {} (supported: {}).",
            workspace.schema_version, SCHEMA_VERSION
        ));
    }
    if workspace.panels.iter().any(|panel| panel.title.len() > 4096) {
        return Err("A panel title is longer than the supported limit.".into());
    }
    if workspace.panels.iter().any(|panel| panel.id == 0) {
        return Err("Panel IDs must be positive integers.".into());
    }
    let mut ids = workspace.panels.iter().map(|panel| panel.id).collect::<Vec<_>>();
    ids.sort_unstable();
    if ids.windows(2).any(|pair| pair[0] == pair[1]) {
        return Err("Panel IDs must be unique.".into());
    }
    if !workspace.panels.is_empty()
        && !workspace.panels.iter().any(|panel| panel.id == workspace.active_panel_id)
    {
        return Err("The active panel ID must refer to an existing panel.".into());
    }
    Ok(())
}

fn workspace_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app.path().app_data_dir().map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| {
        format!("Could not create DVA's app-data directory {}: {error}", directory.display())
    })?;
    Ok(directory.join(WORKSPACE_FILE))
}

fn read_workspace(path: &Path) -> Result<WorkspaceDocument, String> {
    let raw = fs::read_to_string(path)
        .map_err(|error| format!("Could not read workspace JSON at {}: {error}", path.display()))?;
    let workspace: WorkspaceDocument = serde_json::from_str(&raw)
        .map_err(|error| format!("Workspace JSON at {} is invalid: {error}", path.display()))?;
    validate_workspace(&workspace)
        .map_err(|error| format!("Workspace JSON at {} failed validation: {error}", path.display()))?;
    Ok(workspace)
}

#[tauri::command]
fn load_workspace(app: tauri::AppHandle) -> Result<WorkspaceLoad, String> {
    let path = workspace_file(&app)?;
    let workspace = if path.exists() {
        Some(read_workspace(&path)?)
    } else {
        None
    };
    Ok(WorkspaceLoad {
        workspace,
        path: path.display().to_string(),
    })
}

#[tauri::command]
fn save_workspace(app: tauri::AppHandle, workspace: WorkspaceDocument) -> Result<String, String> {
    validate_workspace(&workspace)?;
    let path = workspace_file(&app)?;
    let directory = path.parent().ok_or_else(|| "Workspace path has no parent directory.".to_string())?;
    let temporary = directory.join(TEMP_FILE);
    let backup = directory.join(BACKUP_FILE);
    let serialized = serde_json::to_vec_pretty(&workspace).map_err(|error| error.to_string())?;

    let write_result = (|| -> Result<(), String> {
        let mut file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&temporary)
            .map_err(|error| format!("Could not create temporary workspace file: {error}"))?;
        file.write_all(&serialized)
            .map_err(|error| format!("Could not write temporary workspace file: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("Could not flush temporary workspace file: {error}"))?;
        drop(file);

        let verified = read_workspace(&temporary)?;
        if verified != workspace {
            return Err("Workspace verification did not match the data written.".into());
        }

        let had_previous = path.exists();
        if had_previous {
            fs::copy(&path, &backup)
                .map_err(|error| format!("Could not preserve the previous workspace backup: {error}"))?;
            fs::remove_file(&path)
                .map_err(|error| format!("Could not replace the previous workspace: {error}"))?;
        }

        if let Err(error) = fs::rename(&temporary, &path) {
            if had_previous {
                let _ = fs::copy(&backup, &path);
            }
            return Err(format!("Could not install verified workspace JSON: {error}"));
        }

        let installed = read_workspace(&path)?;
        if installed != workspace {
            return Err(format!("Workspace verification failed after replacement at {}.", path.display()));
        }
        Ok(())
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    write_result?;
    Ok(path.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_workspace, save_workspace])
        .run(tauri::generate_context!())
        .expect("error while running DVA");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn example() -> WorkspaceDocument {
        WorkspaceDocument {
            schema_version: 1,
            panels: vec![
                Panel { id: 1, title: "First".into(), content: "Keep this writing.".into() },
                Panel { id: 2, title: "Second".into(), content: "More writing.".into() },
            ],
            active_panel_id: 2,
        }
    }

    #[test]
    fn workspace_json_round_trips_without_losing_panel_content() {
        let original = example();
        let json = serde_json::to_string(&original).unwrap();
        let restored: WorkspaceDocument = serde_json::from_str(&json).unwrap();
        assert_eq!(restored, original);
        assert!(json.contains("schemaVersion"));
        assert!(json.contains("activePanelId"));
    }

    #[test]
    fn rejects_unsupported_schema_versions() {
        let mut workspace = example();
        workspace.schema_version = 99;
        assert!(validate_workspace(&workspace).unwrap_err().contains("Unsupported"));
    }

    #[test]
    fn rejects_duplicate_panel_ids() {
        let mut workspace = example();
        workspace.panels[1].id = workspace.panels[0].id;
        assert!(validate_workspace(&workspace).unwrap_err().contains("unique"));
    }

    #[test]
    fn rejects_an_active_panel_that_does_not_exist() {
        let mut workspace = example();
        workspace.active_panel_id = 99;
        assert!(validate_workspace(&workspace).unwrap_err().contains("active panel"));
    }

    #[test]
    fn allows_an_empty_workspace_after_the_last_panel_is_closed() {
        let mut workspace = example();
        workspace.panels.clear();
        workspace.active_panel_id = 0;
        assert!(validate_workspace(&workspace).is_ok());
    }
}
