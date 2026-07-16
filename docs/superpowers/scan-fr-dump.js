// Wie scan-fr.js, aber druckt die exakten Fundstellen pro Datei statt nur Zählungen.
// Usage: node scan-fr-dump.js <relative-file-path-in-components>
const fs = require('fs');
const path = require('path');
const COMP = '/home/holger/projects/active/klinge/src/src/renderer/components';

const FR_RE = /[àâäçéèêëîïôöûüùñ’'—]|(^|\s)(le|la|les|une|un|du|des|de|en|pour|vous|votre|tireur|tableau|poule|compét|arbitre|thème|rapport|classement|saisir|supprim|ajout|modif|export|import|fermer|annul|valider|effacer|recherch|connect|param|lecture|seule|résultat|saison|onglet|verrou|final|score|match|groupe|phase|tours?|préc|suiv|actuel|attendu|format|réseau|sécur|mot de passe|nom|type|aucun|aucune|filtrer|chargement|derni|commande|rotation|disponible|aujourd|total|assign|quest|contrôle|vocal|standard|personnalis|carte|genre|sépar|propriété|chrono|touche|gagner|préparation|officiel)\b/i;

const rel = process.argv[2];
if (!rel) { console.error('Usage: node scan-fr-dump.js <relative-path>'); process.exit(1); }
const f = path.join(COMP, rel);
const s = fs.readFileSync(f, 'utf8');
const lines = s.split('\n');

const attrRe = /(title|aria-label|placeholder|label|alt|value)="([^"]*)"/g;
let m;
while ((m = attrRe.exec(s))) {
  if (FR_RE.test(m[2])) {
    const lineNo = s.slice(0, m.index).split('\n').length;
    console.log(`L${lineNo} attr(${m[1]}): "${m[2]}"`);
  }
}
const textRe = />([^<>{}]{3,200})</g;
while ((m = textRe.exec(s))) {
  const t = m[1].trim();
  if (t && FR_RE.test(t) && !/^\d+$/.test(t)) {
    const lineNo = s.slice(0, m.index).split('\n').length;
    console.log(`L${lineNo} text: "${t}"`);
  }
}
