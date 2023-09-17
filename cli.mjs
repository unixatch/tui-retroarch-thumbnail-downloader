import { 
  readFileSync, 
  writeFileSync,
  copyFileSync
} from "fs"
import { execSync } from "child_process"
import { join, sep } from "path"
import YAML from "yaml"
import inquirer from "inquirer"
import inquirerFileTreeSelection from "inquirer-file-tree-selection-prompt"
import configYAMLFilePath from "./createConfigYAML.mjs"
import { __dirname } from "./utils.mjs"
inquirer.registerPrompt("file-tree-selection", inquirerFileTreeSelection)


// Custom formatting
const normal= "\x1b[0m",
  bold= "\x1b[1m",
  italics= "\x1b[3m",
  underline= "\x1b[4m",
  // Actual colors
  dimGrayBold= "\x1b[37;2;1m",
  dimGray= "\x1b[37;2m",
  green= "\x1b[32m",
  dimGreen= "\x1b[32;2m",
  red= "\x1b[31;1m",
  dimRed= "\x1b[31;2m";

const onlyUserArgs = args => {
  // Removes the node's exec path and js file path
  args.shift(); args.shift()
  return args;
}
const quitPress = (_, key) => {
  if (key.name === "q") process.exit();
}
const addRemove_quitPress = request => {
  if (typeof request !== "string") throw new TypeError("Only strings are allowed");
  
  if (request === "open") {
    // Adds the event 
    process.stdin.on('keypress', quitPress);
  } else if (request === "close") {
    // Removes the event
    process.stdin.removeListener("keypress", quitPress);
  } else throw new Error("Don't know what you're saying")
}

