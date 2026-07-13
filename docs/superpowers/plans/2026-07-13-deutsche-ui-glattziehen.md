# Deutsche UI glattziehen (KLINGE / bellepoule-de) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nach einem Upstream-Sync (#1118 → #1281) alle im Produktionscode hardcoded französischen UI-Strings auf das i18n-System (`t()` + de.json) umbauen, sodass die App bei Sprache = Deutsch konsequent deutsch anzeigt.

**Architecture:** Der Sync selbst ist ein reiner `git merge upstream/dev` mit unserer Konfliktstrategie (`.tsx` → `--ours` für unsere `t()`-Calls, `build-de.yml`/`track-downloads.yml` → `--ours`, `de.json`/`en.json` → upstream nehmen). Danach ein mechanischer Refactor: 53 hardcoded französische Strings in 39 Komponenten durch `t('<korrekter-key>')` ersetzen. 26 dieser Dateien importieren `t()`/useTranslation noch gar nicht und brauchen zusätzlich den Import + Hook-Aufruf.

**Tech Stack:** Electron + React + TypeScript. i18n über `TranslationContext` (`src/renderer/contexts/TranslationContext.tsx`), Hook-Re-Export via `src/renderer/hooks/useTranslation.ts`. Sprachdateien in `src/renderer/locales/{de,en,fr,...}.json`.

## Globale Constraints (aus memory.md + Projektrealität)

- **Repos:** `origin` = TouchePro/bellepoule-de (unser Arbeitsrepo, Branch `dev`), `upstream` = klinnex/bellepoule-modern (Branch `dev`), `fork` = TouchePro/bellepoule-modern (PR-Kanal). Basis immer `upstream/dev`, NICHT main.
- **Keine Rebrands, keine eigenen Features** — nur Übersetzung pflegen. KLINGE bleibt interner Name.
- **de.json ist Nicht-Besitz:** Seit PR #574 (28.05.) liegt de.json im Upstream. Bei Sync IMMER die upstream-de.json übernehmen (nicht unsere drüberkopieren), danach nur Lücken füllen.
- **Build-Nummer:** wird bei `npm start` automatisch inkrementiert (version.json + package.json) — beim Sync-Commit NICHT anfassen.
- **Sandbox-Fix (einmalig, nur falls nötig, macht Holger selbst):** `cd node_modules/electron/dist && sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox`
- **Konfliktauflösung:**
  - `.tsx`-Komponenten mit `t()`-Calls → `git checkout --ours`
  - `build-de.yml` / `track-downloads.yml` → `git checkout --ours` (unsere CI steht)
  - `de.json` / `en.json` → `git checkout --theirs` (upstream-Version)
  - Neuer Hook im Komponentenbody, der auch `t` nutzt → beide Imports manuell mergen
- **Fenster nicht verschmälern / keine Architektur umwerfen.** Nur Strings ersetzen.
- **Tests:** `*.test.tsx` dürfen französische erwartete Strings behalten — die testen i18n-Fallback, nicht die Produktion. Nicht anfassen.

## Mapping-Tabelle: FR-String → korrekter de.json-Key

Diese Tabelle ist die Single Source of Truth für Task 4. Alle Werte existieren in de.json (verifiziert am 13.07., 325 Keys, danach +3 aus upstream = 328).

| Französisch | Deutsch (de.json-Wert) | Key |
|---|---|---|
| Annuler | Abbrechen | `actions.cancel` |
| Fermer | Schließen | `actions.close` |
| Valider | Bestätigen | `actions.confirm` |
| Effacer | Zurücksetzen | `actions.reset` |
| Modifier | Bearbeiten | `actions.edit` |
| Supprimer | Löschen | `actions.delete` |
| Ajouter | Hinzufügen | `actions.add` |
| Rechercher | Suchen | `actions.search` |
| Importer | Importieren | `actions.import` |
| Exporter | Exportieren | `actions.export` |
| Oui | Ja | `actions.yes` |
| Non | Nein | `actions.no` |
| Tableau | Direktausscheidungen | `phases.tableau` |
| Poules | Gruppenphase | `phases.pools` |
| Compétition | Wettbewerb | `competition.new` (Titel-Kontext) bzw. `menu.new_competition` |
| Connexion: | Verbindung: | `remote.connected` / `messages.connection_*` je Kontext — hier generisch `remote.connect` |
| Paramètres | Einstellungen | `settings.title` |

