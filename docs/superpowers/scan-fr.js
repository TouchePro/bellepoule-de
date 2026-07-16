const fs = require('fs');
const path = require('path');
const COMP = '/home/holger/projects/active/klinge/src/src/renderer/components';
// de.json flat keys
const de = require('/home/holger/projects/active/klinge/src/src/renderer/locales/de.json');
const df = {};
(function w(o,p){for(const k in o){const np=p?p+'.'+k:k; if(typeof o[k]==='object'&&o[k]!==null)w(o[k],np); else df[np]=o[k];}})(de);

function walk(dir, out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()){if(e.name==='node_modules'||e.name==='__tests__')continue; walk(p,out);} else if(e.name.endsWith('.tsx')&&!e.name.endsWith('.test.tsx'))out.push(p);}return out;}
const files = walk(COMP);

// französische Erkennung: enthält FR-typische Zeichen oder bekannte Wörter
const FR_RE = /[àâäçéèêëîïôöûüùñ’'—]|(^|\s)(le|la|les|une|un|du|des|de|en|pour|vous|votre|tireur|tableau|poule|compét|arbitre|thème|rapport|classement|saisir|supprim|ajout|modif|export|import|fermer|annul|valider|effacer|recherch|connect|param|lecture|seule|résultat|saison|onglet|verrou|final|score|match|groupe|phase|tours?|préc|suiv|actuel|attendu|format|réseau|sécur|mot de passe|nom|type|aucun|aucune|filtrer|chargement|derni|commande|rotation|disponible|aujourd|total|assign|quest|contrôle|vocal|standard|personnalis|carte|genre|sépar|propriété|chrono|touche|gagner|préparation|officiel)\b/i;

const perFile = {};
let totalAttr = 0, totalText = 0;
const sentences = []; // lange Strings (Sätze)
for(const f of files){
  const s = fs.readFileSync(f,'utf8');
  const rel = path.relative(COMP, f);
  // Attribute
  const attrRe = /(title|aria-label|placeholder|label|alt|value)=\"([^\"]*)\"/g;
  let m; const found=[];
  while((m=attrRe.exec(s))){ if(FR_RE.test(m[2])){ found.push('attr:'+m[2]); } }
  // JSX text nodes (grobe Heuristik: >Text< ohne Tags drin, nicht nur Zahl)
  const textRe = />([^<>{}]{3,200})</g;
  while((m=textRe.exec(s))){ const t=m[1].trim(); if(t && FR_RE.test(t) && !/^\d+$/.test(t)){ found.push('text:'+t); } }
  if(found.length){ perFile[rel]=found; totalAttr+=found.filter(x=>x.startsWith('attr:')).length; totalText+=found.filter(x=>x.startsWith('text:')).length; }
}
const fileList = Object.keys(perFile).sort();
console.log('Dateien mit FR:', fileList.length);
console.log('Attribut-FR:', totalAttr, ' Text-FR:', totalText, ' Gesamt:', totalAttr+totalText);
console.log('');
// Batches à ~8 Dateien
let i=0;
for(const f of fileList){
  console.log(`${String(++i).padStart(2)}. ${f}  (${perFile[f].length})`);
}
