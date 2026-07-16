// Präziser als scan-fr.js: schließt Kommentare/Mehrzeiler aus, erfasst zusätzlich
// confirm()/alert()/showToast()-Aufrufe mit FR-Stringliteralen.
const fs = require('fs');
const path = require('path');
const COMP = '/home/holger/projects/active/klinge/src/src/renderer/components';

const FR_RE = /[àâäçéèêëîïôöûüùñ’'—]|(^|\s)(le|la|les|une|un|du|des|de|en|pour|vous|votre|tireur|tableau|poule|compét|arbitre|thème|rapport|classement|saisir|supprim|ajout|modif|export|import|fermer|annul|valider|effacer|recherch|connect|param|lecture|seule|résultat|saison|onglet|verrou|final|score|match|groupe|phase|tours?|préc|suiv|actuel|attendu|format|réseau|sécur|mot de passe|nom|type|aucun|aucune|filtrer|chargement|derni|commande|rotation|disponible|aujourd|total|assign|quest|contrôle|vocal|standard|personnalis|carte|genre|sépar|propriété|chrono|touche|gagner|préparation|officiel)\b/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules' || e.name === '__tests__') continue; walk(p, out); }
    else if (e.name.endsWith('.tsx') && !e.name.endsWith('.test.tsx')) out.push(p);
  }
  return out;
}

const files = walk(COMP);
const perFile = {};

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const rel = path.relative(COMP, f);
  const found = [];

  const attrRe = /(title|aria-label|placeholder|label|alt|value)="([^"]*)"/g;
  let m;
  while ((m = attrRe.exec(s))) {
    if (FR_RE.test(m[2])) {
      const lineNo = s.slice(0, m.index).split('\n').length;
      found.push(`L${lineNo} attr(${m[1]}): "${m[2]}"`);
    }
  }

  // Nur einzeilige JSX-Textknoten (kein \n im Match => keine Kommentar-/Mehrzeiler-Treffer)
  const textRe = />([^<>{}\n]{3,200})</g;
  while ((m = textRe.exec(s))) {
    const t = m[1].trim();
    if (t && FR_RE.test(t) && !/^\d+$/.test(t) && !t.startsWith('//')) {
      const lineNo = s.slice(0, m.index).split('\n').length;
      found.push(`L${lineNo} text: "${t}"`);
    }
  }

  // confirm()/alert()/showToast()-Aufrufe mit FR-String
  const callRe = /(confirm|alert|showToast)\(\s*['"`]([^'"`]{3,200})['"`]/g;
  while ((m = callRe.exec(s))) {
    if (FR_RE.test(m[2])) {
      const lineNo = s.slice(0, m.index).split('\n').length;
      found.push(`L${lineNo} call(${m[1]}): "${m[2]}"`);
    }
  }

  if (found.length) perFile[rel] = found;
}

const fileList = Object.keys(perFile).sort();
let total = 0;
for (const f of fileList) total += perFile[f].length;
console.log('Dateien mit echten FR-Treffern:', fileList.length, ' Gesamt:', total);
console.log('');
let i = 0;
for (const f of fileList) {
  console.log(`${String(++i).padStart(2)}. ${f}  (${perFile[f].length})`);
  for (const line of perFile[f]) console.log(`     ${line}`);
}