Hinweis `Connexion:`: In `OfflineStatus.tsx:142` steht `>Connexion:<` als Label vor einem Status. Übersetzen mit `t('remote.connect')` (= "Verbinden") oder als statisches Label. Im Plan als `remote.connect` hinterlegt; bei Abweichung im Review anpassen.

## Datei-Struktur (was angefasst wird)

- `src/renderer/locales/de.json` — nach Sync: Lücken gegen en.json füllen (erwartet +3 Keys aus upstream, ggf. mehr).
- `src/renderer/locales/en.json` — nach Sync: upstream-Version (keine Änderung nötig).
- 39 `.tsx` in `src/renderer/components/**` — hardcoded FR → `t()`.
- 26 davon zusätzlich: `import { useTranslation } from '../hooks/useTranslation';` (relativer Pfad je Datei!) + `const { t } = useTranslation();`.
- `version.json` / `package.json` — NICHT anfassen (Build-Inkrement bei npm start).

## Vorgehen im Überblick

1. Backup V7 anlegen (vor jedem Sync Pflicht).
2. Sync #1118 → #1281 (merge upstream/dev, Konflikte wie oben lösen).
3. de.json-Diff gegen en.json, fehlende Keys übersetzen.
4. 53 hardcoded FR-Strings in 39 Dateien auf `t()` umbauen (Mapping-Tabelle).
5. Build + Tests, Verifikation dass App bei DE deutsch ist.
6. Commit + Push auf `origin/dev`.

---

### Task 1: Backup V7 anlegen

**Files:**
- Create: `/home/holger/projects/active/klinge/backups/V7/` (Kopie von `src/` ohne `node_modules`, `dist`, `.git`)

**Interfaces:**
- Consumes: nichts
- Produces: Rollback-Punkt vor dem Sync

- [ ] **Step 1: Backup von src/ nach V7 (ohne node_modules/dist/.git)**

Run:
```bash
cd /home/holger/projects/active/klinge
mkdir -p backups/V7
rsync -a --exclude=node_modules --exclude=dist --exclude=.git src/ backups/V7/
echo "V7 angelegt: $(du -sh backups/V7 | cut -f1)"
ls backups/V7/src/renderer/locales/de.json
```
Expected: `de.json` existiert in V7, Verzeichnisgröße ohne node_modules (einige MB).

- [ ] **Step 2: Version in V7 dokumentieren**

Run:
```bash
cat backups/V7/src/version.json
git -C src rev-parse HEAD
```
Expected: zeigt Build 1118, Commit `49ce7015...`.

- [ ] **Step 3: Commit (kein git-commit — Backup liegt außerhalb des Repos, nur verifizieren)**

Run: `ls -la backups/V7/src/ | head`
Expected: src-Struktur vorhanden.

---

### Task 2: Upstream-Sync #1118 → #1281

**Files:**
- Modify: `src/` (merge von `upstream/dev`)
- Modifiziert durch Konfliktauflösung: `src/renderer/**/*.tsx`, `src/renderer/locales/de.json`, `src/renderer/locales/en.json`, `.github/workflows/build-de.yml`, `.github/workflows/track-downloads.yml`

