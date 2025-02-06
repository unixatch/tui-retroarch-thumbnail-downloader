/*
  Copyright (C) 2024  unixatch

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with tui-retroarch-thumbnail-downloader.  If not, see <https://www.gnu.org/licenses/>.
*/

import { platform, env, exit } from "process"
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs"
import { join, basename } from "path"

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
    const { updateUserConfig } = await import("./utils/installer_utils.mjs");
    const { parseDocument } = await import("yaml");
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
