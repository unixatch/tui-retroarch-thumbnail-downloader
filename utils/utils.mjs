import { readFileSync } from "fs"
import { dirname } from "path"
import { fileURLToPath } from "url"

import { convert } from "html-to-text"
import {
  parseDocument,
  visit,
  isMap,
  isPair,
  isScalar,
  isDocument
} from "yaml"

const strLimit = 40;
function declareColors() {
  // Custom formatting
  global.normal= "\x1b[0m"
  global.bold= "\x1b[1m"
  global.italics= "\x1b[3m"
  global.underline= "\x1b[4m"
  // Actual colors
  global.yellow= "\x1b[33;1m"
  global.green= "\x1b[32m"
  global.dimGreen= "\x1b[32;2m"
  global.red= "\x1b[31;1m"
  global.dimRed= "\x1b[31;2m"
  global.dimGray= "\x1b[37;2m"
  global.dimGrayBold= "\x1b[37;2;1m"
}
declareColors()
function escapeRegExp(string) {
  // ❗ . * + ? ^ $ { } ( ) | [ ] \ ❗
  // $& —→ the whole string being identified/matched
  return string
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // https://stackoverflow.com/a/6969486
}
const sleep = time => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), time);
  })
}
const onlyUserArgs = args => {
  // Removes the node's exec path and js file path
  args.shift(); args.shift()
  return args;
}

const addRemove_quitPress = (request, func) => {
  const quitPress = (_, key) => {
    if (key.ctrl && key.name === "q") process.exit()
  }
  if (typeof request !== "string") throw new TypeError("Only strings are allowed");
  
  switch (request) {
    case "open":
      // Adds the event 
      process.stdin.on('keypress', quitPress)
      break;
    case "close":
      // Removes the event
      process.stdin.removeAllListeners("keypress")
      break;
    
    default:
      throw new Error("Don't know what you're saying")
  }
}
const clearLastLines = lines => {
  if (!Array.isArray(lines)) throw new TypeError("Didn't give an array");
  let lineX, lineY;
  lines
    .forEach((line, i) => {
      if (typeof line === "string") throw new TypeError(`Gave string "${line}", numbers only allowed`)
      const int = parseInt(line);
      if (isNaN(int)) throw new TypeError("Didn't give a number")
      if (i === 0) {
        lineX = line;
      } else lineY = line;
    })
  process.stdout
    .moveCursor(lineX, lineY);
  process.stdout
    .clearScreenDown();
}

let __filename2 = fileURLToPath(import.meta.url);
const getCurrentFileName = loc => fileURLToPath(loc);
const __dirname = dirname(__filename2);

// Obtains the HTML file of the page
const getURL = async (url, wantBody = false, tries = 1) => {
  const time = (tries ** 2);
  const timeInMs = time * 1000;
  
  try {
    let fetched_data = await fetch(url, {
      signal: AbortSignal.timeout(timeInMs)
    })
    if (time > 4) clearLastLines([0, -4])
    if (wantBody) return await fetched_data.body;
    return convert(await fetched_data.text(), {
      selectors: [{
        selector: 'a', options: {
          ignoreHref: true
        }
      }]
    })
  } catch(err) {
    if (err?.cause?.code === "CERT_HAS_EXPIRED") {
      if (!ignoreExpiredCertificate) {
        console.log(`${red}Couldn't communicate to server due to expired certificate${normal}\n`)
        return process.exit();
      }
    }
    if (err?.cause?.code === "ERR_SOCKET_CONNECTION_TIMEOUT" 
        || err?.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
        || err.name === "TimeoutError"
        || err.name === "AbortError") {
      if (tries > 2) clearLastLines([0, -4])
      // Maximum number of attempts before it fatally closes
      if (tries === 4) { 
        console.log(`${red}Unable to establish a connection with the server after ${
            normal+underline + 
            time
          }s${normal}\n`)
        return process.exit();
      }
      
      // In case it fails, try again
      if (time > 1) {
        console.log(
          `${dimGray}Failed the request of the page after ${
            normal+underline + 
            time
          }s${normal+dimGray}:`,
          `\n    "${(url > strLimit) ? url.substr(0, strLimit-3)+"..." : url}"`, 
          `\n        trying again...${normal}\n`
        )
      }
      return await getURL(url, wantBody, tries + 1);
    }
    console.error(err)
    return process.exit();
  }
}

