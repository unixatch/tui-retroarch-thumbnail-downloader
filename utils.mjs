import { dirname } from "path"
import { fileURLToPath } from "url"

import { convert } from "html-to-text"

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
  getURL
}