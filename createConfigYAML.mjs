import { platform, env, exit } from "process"
import { existsSync, copyFileSync } from "fs"
import { join } from "path"

let configFolder;
switch (platform) {
  case "win32":
    configFolder = env.APPDATA;
    break;
  case "darwin": // MacOS
    configFolder = env.HOME + "/Library/Preferences";
    break;
  
  default:
    configFolder = env.HOME + "/.local/share";
}

const configFileFolder = join(configFolder, "ottieni-immagini-gioco");
const completePath = join(configFileFolder, "config.yaml");

// In case there's no matching file inside the location
if (!existsSync(completePath)) copyFileSync("config_default.yaml", completePath);

export default completePath