function updateUserConfig(parsedUserConfig) {
  if (!isDocument(parsedUserConfig)) throw new TypeError("The argument given isn't a parsed yaml document");
  let defaultconfig = parseDocument(readFileSync("config_default.yaml").toString());
  function getCompletePath(pathArray) {
    if (!Array.isArray(pathArray)) throw new TypeError("The argument given isn't an array");
    
    // Returns an array (the whole path) if nested
    // otherwise it returns nothing
    if (pathArray.length > 2) {
      if (!isPair(pathArray[2])) throw new TypeError("Within the given array, there's no starting Pair");
      
      let completePath = [];
      for (let i = 2; i < pathArray.length; i=i+2) {
        completePath.push(pathArray[i].key.value)
      }
      return completePath;
    }
  }
  
  const changes = [];
  // Adding & memorization section
  const defaultConfig_CachedStructure = [];
  visit(defaultconfig, {
    Pair(_, pair, path) {
      // If the user's config doesn't have the current pair
      let completePath = getCompletePath(path);
      const potentiallyMissingPair = new RegExp(`(?<!#.*)${pair.key.value}:`, "g");
      if (!parsedUserConfig.toString()
          .match(potentiallyMissingPair)) {
        parsedUserConfig.addIn(completePath, pair);
        if (changes.length === 0) changes.push("added to");
      }
      
      // Caching/memorization
      if (completePath === undefined) completePath = [];
      if (isScalar(pair.value)) {
        completePath.push(pair.key.value);
        defaultConfig_CachedStructure.push(completePath);
      }
    }
  })
  
  // Moving, removing empty groups and 
  // tag unused parameters section
  function modifyNonMatchingElements() {
    visit(parsedUserConfig, {
      Pair(_, pair, pathOfElement) {
        // In case a map becomes or is empty
        if (isMap(pair.value)
            && pair.value.items.length === 0) {
          if (!changes.includes("cleaned")) changes.push("cleaned");
          return visit.REMOVE;
        }
        // If the user has an unused config parameter
        if (isScalar(pair.value)) {
          const regexForUnusedParam = new RegExp(`(?<!#.*)${pair.key.value}: .*`, "g");
          if (!defaultconfig.toString().match(regexForUnusedParam)) {
            pair.value.comment = "_unused parameter_"
          }
        }
        
        let completePath = getCompletePath(pathOfElement);
        if (completePath === undefined) completePath = [];
        completePath.push(pair.key.value);
        if (completePath.length === 1 && defaultconfig.has(completePath[0])) return;
        
        if (!defaultconfig.hasIn(completePath)) {
          for (let i = 0; i < defaultConfig_CachedStructure.length; i++) {
            const path = defaultConfig_CachedStructure[i];
            const pathWithoutFinalElement = path.slice(0, -1);
            
            // If the element's value is a map and 
            // it has been found, move to new location
            if (isMap(pair.value)) {
              if (pathWithoutFinalElement.includes(pair.key.value)) {
                const path = pathWithoutFinalElement.slice(0, pathWithoutFinalElement.indexOf(pair.key.value)+1);
                const priorMapPath = path.slice(0, -1);
                // Movin'
                parsedUserConfig.deleteIn(completePath);
                parsedUserConfig.addIn(priorMapPath, pair)
                if (!changes.includes("modified")) changes.push("modified")
                modifyNonMatchingElements();
                return visit.BREAK;
              }
              continue;
            }
  
            // If found, move the element to new location
            let finalElement = path[path.length-1];
            if (pair.key.value !== finalElement) continue;
            parsedUserConfig.deleteIn(completePath);
            parsedUserConfig.addIn(pathWithoutFinalElement, pair)
            if (!changes.includes("modified")) changes.push("modified")
            modifyNonMatchingElements();
            return visit.BREAK;
          }
        }
      }
    })
  }
  modifyNonMatchingElements()
  if (changes.length !== 0) {
    return [parsedUserConfig, changes];
  }
  return [parsedUserConfig];
}

export { 
  getCurrentFileName,
  __dirname,
  declareColors,
  escapeRegExp,
  sleep,
  onlyUserArgs,
  strLimit,
  addRemove_quitPress,
  clearLastLines,
  getURL,
  updateUserConfig
}
