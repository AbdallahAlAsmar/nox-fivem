use crate::config::{Config, get_config, update_config, Theme, AiMode};

#[tauri::command]
pub fn get_config_cmd() -> Config {
    get_config()
}

#[tauri::command]
pub fn update_config_cmd(new_config: Config) -> Result<Config, String> {
    update_config(new_config.clone());
    Ok(new_config)
}

#[tauri::command]
#[allow(dead_code)]
pub fn set_theme(theme: Theme) -> Result<(), String> {
    let mut config = get_config();
    config.theme = theme;
    update_config(config);
    Ok(())
}

#[tauri::command]
#[allow(dead_code)]
pub fn set_ai_mode(mode: AiMode) -> Result<(), String> {
    let mut config = get_config();
    config.ai_mode = mode;
    update_config(config);
    Ok(())
}
