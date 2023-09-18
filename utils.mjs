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
  // $& —→ tutta la stringa identificata
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

// Ottiene il file HTML della pagina
const ottieniPagina = async (url, wantBody = false, timeout = 1, tentativi = 1) => {
  const time = (timeout ** 2);
  const timeInMs = time * 1000;
  
  try {
    let fetched_data = await fetch(url, {
      signal: AbortSignal.timeout(timeInMs)
    })
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
        || err.name === "TimeoutError") {
      // Massimo di tentativi prima che si chiude in modo fatale
      if (tentativi === 4) { 
        console.log(`${red}Impossible stabilire una connessione col server dopo ${
            normal+underline + 
            time
          }s${normal}\n`)
        return process.exit();
      }
      
      // In caso fallisce, ritenta
      if (tentativi > 2) clearLastLines([0, -4])
      if (time > 1) {
        console.log(
          `${dimGray}Fallita la richiesta dopo ${
            normal+underline + 
            time
          }s${normal+dimGray} della pagina:`,
          `\n    "${(url > strLimit) ? url.substr(0, strLimit-3)+"..." : url}"`, 
          `\n        tento di nuovo...${normal}\n`
        )
      }
      return await ottieniPagina(url, false, timeout + 1, tentativi + 1);
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
  ottieniPagina
}