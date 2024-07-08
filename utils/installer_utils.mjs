import { readFileSync } from "fs"
import {
  parseDocument,
  visit,
  isMap,
  isPair,
  isScalar,
  isDocument
} from "yaml"

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

export { updateUserConfig }