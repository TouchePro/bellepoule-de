# KLINGE i18n Vollständig-Deutsch — Gesamtplan (Agenten-Workflow + Supervisor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development + superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. Jeder Batch wird von einem Opus-Supervisor gegengecheckt.

**Goal:** Alle französischen UI-Strings in der bellepoule-de App (Build #1281) auf das i18n-System (`t()` + de.json) umbauen, sodass die App bei Sprache = Deutsch konsequent deutsch anzeigt.

**Architecture:** Zwei-Phasen-Ansatz. Phase A: Ein dedizierter Agent legt ALLE neu benötigten de.json-Keys an (zentral, damit keine Race-Conditions zwischen Verdrahtungs-Agenten entstehen). Phase B: ~10 Verdrahtungs-Agenten, jeder zuständig für ~8 Komponenten-Dateien, ersetzen hardcodierte FR-Strings durch `t('<key>')`. Jeder Batch wird von einem Opus-Supervisor (model: "opus") auf Korrektheit + Vollständigkeit gegengecheckt. Abschluss: TypeScript-Build + Holger verifiziert im AnyDesk-Terminal.

**Tech Stack:** Electron + React + TypeScript. i18n über `TranslationContext` (`src/renderer/contexts/TranslationContext.tsx`), Hook via `src/renderer/hooks/useTranslation.ts` (Re-Export). Sprachdateien in `src/renderer/locales/{de,en,fr,...}.json`.

---

## Globale Constraints (aus memory.md + Projektrealität — HOHE PRIORITÄT)

- **Repos:** `origin` = TouchePro/bellepoule-de (Branch `dev`, unser Arbeitsrepo), `upstream` = klinnex/bellepoule-modern (`dev`), `fork` = TouchePro/bellepoule-modern (PR-Kanal). Basis immer `upstream/dev`.
- **Keine Rebrands, keine eigenen Features** — nur Übersetzung. KLINGE bleibt interner Name.
- **de.json ist Nicht-Besitz:** liegt seit PR #574 im Upstream. Wir ERWEITERN sie nur (neue Keys), überschreiben sie nie blind. En.json bleibt die kanonische Key-Quelle — jeder neue Key MUSS auch in en.json (mit englischem Wert) existieren, sonst bricht die EN-Parität.
- **Build-Nummer (version.json/package.json):** wird bei `npm start` automatisch inkrementiert — NICHT anfassen.
- **Tests:** `*.test.tsx` / `__tests__/` dürfen französische erwartete Strings behalten (testen i18n-Fallback). Nicht anfassen.
- **Sandbox-Fix (nur falls nötig, macht Holger selbst):** `cd node_modules/electron/dist && sudo chown root:root chrome-sandbox && sudo chmod 4755 chrome-sandbox`
- **Fenster nicht verschmälern:** nur Strings ersetzen, keine Architektur umwerfen, keine unbenutzten Imports (Agenten MÜSSEN prüfen ob `t` schon importiert ist).

## Bestandsaufnahme (gemessen 13.07.2026, Build #1281, post-Sync)

- **763 französische UI-Strings** in **82 Komponenten-Dateien** (`src/renderer/components/**`).
  - 171 als Attributwerte (`title=`, `aria-label=`, `placeholder=`, `label=`, `alt=`, `value=`)
  - 592 als JSX-Textknoten (`>Text<`)
- Davon ~66 einfache UI-Wörter (Annuler, Fermer, Valider, Supprimer, Ajouter, Tableau, Compétition, Poules ...) auf bestehende Keys abbildbar.
- Rest: ganze Sätze + Fachbegriffe (Poule-Setup, Referee, Wifi, Voice, Remote-Score ...) → brauchen NEUE de.json-Keys.
- Größte Brocken: `RemoteScoreManager.tsx` (66), `CompetitionPropertiesModal.tsx` (43), `PoolView.tsx` (34), `XiaomiRemotePanel.tsx` (25), `SeasonRankingView.tsx` (25), `QuestPhaseView.tsx` (22), `SettingsModal.tsx` (23), `TableauView.tsx` (21), `TeamManagerView.tsx` (21), `FencerList.tsx` (22), `RefereeManager.tsx` (20), `KioskDisplay.tsx` (19), `FencerComparison.tsx` (18), `formula/FormulaPhaseCard.tsx` (18), `PoolPrepView.tsx` (16), `pool/PoolScoreMatrix.tsx` (16).

## de.json Key-Konvention (für Phase A)

Neue Keys unter thematischen Namespaces, flach wie im Bestand:
- `ui.*` — generische UI-Labels die keinem Fachbereich zugeordnet sind (z.B. `ui.read_only`, `ui.no_pools`, `ui.previous_pool`, `ui.next_pool`, `ui.same_club`, `ui.filter`, `ui.loading`, `ui.no_result`, `ui.last_entry`, `ui.score`, `ui.arbitre`, `ui.available`, `ui.total`, `ui.assignments`, `ui.today`, `ui.standard`, `ui.custom`, `ui.by_gender`, `ui.properties`, `ui.rotation_report`, `ui.voice_control`, `ui.last_command`, `ui.network_name`, `ui.security_type`, `ui.password`, `ui.open_network`, `ui.quest_round`, `ui.tour_quest`, `ui.ranking_initial`, `ui.direct_to_ranking`, ...)
- `competition.*` — erweitern (z.B. `competition.coupled`, `competition.pools_rounds`, `competition.max_pool_score`, `competition.pool_touches`, `competition.pool_time`, `competition.tableau_max_score`, `competition.tableau_time`, `competition.separate_after_pools`, `competition.standard`, `competition.by_gender_separated`, `competition.custom_formula`, `competition.prep_single_pool`, `competition.fie_order`, `competition.previous_pool`, `competition.next_pool`, `competition.same_club`, `competition.title_props`, ...)
- `pools.*` — erweitern (`pools.no_pools`, `pools.change_pool`, `pools.previous`, `pools.next`, `pools.same_club`, ...)
- `remote.*` — erweitern (bereits: `remote.connect`, `remote.connected`, `remote.disconnected`)
- `referee.*` — NEU (`referee.add`, `referee.no_referees`, `referee.no_match`, `referee.rotation_report`, `referee.available`, `referee.assignments`, `referee.today`, `referee.total`, `referee.no_pending`, `referee.expected_format`, `referee.export_format`, ...)
- `wifi.*` — NEU (`wifi.network_name`, `wifi.security_type`, `wifi.password`, `wifi.open_network`, `wifi.placeholder_password`, ...)
- `voice.*` — NEU (`voice.control`, `voice.last_command`, ...)
- `tableau.*` — erweitern (bereits `tableau.*` vorhanden)
- `remote_score.*` — NEU (für RemoteScoreManager.tsx, 66 Strings — größter Brocken, eigener Namespace)
- `errors.*` — NEU (für ErrorBoundary-Sätze, falls noch nicht vorhanden)
- `kiosk.*`, `quest.*`, `training.*`, `team.*` — erweitern/bereits teils vorhanden

**Regel:** Jeder neue Key bekommt einen deutschen UND einen englischen Wert (in de.json und en.json). Französische Werte NICHT übernehmen.

## Agent-Workflow

### Phase A — de.json Key-Batch (1 Agent, zentral, VOR Phase B)

Ein Agent analysiert die 82 Dateien, extrahiert alle französischen Strings, vergibt Keys nach Konvention, schreibt sie in `de.json` + `en.json`. **Kein anderer Agent darf de.json/en.json anfassen** (zentralisierte Änderung vermeidet Merge-Konflikte). Output: eine vollständige Key-Map `FR-String → key` (als JSON-Datei `docs/superpowers/i18n-keymap.json` abgelegt, damit Verdrahtungs-Agenten sie nutzen können).

### Phase B — Verdrahtung (10 Agenten, parallel pro Batch)

Jeder Agent bekommt ~8 Dateien + die relevante KEy-Map. Ersetzt FR → `t('<key>')`, fügt `useTranslation`-Import + Hook ein WO NOCH NICHT VORHANDEN (Check: `grep useTranslation`), lässt TypeScript-Check der eigenen Dateien laufen.

Batch-Aufteilung (82 Dateien / ~8):
- **Batch 1:** AboutModal, AddFencerModal, AddFencerToPoolModal, AnalyticsDashboard, Bracket, ChangePoolModal, CommandPalette, CompetitionList
- **Batch 2:** CompetitionPropertiesModal, CompetitionView, ConflictResolutionModal, EditFencerModal, ErrorBoundary, FFEConnectModal, FFEExportModal, FencerComparison
- **Batch 3:** FencerList, FencerPhoto, HistoricalStats, KioskDisplay, LiveDashboard, LiveInterPoolRanking, MatchAuditLog, MultiStripManager
- **Batch 4:** NewCompetitionModal, OBSOverlayConfig, OfflineStatus, PdfTemplateEditor, PdfTemplateModal, PhotoBooth, PoolPrepView, PoolRankingView
- **Batch 5:** PoolView, QRCodeShare, QuestPhaseView, RefereeManager, RemoteScoreManager, ResultsView, ScoreAuditLog, SeasonRankingView
- **Batch 6:** SettingsModal, TableauView, TeamManagerView, TeamPoolView, TeamTableauView, ThemeEditor, TiebreakerAnimation, Toast
- **Batch 7:** TouchOptimizedReferee, VoiceScoreController, WifiQRModal, WikiModal, XiaomiRemotePanel, analytics/AnalyticsCharts, common/NumericKeypad, competition/CompetitionHeader
- **Batch 8:** competition/CompetitionNav, competition/ExportCenterModal, competition/KioskScoreEntry, competition/PlanningAssistant, formula/FormulaBuilder, formula/FormulaPhaseCard, formula/FormulaSimulationPreview, formula/FormulaTemplateModal
- **Batch 9:** formula/RankingCriteriaEditor, formula/ScoringZoneEditor, pool/GlobalPoolColumnsMenu, pool/PoolMatchList, pool/PoolMatchOrderModal, pool/PoolScoreMatrix, pool/WindowSizePresets, tableau/ConsolationBracketsSection
- **Batch 10:** tableau/SeedingTable, tableau/TableauArenaModal, tableau/TableauPdfModal, tableau/TableauRefereeModal, tableau/TableauScoreModal, tableau/TableauToolbar, training/TrainingLauncherModal, training/TrainingPanel, wiki/WikiArticleRenderer

### Phase C — Supervisor-Check (Opus, pro Batch + final)

Nach jedem Batch: Opus-Agent (`model: "opus"`) prüft die geänderten Dateien des Batches:
1. Kein französischer String mehr in den Dateien (Grep).
2. Jeder `t('<key>')` referenziert einen Key der in de.json existiert.
3. `useTranslation`-Import nicht doppelt, Hook korrekt platziert.
4. Keine JSX-Syntax kaputt (Klammerung bei `{t('...')}`).
5. En-Parität: neuer Key in en.json vorhanden.

Final: Opus-Check über alle Dateien + TypeScript-Build.

---

## Task-Struktur

### Task A1: de.json + en.json Keys anlegen (Phase A Agent)

**Files:**
- Modify: `src/renderer/locales/de.json`, `src/renderer/locales/en.json`
- Create: `docs/superpowers/i18n-keymap.json`

**Interfaces:**
- Consumes: die 82 Dateien mit FR-Strings
- Produces: vollständige Key-Map + erweiterte de.json/en.json

- [ ] **Step 1: Scan aller FR-Strings extrahieren**

Run:
```bash
node /home/holger/projects/active/klinge/src/docs/superpowers/scan-fr.js  # (Scan-Skript aus Vorbereitung)
```
Expected: Liste aller FR-Strings pro Datei.

- [ ] **Step 2: Keys vergeben + de.json/en.json erweitern**

Für jeden französischen String einen Key nach Konvention vergeben. Deutsche + englische Werte eintragen. Beispiel:
```json
"ui": {
  "no_pools": "Keine Gruppen",
  "previous_pool": "Vorherige Gruppe",
  "next_pool": "Nächste Gruppe"
}
```
En.json (gleiche Struktur):
```json
"ui": {
  "no_pools": "No pools",
  "previous_pool": "Previous pool",
  "next_pool": "Next pool"
}
```

- [ ] **Step 3: Key-Map als JSON ablegen**

`docs/superpowers/i18n-keymap.json`:
```json
{
  "AboutModal.tsx": { "Fermer": "actions.close", "...": "..." },
  "CompetitionPropertiesModal.tsx": { "Tours de poules": "competition.pools_rounds", "...": "..." }
}
```

- [ ] **Step 4: JSON-Validität + En-Parität prüfen**

Run:
```bash
node -e "const d=require('./src/renderer/locales/de.json'),e=require('./src/renderer/locales/en.json');const df={};(function w(o,p){for(const k in o){const np=p?p+'.'+k:k;if(typeof o[k]==='object'&&o[k]!==null)w(o[k],np);else df[np]=o[k];}})(d);const ef={};(function w(o,p){for(const k in o){const np=p?p+'.'+k:k;if(typeof o[k]==='object'&&o[k]!==null)w(o[k],np);else ef[np]=o[k];}})(e);const miss=Object.keys(ef).filter(k=>!(k in df));console.log('de fehlt vs en:',miss.length, miss.join(','));"
```
Expected: `0`.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/locales/de.json src/renderer/locales/en.json docs/superpowers/i18n-keymap.json
git commit -m "i18n: add German/English keys for untranslated UI strings"
```

---

### Task B1–B10: Verdrahtung pro Batch (Phase B Agenten)

**Files:** siehe Batch-Aufteilung oben (je ~8 Dateien)

**Interfaces:**
- Consumes: `docs/superpowers/i18n-keymap.json` (FR-String → key)
- Produces: FR-freie Komponenten mit `t()`-Calls

- [ ] **Step 1: Pro Datei prüfen ob useTranslation fehlt**

Run (pro Datei):
```bash
grep -qE "useTranslation|const \{ t \}" "src/renderer/components/<datei>" || echo "BRAUCHT IMPORT"
```

- [ ] **Step 2: Import + Hook einfügen (nur wo fehlend)**

```ts
import { useTranslation } from '<relativ>/hooks/useTranslation';
// im Funktionsbody vor dem ersten return:
const { t } = useTranslation();
```
Relativer Pfad: `../hooks/useTranslation` für `components/*.tsx`, `../../hooks/useTranslation` für `components/sub/*.tsx`.

- [ ] **Step 3: FR-Strings durch t(key) ersetzen**

Attribut: `title="Fermer"` → `title={t('actions.close')}`
JSX-Text: `>Fermer<` → `{t('actions.close')}`
Satz: `>Aucune poule<` → `{t('ui.no_pools')}`

- [ ] **Step 4: TypeScript-Check der eigenen Dateien**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "<datei>" | head
```
Expected: keine Fehler in den eigenen Dateien.

- [ ] **Step 5: FR-Reststrings prüfen**

Run:
```bash
grep -rnE "Annuler|Fermer|Valider|Tableau|Poule|Compétition|Supprimer|Ajouter|Modifier" "src/renderer/components/<datei>" | grep -v "t('" | grep -v "\.test\.tsx"
```
Expected: leer (außer in Kommentaren).

- [ ] **Step 6: Commit pro Batch**

```bash
git add src/renderer/components/<batch-dateien>
git commit -m "i18n: wire French UI strings to t() (batch N)"
```

---

### Task C1–C10: Supervisor-Check (Opus, pro Batch)

**Agent:** Opus (`model: "opus"`) via Agent-Tool mit `subagent_type: "general-purpose"`, Prompt enthält: Batch-Dateien, Anweisung zu prüfen (1) keine FR-Reststrings, (2) alle `t()`-Keys existieren in de.json, (3) kein doppelter Import, (4) JSX intakt, (5) en.json-Parität. Opus meldet pro Datei PASS/FAIL mit Begründung.

---

### Task D1: Finaler Build + Verifikation

- [ ] **Step 1: Gesamt-TypeScript-Build**
```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: keine Fehler.

- [ ] **Step 2: Vitest der Komponenten**
```bash
npx vitest run src/renderer/components 2>&1 | tail -15
```

- [ ] **Step 3: FR-Rest-Scan gesamt**
```bash
node /home/holger/projects/active/klinge/src/docs/superpowers/scan-fr.js
```
Expected: `Dateien mit FR: 0`.

- [ ] **Step 4: Holger verifiziert im AnyDesk-Terminal**
1. `cd ~/projects/active/klinge/src && npm start`
2. Sprache DE
3. Alle Modale/Views durchklicken — kein Französisch

- [ ] **Step 5: Push origin dev**
```bash
git push origin dev
```

---

## Risiken & Mitigation

- **Race-Conditions auf de.json:** durch zentrale Phase A vermieden (nur 1 Agent touched de.json/en.json).
- **Unbenutzte Imports:** Agenten prüfen vor Einfügen ob `t` schon da.
- **JSX-Klammerung:** `{t('key')}` korrekt setzen, nicht `t('key')` ohne Klammern in JSX-Text.
- **En-Parität:** jeder neue Key MUSS in en.json — sonst bricht EN-UI.
- **Großer Batch (RemoteScoreManager, 66):** eigener Namespace `remote_score.*`, ggf. als eigener Sub-Batch falls zu groß.
- **WikiArticleRenderer:** Wiki-Inhalte könnten bewusst französisch sein (Upstream-Doku) — im Review klären ob das bleibt.

## Self-Review

1. **Spec coverage:** Sync ✓ (vorab erledigt, Build #1281). de.json-Keys ✓ Task A1. Verdrahtung ✓ B1-B10. Check ✓ C1-C10. Build/Verify ✓ D1.
2. **Placeholder scan:** Keine TBDs. Key-Konvention konkret, Beispiele gegeben. Keymap als Artefakt für Agenten.
3. **Type consistency:** `t(key)` durchgängig. `useTranslation` aus `../hooks/useTranslation`. Relative Pfade bewusst.
4. **Scope:** 763 Strings / 82 Dateien realistisch in 10 Batches à ~8. Phase A zentralisiert.
