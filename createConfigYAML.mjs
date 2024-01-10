import { platform, env, exit } from "process"
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs"
import { join, basename } from "path"
import { parseDocument } from "yaml"
import { updateUserConfig, declareColors } from "./utils.mjs"

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

const configFileFolder = join(configFolder, "tui-retroarch-thumbnail-downloader");
const completePath = join(configFileFolder, "config.yaml");


// If it's trying to import,
// do not run whatever it's inside the condition
if (basename(process.argv[1]).includes("createConfigYAML.mjs")) {
  // In case there's no config folder
  if (!existsSync(configFileFolder)) mkdirSync(configFileFolder);
  
  // In case there's no matching file inside the location
  if (!existsSync(completePath)) {
    copyFileSync("config_default.yaml", completePath);
  } else {
    declareColors();
    const oldUserConfig = parseDocument(readFileSync(completePath).toString());
    const defaultConfigFile = parseDocument(readFileSync("config_default.yaml").toString());
    
    // Tries to update the user's config
    // if it sees no changes to be made, it does nothing
    try {
      const funcReturnArray = updateUserConfig(oldUserConfig);
      if (funcReturnArray.length === 2) {
        writeFileSync(completePath, oldUserConfig.toString());
        console.log(`${green}Successfully ${funcReturnArray[1].join("/")} the user's config${normal}\n`);
      }
    } catch (e) {
      console.log(`${red}Couldn't successfully update the user's config because:${normal}`);
      console.log(e);
    }
  }
}


export default completePath
