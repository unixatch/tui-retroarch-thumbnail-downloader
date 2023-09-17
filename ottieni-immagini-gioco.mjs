#!/usr/bin/env node
// USA I BOOKMARK❗

import fs from "fs"
import path from "path"

import inquirer from "inquirer"
import inquirerSearchList from "inquirer-search-list"
import confirm from '@inquirer/confirm'
import YAML from "yaml"
import actUpOnPassedArgs from "./cli.mjs"
import configYAMLFilePath from "./createConfigYAML.mjs"
import {
  declareColors,
  escapeRegExp,
  sleep,
  strLimit,
  addRemove_quitPress,
  clearLastLines,
  ottieniPagina
} from "./utils.mjs"
inquirer.registerPrompt('search-list', inquirerSearchList);

// In case the user passes some arguments
await actUpOnPassedArgs(process.argv)

// Options
const configPath = configYAMLFilePath;
const { 
  pathPerLeImmagini,
  preloadPages,
  // cache,
//   cacheFrequency
} = YAML.parse(fs.readFileSync(configPath).toString());

let isBackAction = {
  normal: false,
  increased: false
};
declareColors()


const listaPrincipale = await ottieniPagina("https://thumbnails.libretro.com/");
// All platforms in an array 
// with "INDEX OF /" and "../" removed
const regex = new RegExp(".*\/", "gi");
const matchAllResults = [
  ...listaPrincipale.matchAll(regex)
].map(platform => platform[0]);

matchAllResults.splice(0, 2)

// Chiede all'utente una piattaforma da cercare
let platform;
let isSamePlatform = false;
const richiestaPiattaforma = async () => {
  if (isBackAction.normal) {
    clearLastLines([0, -2])
  } else if (isBackAction.increased) {
    clearLastLines([0, -8])
    isBackAction.normal = true
    isBackAction.increased = false
  }
  addRemove_quitPress("open")
  await inquirer.prompt({
    type: "search-list",
    name: "platform",
    message: "Quale piattaforma?",
    suffix: `${dimGray}\n(Press ctrl-q to quit)${normal}`,
    choices: matchAllResults,
    pageSize: 20
  })
  .then(answer => {
    addRemove_quitPress("close")
    if (platform === answer.platform) return isSamePlatform = true;
    platform = answer.platform
  })
  if (isBackAction.normal) return await sceltaGioco(true);
}
await richiestaPiattaforma();

let pageURLs = {
  Named_Snaps: `https://thumbnails.libretro.com/${encodeURI(platform)}Named_Snaps/`,
  Named_Boxarts: `https://thumbnails.libretro.com/${encodeURI(platform)}Named_Boxarts/`,
  Named_Titles: `https://thumbnails.libretro.com/${encodeURI(platform)}Named_Titles/`
}
let rawPageTexts = {
  Named_Snaps: "",
  Named_Boxarts: "",
  Named_Titles: ""
}
const pageNames = Object.keys(pageURLs);

