// MAGARI USARE GIT LOCALMENTE PER TENERE UNA VERSIONE FUNZIONANTE? (In inglese però)
// FAR SI CHE NEI PROMPT CI SIA I RITENTI IN CASO I RISULTATI SONO 0

import fs from "fs"
import path from "path"
import https from "https"
import inquirer from "inquirer"
import * as nodeHtmlParser from "node-html-parser"
let pathPerLeImmagini = "../../storage/downloads/"
const sleep = time => {
  return new Promise(resolve => {
    setTimeout(() => resolve(), time);
  })
}
  
// Ottiene il file HTML della pagina
var listaPrincipale_fetch;
const ottieniPagina = async () => {
  const urlLista = "https://thumbnails.libretro.com/"
  listaPrincipale_fetch = await fetch(urlLista);
}

try {
  await ottieniPagina()
} catch {
  console.log("\nTento di nuovo a scaricare la pagina...")
  await sleep(1000)
  await ottieniPagina()
}

// Se la richiesta del file della pagina è andata bene
if (listaPrincipale_fetch.status == 200) {
  const listaPrincipale = await listaPrincipale_fetch.text();
  
  // Ottiene la lista di piattaforme
  const parsedDOM = nodeHtmlParser.parse(listaPrincipale);
  const parsedLinks = nodeHtmlParser.parse(parsedDOM.querySelectorAll("body pre")[0].text)
  
  // Chiede all'utente una piattaforma da cercare
  await inquirer
  .prompt({
    name: "piattaforma",
    message: "Quale piattaforma?"
  })
  .then(answer => entraPiattaforma(parsedLinks, answer))
}

async function entraPiattaforma(parsedLinks, answer) {
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
  
  // Chiede all'utente di 
  // scegliere tra quelle trovate
  await inquirer
    .prompt({
      type: "list",
      name: "piattaformeTrovate",
      message: "Trovate le seguenti:",
      choices: piattaformeTrovate
    })
    .then(answer => sceltaGioco(answer.piattaformeTrovate))
}

async function sceltaGioco(piattaforma) {
  var listaGiochi_fetch;
  const giochiTrovati = [];
  // Ottiene la lista d'immagini dei giochi
  const ottieniPaginaGiochi = async () => {
    const urlLista = `https://thumbnails.libretro.com/${encodeURI(piattaforma)}Named_Titles/`
    listaGiochi_fetch = await fetch(urlLista);
  }
  
  let rawDOM;
  try {
    await ottieniPaginaGiochi()
    rawDOM = await listaGiochi_fetch.text();
  } catch {
    console.log("\nTento di nuovo di scaricare la pagina...")
    await sleep(1000)
    await ottieniPaginaGiochi()
    rawDOM = await listaGiochi_fetch.text();
  }
  
  let parsedDOM = nodeHtmlParser.parse(rawDOM)
  let parsedLinks = nodeHtmlParser.parse(parsedDOM.querySelectorAll("body pre")[0].text);
  
  
  await inquirer
  .prompt({
    name: "gioco",
    message: "Quale gioco?"
  })
  .then(answer => {
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
  
  await inquirer
    .prompt({
      type: "list",
      name: "giochiTrovati",
      message: "Trovati i seguenti:",
      choices: giochiTrovati
    })
    .then(answer => {
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