**Interfaces:**
- Consumes: `upstream/dev` bereits gefetcht (Build #1281, `git fetch upstream dev` in Vorbereitung gemacht)
- Produces: lokaler `dev` auf #1281, unsere 2 CI-Commits erhalten

- [ ] **Step 1: Merge vorbereiten — sicherstellen dass Working Tree clean**

Run:
```bash
cd /home/holger/projects/active/klinge/src
git status --porcelain
```
Expected: leer (nichts zu committen).

- [ ] **Step 2: Merge upstream/dev**

Run:
```bash
git merge upstream/dev --no-edit
```
Expected: Merge startet, meldet Konflikte (CONFLICT) in `.tsx`/`.json`/Workflows — das ist erwartet.

- [ ] **Step 3: Konflikte auflösen — Strategie anwenden**

Run (für jede Konfliktdatei die Strategie prüfen):
```bash
git diff --name-only --diff-filter=U
```
Für jede Datei in der Liste:
- Wenn `.tsx` mit `t()`-Calls: `git checkout --ours "<datei>"`
- Wenn `de.json` oder `en.json`: `git checkout --theirs "<datei>"`
- Wenn `build-de.yml` oder `track-downloads.yml`: `git checkout --ours "<datei>"`
- Wenn beide Imports (useTranslation + anderer Hook) kollidieren: Datei öffnen, beide Imports manuell behalten, `<<<<<<<`/`=======`/`>>>>>>>` Marker entfernen.

- [ ] **Step 4: Verifizieren dass keine Konfliktmarker übrig sind**

Run:
```bash
grep -rnE "^(<<<<<<<|=======|>>>>>>>)" src/renderer .github 2>/dev/null | wc -l
```
Expected: `0`.

- [ ] **Step 5: de.json/en.json nach dem Merge prüfen (Keys zählen)**

Run:
```bash
node -e "const d=require('./src/renderer/locales/de.json');let n=0;(function w(o){for(const k in o){if(typeof o[k]==='object'&&o[k]!==null)w(o[k]);else n++;}})(d);console.log('de.json Keys nach Merge:',n);"
```
Expected: ~328 (upstream-Wert).

- [ ] **Step 6: Build-Nummer nicht überschreiben — version.json prüfen**

Run: `cat version.json`
Expected: build steht auf einem Wert ≥ 1118 (vom Merge übernommen), nicht von Hand geändert.

- [ ] **Step 7: Commit des Syncs**

Run:
```bash
git add -A
git commit -m "chore: upstream sync Build #1118 → #1281"
```
Expected: Commit erstellt, `git log -1` zeigt die Message.

---

### Task 3: de.json Lücken gegen en.json füllen

**Files:**
- Modify: `src/renderer/locales/de.json`

**Interfaces:**
- Consumes: en.json (vollständige Referenz), de.json nach Merge
- Produces: de.json vollständig (jeder en.json-Key hat deutschen Wert)

- [ ] **Step 1: Fehlende Keys ermitteln**

Run:
```bash
cd /home/holger/projects/active/klinge/src
node -e "
const d=require('./src/renderer/locales/de.json');
const e=require('./src/renderer/locales/en.json');
const df={};(function w(o,p){for(const k in o){const np=p?p+'.'+k:k;if(typeof o[k]==='object'&&o[k]!==null)w(o[k],np);else df[np]=o[k];}})(d);
const ef={};(function w(o,p){for(const k in o){const np=p?p+'.'+k:k;if(typeof o[k]==='object'&&o[k]!==null)w(o[k],np);else ef[np]=o[k];}})(e);
const miss=Object.keys(ef).filter(k=>!(k in df));
console.log('Fehlend:',miss.length); console.log(miss.join('\n'));
"
```
Expected: Liste fehlender Keys (vermutlich 0, da upstream de.json bereits voll — falls >0, diese übersetzen).

- [ ] **Step 2: Falls fehlende Keys > 0: ins de.json einfügen**

Für jeden fehlenden Key den deutschen Wert an der korrekten Stelle einfügen (Struktur an en.json orientieren). Beispiel für Key `xyz.abc` mit Wert "Beispiel":
```json
"xyz": { "abc": "Beispiel" }
```
Keine englischen Werte stehen lassen.

- [ ] **Step 3: JSON-Validität prüfen**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('./src/renderer/locales/de.json','utf8')); console.log('de.json gültig');"
```
Expected: `de.json gültig`.

- [ ] **Step 4: Commit (nur falls Änderung)**

Run:
```bash
git add src/renderer/locales/de.json
git commit -m "i18n: fill missing de.json keys from en.json"
```
Expected: nur bei Änderung ein Commit.

---

### Task 4: Hardcoded FR-Strings auf t() umbauen

**Files:**
- Modify: 39 `.tsx` in `src/renderer/components/**` (Liste siehe unten)
- 26 davon zusätzlich: `useTranslation`-Import + Hook (relativer Pfad!)

**Interfaces:**
- Consumes: Mapping-Tabelle oben, de.json (alle Keys vorhanden)
- Produces: konsequent deutsche UI bei Sprache=DE

**Voraussetzung:** Für jede Datei prüfen ob `t` verfügbar ist:
```bash
grep -qE "useTranslation|const \{ t \}" "<datei>" && echo "HAT t" || echo "BRAUCHT import"
```

**Import-Snippet (relativen Pfad anpassen!):**
```ts
import { useTranslation } from '../hooks/useTranslation';
```
und im Funktionsbody (bei FCs) bzw. vor der JSX:
```ts
const { t } = useTranslation();
```

**Die 39 Dateien mit FR-Strings (aus Grep am 13.07.):**

| Datei | FR-Strings (Zeilen) | braucht Import? |
|---|---|---|
| AboutModal.tsx | Fermer (247) | ja |
| AddFencerToPoolModal.tsx | Ajouter (103), Rechercher (124,125) | ja |
| AnalyticsDashboard.tsx | Exporter (346) | ja |
| CommandPalette.tsx | Rechercher (128) | nein (prüfen) |
| common/NumericKeypad.tsx | Valider (100), Effacer (81) | ja |
| CompetitionPropertiesModal.tsx | Compétition (312) | nein (prüfen) |
| ConflictResolutionModal.tsx | Fermer (40) | ja |
| EditFencerModal.tsx | Modifier (53), Non (116,180) | ja |
| FencerList.tsx | Importer (432), Exporter (560,708), Modifier (827), Supprimer (899) | nein (hat t) |
| FencerPhoto.tsx | Supprimer (205), alert FR (96,129) | ja |
| FFEConnectModal.tsx | Importer (94) | ja |
| formula/FormulaBuilder.tsx | Ajouter (172,180,188) | ja |
| formula/FormulaPhaseCard.tsx | Supprimer (116), Tableau (302) | ja |
| formula/FormulaSimulationPreview.tsx | Tableau (60) | ja |
| formula/ScoringZoneEditor.tsx | Supprimer (126) | ja |
| HistoricalStats.tsx | Compétition (120) | ja |
| KioskDisplay.tsx | Tableau (1114) | ja |
| OfflineStatus.tsx | Connexion: (142) | ja |
| pool/PoolMatchList.tsx | Annuler (518) | ja |
| pool/PoolScoreMatrix.tsx | Annuler (354,355) | ja |
| PoolRankingView.tsx | Exporter (350,357) | ja |
| PoolView.tsx | Annuler (1190,1191), Exporter (1219), Ajouter (1243) | ja |
| QRCodeShare.tsx | Fermer (163) | ja |
| RefereeManager.tsx | Ajouter (218), Supprimer (335) | ja |
| tableau/TableauToolbar.tsx | Exporter (199,218) | ja |
| TableauView.tsx | Tableau (1317), Non (1499) | ja |
| ThemeEditor.tsx | Importer (341), Exporter (344,347? zeile 428 Supprimer) | ja |
| WifiQRModal.tsx | Fermer (103,179) | ja |
| WikiModal.tsx | Fermer (684) | ja |
| XiaomiRemotePanel.tsx | Annuler (418) | ja |

(Hinweis: CommandPalette.tsx und CompetitionPropertiesModal.tsx ggf. schon mit t() — vor Änderung prüfen, ob der FR-String dort wirklich hardcoded steht oder schon via t() läuft. Falls schon t(): nicht anfassen.)

**Ersetzungsregeln (pro Datei):**
- `title="Fermer"` → `title={t('actions.close')}`
- `aria-label="Fermer"` → `aria-label={t('actions.close')}`
- `>Fermer<` (Button-Text) → `{t('actions.close')}`
- `title="Annuler"` / `aria-label="Annuler"` → `t('actions.cancel')`
- `aria-label="Valider"` → `aria-label={t('actions.confirm')}`
- `aria-label="Effacer"` → `aria-label={t('actions.reset')}`
- `>Modifier<` / `title="Modifier"` → `t('actions.edit')`
- `title="Supprimer"` → `t('actions.delete')`
- `>Ajouter<` / `title="Ajouter"` → `t('actions.add')`
- `placeholder="Rechercher..."` / `aria-label="Rechercher..."` → `t('actions.search')`
- `title="Importer"` → `t('actions.import')`
- `title="Exporter"` → `t('actions.export')`
- `>Non<` / `placeholder="Non"` → `t('actions.no')`
- `>Tableau<` → `t('phases.tableau')`
- `>Compétition<` → `t('competition.new')` (oder `menu.new_competition` je Kontext — beim Review entscheiden)
- `>Connexion:<` → `{t('remote.connect')}:`

**Wichtig bei `FencerPhoto.tsx` alert():** Die `alert('Veuillez ... image valide')` sind Browser-Alerts. Diese über `t()` ersetzen:
```ts
alert(t('fencer.photo_invalid_select'));   // Key ggf. in de.json anlegen
alert(t('fencer.photo_invalid_drop'));
```
Falls die Keys in de.json fehlen: in Task 3 ergänzen (deutsche Werte "Bitte wählen Sie ein gültiges Bild" / "Bitte legen Sie ein gültiges Bild ab").

- [ ] **Step 1: Pro Datei prüfen ob Import fehlt**

Run (für alle 39):
```bash
for f in AboutModal AddFencerToPoolModal AnalyticsDashboard common/NumericKeypad ConflictResolutionModal EditFencerModal FencerPhoto FFEConnectModal formula/FormulaBuilder formula/FormulaPhaseCard formula/FormulaSimulationPreview formula/ScoringZoneEditor HistoricalStats KioskDisplay OfflineStatus pool/PoolMatchList pool/PoolScoreMatrix PoolRankingView PoolView QRCodeShare RefereeManager tableau/TableauToolbar TableauView ThemeEditor WifiQRModal WikiModal XiaomiRemotePanel; do
  file="src/renderer/components/$f.tsx"
  grep -qE "useTranslation|const \{ t \}" "$file" || echo "BRAUCHT IMPORT: $f"
done
```
Expected: Liste der Dateien ohne t (sollte ~26 ergeben).

- [ ] **Step 2: Import + Hook in jede "BRAUCHT IMPORT"-Datei einfügen**

Für jede: Import-Zeile nach den anderen `import ... from 'react'`-Zeilen einfügen (relativer Pfad! `../hooks/useTranslation` für `components/*.tsx`, `../../hooks/useTranslation` für `components/sub/*.tsx`). Und `const { t } = useTranslation();` direkt nach der Funktions-Signatur / vor dem ersten `return`.

- [ ] **Step 3: FR-Strings ersetzen (Mapping-Tabelle + Regeln)**

Jede Ersetzung mit Edit-Tool. Beispiel AboutModal.tsx:247:
```diff
-        <button style={styles.closeBtn} onClick={onClose} title="Fermer">✕</button>
+        <button style={styles.closeBtn} onClick={onClose} title={t('actions.close')}>✕</button>
```

- [ ] **Step 4: Keine Konfliktmarker / keine FR-Reststrings mehr**

Run:
```bash
grep -rnoE "(>|placeholder=\"|title=\"|aria-label=\"|>)(Annuler|Fermer|Valider|Rechercher|Connecté|Connexion|Oui|Non|Tableau|Poules|Paramètres|Compétition|Supprimer|Ajouter|Modifier|Importer|Exporter|Effacer)[^a-zA-Z]" src/renderer/components --include=*.tsx | grep -v "\.test\.tsx" | grep -v "__tests__" | wc -l
```
Expected: `0`.

- [ ] **Step 5: TypeScript-Build prüfen**

Run:
```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: keine Fehler (oder nur unabhängige Warnungen, keine durch unsere Änderungen).

- [ ] **Step 6: Commit**

Run:
```bash
git add src/renderer/components/
git commit -m "i18n: replace hardcoded French UI strings with t() calls"
```
Expected: Commit erstellt.

---

### Task 5: Build + Tests + Verifikation

**Files:**
- keine neuen — Verifikation nur
- Modify (falls nötig): de.json Keys für FencerPhoto-Alerts

**Interfaces:**
- Consumes: gebauter Stand nach Task 2-4
- Produces: nachweislich deutsche UI bei DE

- [ ] **Step 1: Unit-Tests der betroffenen Komponenten laufen lassen**

Run:
```bash
npx vitest run src/renderer/components 2>&1 | tail -25
```
Expected: Tests grün (die `.test.tsx` erwarten FR-Strings via i18n-Fallback — bleiben bestehen, da bei Test-Default evtl. fr).

- [ ] **Step 2: App-Build (npm start baut vor Start)**

Run (im AnyDesk-Terminal auf Mini-PC — hier nur Trockencheck):
```bash
npx tsc --noEmit && echo "TS OK"
```
Expected: TS OK.

- [ ] **Step 3: Verifikation der deutschen Anzeige (Holger testet im AnyDesk-Terminal)**

Anleitung an Holger:
1. `cd ~/projects/active/klinge/src && npm start`
2. Sprache auf Deutsch stellen (Einstellungen → Sprache: Deutsch)
3. Prüfen: Modale (Fermer/Annuler → Schließen/Abbrechen), Fencer-Liste (Importer/Exporter/Modifier/Supprimer → Importieren/Exportieren/Bearbeiten/Löschen), Pool-View (Ajouter/Annuler → Hinzufügen/Abbrechen), Tableau-Labels (Tableau → Direktausscheidungen)
4. Bestätigen dass KEINE französischen UI-Texte mehr bei DE erscheinen.

- [ ] **Step 4: Finaler Commit + Push**

Run:
```bash
git status --porcelain
git push origin dev
gh run list --repo TouchePro/bellepoule-de --limit 3
```
Expected: push erfolgreich, Actions-Run startet (build-de.yml baut macOS DMGs).

---

## Self-Review (Checkliste)

1. **Spec coverage:** Sync (#1118→#1281) ✓ Task 2. de.json-Lücken ✓ Task 3. FR-Strings ✓ Task 4 (53 Stellen). Build/Verifikation ✓ Task 5. Backup ✓ Task 1.
2. **Placeholder scan:** Keine "TBD". Alle Ersetzungen mit konkretem Code. FencerPhoto-Alerts haben konkrete Keys + deutsche Werte vorgegeben.
3. **Type consistency:** `t()`-Signatur aus TranslationContext (`t: (key, params?) => string`) durchgängig. `useTranslation` aus `../hooks/useTranslation` (Re-Export) konsistent. Relative Pfade bewusst pro Datei-Ebene unterschiedlich — im Step 2 explizit vermerkt.
4. **Risiko:** CommandPalette.tsx / CompetitionPropertiesModal.tsx ggf. schon mit t() — Step "prüfen ob hardcoded" eingebaut. Upstream-sync Konflikte: Strategie in Task 2 Step 3 festgelegt.
