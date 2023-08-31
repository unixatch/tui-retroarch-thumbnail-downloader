// USA I BOOKMARK❗

// Node Modules
import fs from "fs"
import path from "path"
import deepStrictEqual from "assert"
import https from "https"

import inquirer from "inquirer"
const { convert } = await import("html-to-text");

let pathPerLeImmagini = "../../storage/downloads/"
const quitPress = (_, key) => {
  if (key.name === "q") process.exit();
}
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
// Ottiene il file HTML della pagina
const ottieniPagina = async (urlLista, timeout = 1, tentativi = 0) => {
  const time = (timeout ** 2);
  const timeInMs = time * 1000;
  
  try {
    let fetched_data = await fetch(urlLista, {
      signal: AbortSignal.timeout(timeInMs)
    })
    return convert(await fetched_data.text(), {
      selectors: [{ 
        selector: 'a', options: { 
          ignoreHref: true 
        } 
      }]
    })
  } catch(err) {
    if (err?.cause?.code === "ERR_SOCKET_CONNECTION_TIMEOUT" || err.name === "TimeoutError") {
      // Massimo di tentativi prima che si chiude in modo fatale
      if (tentativi === 6) { 
        console.error("Impossible stabilire una connessione col server")
        return process.exit();
      }
      
      // In caso fallisce, ritenta
      console.log(`Fallita la richiesta della pagina dopo ${time}s, tento di nuovo...`)
      return await ottieniPagina(urlLista, timeout + 1, tentativi + 1);
    }
    console.error(err)
    return process.exit();
  }
}



// Chiede all'utente una piattaforma da cercare
const listaPrincipale = await ottieniPagina("https://thumbnails.libretro.com/");
const richiestaPiattaforma = async () => {
  await inquirer
  .prompt({
    name: "piattaforma",
    message: "Quale piattaforma?"
  })
  .then(async (answer) => {
    // Chiude il prompt a richiesta dell'utente
    if (/^(quit|q)(?!=.*)$/i
        .test(answer.piattaforma)) return process.exit();
    if (!answer.piattaforma) return await richiestaPiattaforma();
    
    // [\w\d \-]* ↓ 
    // ogni parola, numero, trattino o spazio
    const regex = new RegExp(
      `.*${escapeRegExp(answer.piattaforma)}.*\/`,
      "gi"
    );
    const matchAllResults = [
      ...listaPrincipale.matchAll(regex)
    ];
    // In caso non trova niente
    if (matchAllResults.length === 0) {
      process.stdout.cursorTo(0);
      process.stdout.clearLine(0);
      return richiestaPiattaforma();
    }
    
    // Ottiene i risultati
    const piattaformeTrovate = [];
    matchAllResults.forEach((platform) => {
      piattaformeTrovate.push(platform[0])
    })
    
    
    // Chiude il prompt quando si preme q
    process.stdin.on('keypress', quitPress);
    // Chiede all'utente di 
    // scegliere tra quelle trovate
    await inquirer
    .prompt({
      type: "list",
      name: "piattaformeTrovate",
      message: "Trovate le seguenti:",
      choices: piattaformeTrovate
    })
    .then(answer => {
      process.stdin.removeListener("keypress", quitPress)
      sceltaGioco(answer.piattaformeTrovate)
    })
  })
}

await richiestaPiattaforma()

async function sceltaGioco(piattaforma) {
  // Ottiene la lista d'immagini dei giochi
  const rawDOMs = {
    Named_Boxarts: await ottieniPagina(`https://thumbnails.libretro.com/${encodeURI(piattaforma)}Named_Boxarts/`),
    Named_Snaps: await ottieniPagina(`https://thumbnails.libretro.com/${encodeURI(piattaforma)}Named_Snaps/`),
    Named_Titles: await ottieniPagina(`https://thumbnails.libretro.com/${encodeURI(piattaforma)}Named_Titles/`)
  }
  
  
  const giochiTrovati = {
    Named_Boxarts: [],
    Named_Snaps: [],
    Named_Titles: []
  };
  const pageNames = Object.keys(giochiTrovati);
  const richiestaGioco = async () => {
    await inquirer
    .prompt({
      name: "giocoRichiesto",
      message: "Quale gioco?"
    })
    .then(async (answer) => {
      // Chiude il prompt a richiesta dell'utente
      if (/^(quit|q)(?!=.*)$/i
          .test(answer.giocoRichiesto)) return process.exit();
      if (!answer.giocoRichiesto) return await richiestaGioco;
      
      const regex = new RegExp(
        `.*${escapeRegExp(answer.giocoRichiesto)}.*\.png`, 
        "gi"
      );
      // Ottiene i risultati
      pageNames.forEach(nomePagina => {
        const pagina = rawDOMs[nomePagina];
        const matchAllResults = [
          ...pagina.matchAll(regex)
        ];
        matchAllResults.forEach(gioco => {
          giochiTrovati[nomePagina].push(gioco[0])
        })
      })
      // In caso non trova niente
      if (giochiTrovati.length === 0) {
        process.stdout.cursorTo(0);
        process.stdout.clearLine(0);
        return richiestaGioco();
      }
    })
  }
  await richiestaGioco()
  
  
  // Controlla se viene trovata la stessa roba su tutte le pagine
  const reducer = (lastArray, pageName) => {
    // Fa un "break" e 
    // ritorna false alla fine
    if (!lastArray) return false
    
    const currentArray = giochiTrovati[pageName];
    const isSame = deepStrictEqual(lastArray, currentArray);
    
    // Per aggiornare 
    // l'accumulatore di reduce
    if (isSame) {
      return listOfPage
    } else return false
  }
  const initialValue = giochiTrovati[pageNames[0]];
  
  const areAllEqual = Array.isArray( 
    pageNames.reduce(reducer, initialValue) 
  ) ? true : false
  
  console.log(areAllEqual, giochiTrovati)
  // Cerca rayman
  process.exit()
  
  // Chiude il prompt quando si preme q
  process.stdin.on('keypress', quitPress);
  await inquirer
  .prompt({
    type: "list",
    name: "gioco",
    message: "Trovati i seguenti:",
    choices: giochiTrovati
  })
  .then(answer => {
    process.stdin.removeListener("keypress", quitPress)
    // Ottiene il nome delle
    // copertine da scaricare
    let nomeGiocoPerScaricare;
    pageNames.forEach((page) => {
      const list = giochiTrovati[page];
      for (const gioco of list) {
        if (gioco === answer.gioco) {
          nomeGiocoPerScaricare = gioco;
          break
        }
      }
    })
    
    // Scarica le immagini
    const pathParse = path.parse(nomeGiocoPerScaricare);
    for (const n of [1, 2, 3]) {
      const fileName = pathPerLeImmagini + pathParse.name + `(${n})` + pathParse.ext;
      const fileStream = fs.createWriteStream(fileName);
      
      // Decide il tipo di copertina
      let tipoDiCopertina;
      switch (n) {
        case 1:
          tipoDiCopertina = "Named_Boxarts/"
          break;
          case 2:
            tipoDiCopertina = "Named_Snaps/"
            break;
            case 3:
              tipoDiCopertina = "Named_Titles/"
              break;
      }
      const urlPerScaricare = `https://thumbnails.libretro.com/${encodeURI(piattaforma) + tipoDiCopertina + encodeURI(nomeGiocoPerScaricare)}`
      
      // Salva su un file
      const request = https.get(urlPerScaricare, (response) => {
        response.pipe(fileStream);
        fileStream.on("finish", () => fileStream.close());
      });
    }
  })
}