const actUpOnPassedArgs = async (args) => {
  let lastParam;
  const newArguments = onlyUserArgs(args);
  if (newArguments.length !== 0) {
    for (const arg of newArguments) {
      switch (arg) {
        case /^(--config|-c|\/c)$/.test(arg) && arg: {
          await askForDirectory()
          process.exit()
        }
        case /^(--config-set|-s|\/s)$/.test(arg) && arg: {
          lastParam = "settingUp"
          break;
        }
        case /^(--config-list|-l|\/l)$/.test(arg) && arg: {
          showConfigValues()
          process.exit()
        }
        case /^(--config-list-table|-lt|\/lt)$/.test(arg) && arg: {
          showConfigValuesAsTable()
          process.exit()
        }
        case /^(--reset|-r|\/r)$/.test(arg) && arg: {
          resetConfigFile()
          process.exit()
        }
        // case /^(--delete-cache|-d|\/d)$/.test(arg) && arg: {
//           // code...
//           process.exit()
//         }
//         case /^(--delete-second-cache|-ds|\/ds)$/.test(arg) && arg: {
//           // code...
//           process.exit()
//         }
          
        case /^(--help|-h|\/h|\/\?)$/.test(arg) && arg: {
          help()
          process.exit()
        }
        case /^(--version|-v|\/v)$/.test(arg) && arg: {
          version()
          process.exit()
        }
        
        default:
          switch (lastParam) {
            case "settingUp": {
              setConfigValue(arg)
              process.exit()
            }
          }
          // Invalid param
          console.log(red+`'${
            underline+dimRed +
            arg +
            normal+red
          }' is an invalid parameter`+normal)
          help()
          process.exit()
      }
    }
  }
}
const askForDirectory = async (configObject) => {
  addRemove_quitPress("open")
  await inquirer.prompt({
    type: "file-tree-selection",
    message: "Pick the screenshots directory:",
    name: "selected",
    pageSize: 20,
    enableGoUpperDirectory: true,
    onlyShowDir: true
  })
  .then(answer => {
    // Removes it when done
    addRemove_quitPress("close")
    
    // Adds the selected path and continues
    configObject.object
      .get("screenshotsDirPaths")
      .get("mobile")
      .set("terminalEmu", answer.selected);
    const finalObject = YAML.stringify(
      configObject.object, { 
        lineWidth: 0 // Disables folding
      }
    );
    writeFileSync(configObject.path, finalObject)
  })
}
const setConfigValue = value => {
  // Must include a ,
  if (!value.includes(",")) {
    throw new TypeError("String with 'property, value' needed")
  }
  const propertyPlusValue = value.split(/\s*,\s*/);
  let [ property, propertyValue ] = propertyPlusValue;
  // Must include something as property
  if (property === "") {
    throw new ReferenceError("Missing property")
  } else if (propertyValue === "") { 
    // Same for the value
    throw new ReferenceError("Missing value")
  }
  // Must be only 2 things
  if (propertyPlusValue.length < 2 
      || propertyPlusValue.length > 2) {
    throw new SyntaxError("String with 'property, value' needed")
  }
  
  const configFilePath = configYAMLFilePath;
  const configFile = YAML.parseDocument(readFileSync(configFilePath).toString());
  // Must be a property available inside config.yaml
  if (!listOfOptions.includes(property)) {
    console.log(red+`'${
      dimRed +
      property +
      normal+red
    }' is not an option`+normal) // Error
    process.exit()
  }
  
  // Inserts the given value
  switch (property) {
    case "true":
      propertyValue = true
      break;
    case "false":
      propertyValue = false
      break;

    default:
      if (!isNaN(Number(propertyValue))) {
        propertyValue = Number(propertyValue)
      }
      configFile.set(property, propertyValue);
  }
  // Writes the changes to file
  const configFile_toString = YAML.stringify(
    configFile[1], { 
      lineWidth: 0 // Disables folding
    }
  );
  writeFileSync(configFilePath, configFile_toString)
}
const showConfigValues = () => {
  const configFilePath = configYAMLFilePath;
  const configFile = YAML.parse(readFileSync(configFilePath).toString());
  
  console.log(configFile);
}
const showConfigValuesAsTable = () => {
  const configFilePath = configYAMLFilePath;
  const configFile = YAML.parse(readFileSync(configFilePath).toString());
  
  console.table(configFile);
}
const resetConfigFile = () => {
  const defaultFilePath = join(__dirname, "config_default.yaml");
  copyFileSync(defaultFilePath, configYAMLFilePath)
}
const deleteCache = () => {
  // code...
}
const help = () => {
  const helpText = `${underline}fixRetroarchImagePlaylist${normal}
  ${dimGrayBold}Fixes RetroArch's image playlist file${normal}
  
  Available parameters:
    ${green}--config${normal}, ${green}-c${normal}, ${green}/c${normal}:
      ${dimGray+italics}Modifies the config.yaml by asking for the playlist file${normal}
      ${dimGray+italics}and the path to where the screenshots are being saved by RetroArch${normal}
    
    ${green}--config-list${normal}, ${green}-l${normal}, ${green}/l${normal}:
      ${dimGray+italics}It shows all the available options${normal}
      
        ${green}--config-list-table${normal}, ${green}-lt${normal}, ${green}/lt${normal}:
          ${dimGray+italics}Same as above but in ${underline}table form${normal}
      
    ${green}--config-set${normal}, ${green}-s${normal}, ${green}/s${normal}:
      ${dimGray+italics}Sets a new value to an available option with the following syntax:
        
            "<option_name>, <new_value>"${normal}
    
    ${green}--reset${normal}, ${green}-r${normal}, ${green}/r${normal}:
      ${dimGray+italics}Resets the config file back to default${normal}
      
    ${green}--help${normal}, ${green}-h${normal}, ${green}/h${normal}, ${green}/?${normal}:
      ${dimGray+italics}Shows this help message${normal}
  `
  console.log(helpText)
  // It'll be inserted at a later date
  // ${green}--delete-cache${normal}, ${green}-d${normal}, ${green}/d${normal}:
//       ${dimGray+italics}Deletes all the cache${normal}
//     
//         ${green}--delete-second-cache${normal}, ${green}-ds${normal}, ${green}/ds${normal}:
//           ${dimGray+italics}Deletes the caches related to ${underline}Named_Boxarts${normal+italics+dimGray}, ${underline}Named_Snaps${normal+italics+dimGray}, ${underline}Named_Titles${normal}
}
const version = () => {
  const packageJSONPath = join(__dirname, "package.json");
  const { version } = JSON.parse(readFileSync(packageJSONPath).toString());
  
  console.log(`${green + version + normal}`)
}

export default actUpOnPassedArgs