let formattedGameNames;
async function sceltaGioco(wentBack) {
  const nomiTrovati = {
    Named_Snaps: "",
    Named_Boxarts: "",
    Named_Titles: ""
  }
  // Resets isBackAction, urls and rawTexts if
  // the user went back to select a new platform
  // and it's not again the old one.
  if (isBackAction.normal) isBackAction.normal = false;
  if (wentBack && !isSamePlatform) {
    pageURLs.Named_Snaps = `https://thumbnails.libretro.com/${encodeURI(platform)}Named_Snaps/`
    pageURLs.Named_Boxarts = `https://thumbnails.libretro.com/${encodeURI(platform)}Named_Boxarts/`,
    pageURLs.Named_Titles = `https://thumbnails.libretro.com/${encodeURI(platform)}Named_Titles/`

    rawPageTexts.Named_Snaps =
    rawPageTexts.Named_Boxarts =
    rawPageTexts.Named_Titles = ""
  } else isSamePlatform = false;
  
  // Preloads all pages if enabled
  if (!/true|false/.test(preloadPages.toString())) {
    console.log(`${yellow}preloadPages is neither true or false${normal}`)
  }
  if (preloadPages) {
    pageNames.forEach(async (name) => {
      rawPageTexts[page] = await ottieniPagina(pageURLs[page]);
    })
  }
  
  let indexForOf = 0;
  for (const page of pageNames) {
    // Skips the download if downloaded once
    if (rawPageTexts[page] === "") {
      rawPageTexts[page] = await ottieniPagina(pageURLs[page]);
    }
    
    // All PNGs inside an array + skip option at top
    const regex = new RegExp(".*\.png", "gi");
    const matchAllResults = [
      ...rawPageTexts[page].matchAll(regex)
    ].map(gamePicFilename => gamePicFilename[0]);
    matchAllResults.unshift(
      "<skip-to-next-page>",
      "<go-back>"
    )
    
    
    let isSameNameAvailable;
    let earlierName;
    if (indexForOf > 0) {
      earlierName = (nomiTrovati[pageNames[indexForOf-1]] === "skip")
        ? "skip"
        : nomiTrovati[pageNames[indexForOf-1]];
      
      if (earlierName !== "skip") {
        isSameNameAvailable = !matchAllResults.every(name => name !== earlierName);
      }
    }
    
    // Skips a prompt and adds to the list 
    // of names if the previous name is
    // found in the current page
    if (!isSameNameAvailable) {
      clearLastLines([0, -2])
      addRemove_quitPress("open")
      await inquirer.prompt({
        type: "search-list",
        name: "gameName",
        message: "Scegli tra uno dei giochi:",
        suffix: `${dimGray}\n(Press ctrl-q to quit)${normal}`,
        choices: matchAllResults,
        pageSize: 20
      })
      .then(answer => {
        addRemove_quitPress("close")
        if (answer.gameName === "<skip-to-next-page>") {
          nomiTrovati[page] = "skip";
        } else nomiTrovati[page] = answer.gameName;
        if (answer.gameName === "<go-back>") return isBackAction.normal = true;
        
        indexForOf += 1;
      })
      if (isBackAction.normal) return await richiestaPiattaforma();
    } else nomiTrovati[page] = earlierName;
  }
  clearLastLines([0, -2])
  formattedGameNames = {
    Screenshot: (nomiTrovati.Named_Snaps.length > strLimit) 
      ? nomiTrovati.Named_Snaps.substr(0, strLimit-6)+"...png" 
      : nomiTrovati.Named_Snaps,
    Boxart: (nomiTrovati.Named_Boxarts.length > strLimit) 
      ? nomiTrovati.Named_Boxarts.substr(0, strLimit-6)+"...png" 
      : nomiTrovati.Named_Boxarts,
    Title_screen: (nomiTrovati.Named_Titles.length > strLimit) 
      ? nomiTrovati.Named_Titles.substr(0, strLimit-6)+"...png" 
      : nomiTrovati.Named_Titles
  }
  console.log(`${bold}This is what will be downloaded${normal}\n${dimGray}(only for displaying it if it's truncated)${normal}`)
  console.log(formattedGameNames)
  const answer = await confirm({
    message: "Proceed?",
    default: true
  })
  if (!answer) {
    isBackAction.increased = true
    return await richiestaPiattaforma();
  } else console.log() // Adds a space
  return nomiTrovati
}
const nomiTrovati = await sceltaGioco();

const download = async nomeGiocoDaScaricare => {
  const { Readable } = await import('stream');
  const { finished } = await import("stream/promises");
  // Scarica le immagini
  for (const n of [1, 2, 3]) {
    const nomeGiocoDaScaricare = nomiTrovati[pageNames[n-1]];
    if (nomeGiocoDaScaricare === "skip") continue;
    
    const pathParse = path.parse(nomeGiocoDaScaricare);
    
    if (typeof pathPerLeImmagini !== "string") {
      throw new TypeError("The path is not in string form")
    }
    if (!fs.existsSync(pathPerLeImmagini)) {
      throw new ReferenceError("Path leads to nowhere")
    }
    const filePath = pathPerLeImmagini + 
                     pathParse.name + 
                     `(${n})` + 
                     pathParse.ext;
    
    // Decide il tipo di copertina
    let tipoDiCopertina = `${pageNames[n-1]}/`;
    const urlPerScaricare = `https://thumbnails.libretro.com/${
      encodeURI(platform) + 
      tipoDiCopertina + 
      encodeURI(nomeGiocoDaScaricare)
    }`;
    
    // Gets a ReadableStream body
    const imgBody = await ottieniPagina(urlPerScaricare, true);
    // Writes to file image
    const fileStream = fs.createWriteStream(filePath);
    try {
      await finished(
        Readable.fromWeb(imgBody).pipe(fileStream)
      )
    } catch (e) {
      console.log(e)
    }
    
    const typeOfImg = Object.keys(formattedGameNames)[n-1];
    console.log(`Downloaded ${bold+underline+typeOfImg+normal} to\n    ${
      dimGray+italics+'"' +
      filePath
    }"${normal}`)
  }
}
await download(nomiTrovati)