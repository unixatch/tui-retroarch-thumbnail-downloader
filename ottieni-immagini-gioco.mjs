import fs from "fs"
import path from "path"
import https from "https"
import inquirer from "inquirer"
import * as nodeHtmlParser from "node-html-parser"
let pathPerLeImmagini = "../../storage/downloads/"
const quitPress = (_, key) => {
  if (key.name === "q") process.exit();
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
    return await fetched_data.text();
  } catch(err) {
    if (err.code === "ERR_SOCKET_CONNECTION_TIMEOUT") {
      // Massimo di tentativi prima che si chiude in modo fatale
      if (tentativi === 6) { 
        console.error("Impossible stabilire una connessione col server")
        return process.exit();
      }
      
      // In caso fallisce, ritenta
      console.log(`Fallita la richiesta della pagina dopo ${time}s, tento di nuovo...`)
      return ottieniPagina(urlLista, timeout + 1, tentativi + 1);
    }
    console.error(err)
  }
}



// Ottiene la lista di piattaforme
const listaPrincipale = await ottieniPagina("https://thumbnails.libretro.com/");
const parsedDOM = nodeHtmlParser.parse(listaPrincipale);
const parsedLinks = nodeHtmlParser.parse(parsedDOM.querySelectorAll("body pre")[0].text)

// Chiede all'utente una piattaforma da cercare
const richiestaPiattaforma = async () => {
  await inquirer
  .prompt({
    name: "piattaforma",
    message: "Quale piattaforma?"
  })
  .then(async (answer) => {
    // Chiude il prompt a richiesta dell'utente
    if (/^(quit|q)(?!=.*)$/i.test(answer.piattaforma)) return process.exit();
    
    const piattaformeTrovate = [];
    const linksLength = parsedLinks.childNodes.length;
    const regex = new RegExp(answer.piattaforma, "gi");
    // Ottiene i risultati
    for (let i=0; i < linksLength; i++) {
      const platform = parsedLinks.childNodes[i].textContent;
      
      if (platform.match(regex)) {
        piattaformeTrovate.push(platform)
      }
    }
    // In caso non trova niente
    if (piattaformeTrovate.length === 0) {
      process.stdout.cursorTo(0);
      process.stdout.clearLine(0);
      return richiestaPiattaforma();
    }
    
    
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
  const rawDOM = await ottieniPagina(`https://thumbnails.libretro.com/${encodeURI(piattaforma)}Named_Snaps/`)
  
  let parsedDOM = nodeHtmlParser.parse(rawDOM)
  let parsedLinks = nodeHtmlParser.parse(parsedDOM.querySelectorAll("body pre")[0].text);
  
  
  const giochiTrovati = [];
  const richiestaGioco = async () => {
    await inquirer
    .prompt({
      name: "gioco",
      message: "Quale gioco?"
    })
    .then(answer => {
      // Chiude il prompt a richiesta dell'utente
      if (/^(quit|q)(?!=.*)$/i.test(answer.gioco)) return process.exit();
      
      const lengthGiochi = parsedLinks.childNodes.length;
      const regex = new RegExp(answer.gioco, "gi");
      // Ottiene i risultati
      for (let i=0; i < lengthGiochi; i++) {
        let gioco = parsedLinks.childNodes[i].textContent;
        
        if (gioco.match(regex)) {
          giochiTrovati.push(gioco)
        }
      }
    })
    // In caso non trova niente
    if (giochiTrovati.length === 0) {
      process.stdout.cursorTo(0);
      process.stdout.clearLine(0);
      return richiestaGioco();
    }
  }
  
  await richiestaGioco()
  
  // Chiude il prompt quando si preme q
  process.stdin.on('keypress', quitPress);
  await inquirer
  .prompt({
    type: "list",
    name: "giochiTrovati",
    message: "Trovati i seguenti:",
    choices: giochiTrovati
  })
  .then(answer => {
    process.stdin.removeListener("keypress", quitPress)
    let nomeGiocoPerScaricare;
    // Ottiene il nome delle
    // copertine da scaricare 
    for (let i=0; i < giochiTrovati.length; i++) {
      const gioco = giochiTrovati[i];
      
      if (gioco === answer.giochiTrovati) {
        nomeGiocoPerScaricare = gioco;
        break
      }
    }
    
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