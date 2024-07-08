#!/usr/bin/env node
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
  clearLastLines
} from "./utils.mjs"
inquirer.registerPrompt('search-list', inquirerSearchList);

// In case the user passes some arguments
await actUpOnPassedArgs(process.argv)

// Options
const configPath = configYAMLFilePath;
const { 
  downloadDestination,
  preloadPages,
  ignoreExpiredCertificate,
  // cache,
//   cacheFrequency
} = YAML.parse(fs.readFileSync(configPath).toString());
global.ignoreExpiredCertificate = ignoreExpiredCertificate;

// In case the user wants to ignore the certificate
if (ignoreExpiredCertificate) {
  const originalEmitWarning = process.emitWarning;
  process.emitWarning = (warning, options) => {
    if (warning && warning?.includes('NODE_TLS_REJECT_UNAUTHORIZED')) return;

    return originalEmitWarning.call(process, warning, options)
  }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
// Because of the "ignoreExpiredCertificate" option,
// it's here instead of the normal import
const { getURL } = await import("./utils.mjs");

let isBackAction = {
  normal: false,
  increased: false
};
declareColors()


const platformsList = await getURL("https://thumbnails.libretro.com/");
// All platforms in an array 
// with "INDEX OF /" and "../" removed
const regex = new RegExp(".*\/", "gi");
const matchAllResults = [
  ...platformsList.matchAll(regex)
].map(platform => platform[0]);

matchAllResults.splice(0, 2)

// Asks the user to search & select a platform
let platform;
let isSamePlatform = false;
const requestPlatform = async () => {
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
    message: "Which platform?",
    suffix: `${dimGray}\n(Press ctrl-q to quit)${normal}`,
    choices: matchAllResults,
    pageSize: 20
  })
  .then(answer => {
    addRemove_quitPress("close")
    if (platform === answer.platform) return isSamePlatform = true;
    platform = answer.platform
  })
  if (isBackAction.normal) return await thumbnailChoice(true);
}
await requestPlatform();

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
async function thumbnailChoice(wentBack) {
  const foundNames = {
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
      rawPageTexts[name] = await getURL(pageURLs[name]);
    })
  }
  
  let indexForOf = 0;
  for (const page of pageNames) {
    // Skips the download if downloaded once
    if (rawPageTexts[page] === "") {
      rawPageTexts[page] = await getURL(pageURLs[page]);
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
      earlierName = (foundNames[pageNames[indexForOf-1]] === "skip")
        ? "skip"
        : foundNames[pageNames[indexForOf-1]];
      
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
        message: "Choose a thumbnail:",
        suffix: `${dimGray}\n(Press ctrl-q to quit)${normal}`,
        choices: matchAllResults,
        pageSize: 20
      })
      .then(answer => {
        addRemove_quitPress("close")
        if (answer.gameName === "<skip-to-next-page>") {
          foundNames[page] = "skip";
        } else foundNames[page] = answer.gameName;
        if (answer.gameName === "<go-back>") return isBackAction.normal = true;
        
        indexForOf += 1;
      })
      if (isBackAction.normal) return await requestPlatform();
    } else foundNames[page] = earlierName;
  }
  clearLastLines([0, -2])
  formattedGameNames = {
    Screenshot: (foundNames.Named_Snaps.length > strLimit) 
      ? foundNames.Named_Snaps.substr(0, strLimit-6)+"...png" 
      : foundNames.Named_Snaps,
    Boxart: (foundNames.Named_Boxarts.length > strLimit) 
      ? foundNames.Named_Boxarts.substr(0, strLimit-6)+"...png" 
      : foundNames.Named_Boxarts,
    Title_screen: (foundNames.Named_Titles.length > strLimit) 
      ? foundNames.Named_Titles.substr(0, strLimit-6)+"...png" 
      : foundNames.Named_Titles
  }
  console.log(`${bold}This is what will be downloaded${normal}\n${dimGray}(only for displaying it if it's truncated)${normal}`)
  console.log(formattedGameNames)
  const answer = await confirm({
    message: "Proceed?",
    default: true
  })
  if (!answer) {
    isBackAction.increased = true
    return await requestPlatform();
  } else console.log() // Adds a space
  return foundNames
}
const foundNames = await thumbnailChoice();

const download = async () => {
  const { Readable } = await import('stream');
  const { finished } = await import("stream/promises");
  // Downloads the images\thumbnails
  for (const n of [1, 2, 3]) {
    const thumbnailName = foundNames[pageNames[n-1]];
    if (thumbnailName === "skip") continue;
    
    const pathParse = path.parse(thumbnailName);
    
    if (typeof downloadDestination !== "string") {
      throw new TypeError("The path is not in string form")
    }
    if (!fs.existsSync(downloadDestination)) {
      throw new ReferenceError("Path leads to nowhere")
    }
    const filePath = path.join(downloadDestination, path.sep) + 
                     pathParse.name + 
                     `(${n})` + 
                     pathParse.ext;
    
    // Decides what type of thumbnail
    let thumbnailType = `${pageNames[n-1]}/`;
    const thumbnailURL = `https://thumbnails.libretro.com/${
      encodeURI(platform) + 
      thumbnailType + 
      encodeURI(thumbnailName)
    }`;
    
    // Gets a ReadableStream body
    const imgBody = await getURL(thumbnailURL, true);
    // Writes to file image
    const fileStream = fs.createWriteStream(filePath);
    try {
      await finished(
        Readable.fromWeb(imgBody).pipe(fileStream)
      )
    } catch (e) {
      // Shows the error and deletes the empty file
      // if it even exists that is...
      // + it doesn't show the message below the catch
      if (fs.existsSync(filePath)) {
        fs.readFile(filePath, (err, file) => {
          if (file.length === 0) {
            console.log(`${dimRed}Couldn't create the file "${
              underline +
              thumbnailName +
              normal+red
            }"${normal}`)
            return fs.unlinkSync(filePath);
          }
          console.log(e)
        })
      } else {
        console.log(`${red}The path leads to nowhere,\ncheck your download destination folder${normal}`)
        process.exit()
      }
      break;
    }
    
    const typeOfImg = Object.keys(formattedGameNames)[n-1];
    console.log(`Downloaded ${bold+underline+typeOfImg+normal} to\n    ${
      dimGray+italics+'"' +
      filePath
    }"${normal}`)
  }
}
await download()
