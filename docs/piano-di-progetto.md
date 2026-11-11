# Piano di progetto: "High Tides"

Questo documento descrive il piano per un gioco di carte collezionabili (TCG) nel browser.
Il documento ha due parti: le meccaniche di gioco e l'implementazione software.
Il gioco è originale. Il mondo, i nomi, le regole e la grafica non copiano giochi esistenti.

## Indice

1. [Visione](#1-visione)
2. [Mondo e tono](#2-mondo-e-tono)
3. [Meccaniche di gioco](#3-meccaniche-di-gioco)
4. [Fazioni](#4-fazioni)
5. [Collezione e modalità](#5-collezione-e-modalità)
6. [Architettura software](#6-architettura-software)
7. [Grafica: pixel art con animazioni fluide](#7-grafica-pixel-art-con-animazioni-fluide)
8. [Intelligenza artificiale avversaria](#8-intelligenza-artificiale-avversaria)
9. [Qualità, test e bilanciamento](#9-qualità-test-e-bilanciamento)
10. [Roadmap](#10-roadmap)
11. [Rischi](#11-rischi)
12. [Decisioni aperte](#12-decisioni-aperte)

---

## 1. Visione

Il gioco offre partite brevi (10–15 minuti) con molte decisioni significative per turno.
Le regole di base sono semplici. La profondità nasce dalle interazioni tra posizione, tempo e risorse.

Principi di design:

- **Ogni turno ha una scelta difficile.** Il giocatore bilancia attacco, difesa e sviluppo.
- **La posizione conta.** Il campo ha tre corsie. La corsia di una carta cambia il suo valore.
- **Il caso ha un peso basso.** Il mazzo è piccolo e il giocatore ha strumenti per gestire la pesca.
- **L'informazione è leggibile.** Il gioco mostra sempre le conseguenze di un'azione prima della conferma.
- **La grafica è semplice ma viva.** La pixel art è piccola. Il movimento è fluido a 60 fotogrammi al secondo.

## 2. Mondo e tono

Il mondo è un arcipelago dopo una grande inondazione.
Ogni comunità sopravvive intorno a un faro. La luce del faro protegge le isole dal buio del mare.
Il giocatore è un **Guardiano** e difende tre fari. L'avversario attacca i fari con i suoi **Custodi**.

Il tono è malinconico ma caldo: luce, nebbia, rame ossidato, alghe, lanterne.
Questo tema dà una palette di colori chiara e coerente per la pixel art.

## 3. Meccaniche di gioco

### 3.1 Obiettivo

Ogni giocatore ha **3 Fari**, uno per corsia. Ogni Faro ha 10 punti **Luce**.
Il giocatore vince quando spegne **2 Fari** avversari.
Questa condizione obbliga i giocatori a scegliere: concentrare l'attacco o difendere ovunque.

### 3.2 Il campo

```
        Corsia A     Corsia B     Corsia C
       [ Faro A ]   [ Faro B ]   [ Faro C ]     <- Avversario
       [Retro   ]   [Retro   ]   [Retro   ]
       [Fronte  ]   [Fronte  ]   [Fronte  ]
       ------------- Luoghi ---------------     <- 1 Luogo per corsia, condiviso
       [Fronte  ]   [Fronte  ]   [Fronte  ]
       [Retro   ]   [Retro   ]   [Retro   ]
       [ Faro A ]   [ Faro B ]   [ Faro C ]     <- Giocatore
```

- Ogni giocatore ha **6 slot**: 3 corsie × 2 file (Fronte e Retro).
- Un Custode in Fronte attacca e blocca. Un Custode in Retro è protetto ma attacca solo con abilità a distanza.
- Ogni corsia ha un **Luogo** condiviso. Un Luogo cambia le regole di quella corsia (esempio: "I Custodi qui hanno +1 Attacco").
- Un giocatore può sostituire un Luogo con un nuovo Luogo dalla mano.

### 3.3 Risorse: Brace e Marea

Il gioco usa due risorse. Questa è la meccanica distintiva del gioco.

**Brace (risorsa personale).**
- All'inizio del round 1 il giocatore ha 1 Brace massima. Il massimo cresce di 1 per round, fino a 10.
- Il giocatore spende Brace per giocare carte.
- A fine round il giocatore conserva al massimo 2 Brace non spese nella **Riserva**.

**Marea (risorsa condivisa).**
- La Marea è un indicatore unico tra i due giocatori. Il valore va da −5 a +5.
- Molte carte spostano la Marea verso il proprio lato quando entrano in gioco.
- Molte carte hanno un effetto **Alta Marea**. L'effetto si attiva solo se la Marea è dal proprio lato di almeno 2 punti.
- Spostare la Marea ha un costo: la carta che spinge la Marea è spesso più debole.

La Marea crea un conflitto continuo e visibile. Ogni giocatore vuole la Marea dal suo lato.
Un giocatore può anche giocare carte "di riflusso", forti solo con la Marea dal lato avversario.

### 3.4 Struttura del round

Un round ha quattro fasi.

1. **Alba.** Entrambi i giocatori pescano 1 carta e ricaricano la Brace. Il token **Iniziativa** passa all'altro giocatore.
2. **Manovra.** I giocatori agiscono a turno, un'azione alla volta. Il giocatore con l'Iniziativa agisce per primo.
   - Un'azione è: giocare una carta, spostare un Custode di uno slot (costo 1 Brace), attivare un'abilità, o passare.
   - La fase termina quando entrambi i giocatori passano in sequenza.
3. **Scontro.** Il gioco risolve il combattimento corsia per corsia, da A a C.
4. **Tramonto.** Il gioco risolve gli effetti di fine round. La Brace in eccesso va nella Riserva. Dal round 14, la **Marea crescente** toglie 1 Luce a ogni Faro acceso.

L'alternanza di singole azioni crea bluff e lettura dell'avversario.
Passare presto conserva informazioni. Passare tardi conserva la possibilità di reagire.

### 3.5 Combattimento

- In ogni corsia, il Custode in Fronte attacca il Custode in Fronte avversario nella stessa corsia.
- Un Custode **appena entrato in gioco** non attacca nel round del suo ingresso. Il Custode blocca e risponde al danno.
- Se solo un Custode attacca, il Custode bloccante infligge il suo danno al Custode attaccante come risposta.
- I due Custodi infliggono danno nello stesso momento.
- Se la corsia avversaria non ha un Custode in Fronte, il danno va al Faro di quella corsia.
- Il danno in eccesso non passa al Faro, salvo con la parola chiave **Travolgere**.
- Un Custode ha **Attacco** e **Tenuta**. Il danno resta fino al Tramonto, poi la Tenuta torna al valore pieno.

### 3.6 Tipi di carta

| Tipo | Descrizione |
|---|---|
| **Custode** | Unità sul campo. Ha Attacco e Tenuta. Occupa uno slot. |
| **Rito** | Effetto immediato. Un **Rito Rapido** si gioca anche in risposta. Un **Rito Lento** si gioca solo come azione normale. |
| **Reliquia** | Oggetto permanente. Si attacca a un Custode o a un Faro. |
| **Luogo** | Modifica le regole di una corsia per entrambi i giocatori. |

### 3.7 Risposte e catena

Dopo un'azione, l'avversario può rispondere con un Rito Rapido.
Le risposte formano una **catena**. Il gioco risolve la catena dall'ultima carta alla prima.
La catena ha un limite di 4 carte. Questo limite mantiene le partite leggibili.

### 3.8 Parole chiave (prima lista)

| Parola chiave | Effetto |
|---|---|
| **Radici** | Il Custode non può essere spostato. Ha +1 Tenuta in Fronte. |
| **Gittata** | Il Custode attacca anche dalla fila Retro. |
| **Travolgere** | Il danno in eccesso colpisce il Faro. |
| **Eco** | Quando il Custode muore, una copia 1/1 torna in mano. |
| **Risonanza** | Si attiva quando giochi una seconda carta della stessa fazione nello stesso round. |
| **Usura** | Il Custode perde 1 Attacco a ogni Tramonto. |
| **Ancora** | Il Custode blocca lo spostamento della Marea mentre è in gioco. |
| **Alta Marea** | L'effetto si attiva con la Marea dal proprio lato di 2 o più. |
| **Riflusso** | L'effetto si attiva con la Marea dal lato avversario di 2 o più. |
| **Sacrificio X** | Per giocare la carta, distruggi X tuoi Custodi. |
| **Slancio** | Il Custode attacca anche nel round del suo ingresso. Parola chiave rara, tipica della Fucina. |

Regola di design: una carta ha al massimo **2 parole chiave** e **1 riga di testo libero**.

### 3.9 Mazzo e mano

- Il mazzo ha **30 carte**. Il mazzo contiene al massimo 2 copie di ogni carta e 1 copia di ogni carta leggendaria.
- Un mazzo usa **1 o 2 fazioni**.
- Mano iniziale: 4 carte. Ogni giocatore può sostituire fino a 4 carte una volta (mulligan).
- Il secondo giocatore riceve la carta **Scintilla** (+1 Brace per un round) per compensare lo svantaggio.
- La mano ha un limite di 8 carte. Una carta in eccesso va nel cimitero.
- Quando il mazzo finisce, ogni pesca mancata toglie 2 Luce a ogni Faro del giocatore.

### 3.10 Regole di dettaglio

Queste regole chiudono i casi limite per il motore.

| Caso | Regola |
|---|---|
| Iniziativa al round 1 | Il gioco sceglie il giocatore a caso. La Marea parte da 0. |
| Fila di ingresso | Il giocatore sceglie Fronte o Retro quando gioca un Custode. |
| Fronte vuoto | Il Custode in Retro non avanza da solo. Il giocatore lo sposta con un'azione (costo 1 Brace). |
| Custode appena entrato | Il Custode non attacca nel round del suo ingresso. Il Custode blocca e risponde al danno. Eccezione: **Slancio**. |
| Danno contro un Faro spento | Il danno va perso. La corsia resta attiva e i Custodi bloccano ancora. |
| Marea crescente | Dal round 14, alla fine del Tramonto, ogni Faro acceso perde 1 Luce. |
| Limite di round | La partita termina al round 20. Vince il giocatore con più Luce totale. Con Luce uguale, la partita è pari. |
| Vittoria simultanea | Se entrambi i giocatori spengono il secondo Faro avversario nello stesso Scontro, la partita è pari. |

### 3.11 Perché le meccaniche sono profonde

| Asse di decisione | Fonte della profondità |
|---|---|
| Spazio | 3 corsie, 2 file, Luoghi diversi, Fari separati. |
| Tempo | Azioni alternate, Iniziativa, Riti Rapidi, scelta di passare. |
| Risorse | Brace con Riserva, Marea condivisa, costo dello spostamento. |
| Informazione | Mano nascosta, bluff con Brace non spesa. |
| Costruzione del mazzo | 5 fazioni, combinazioni a due, sinergie tra fazioni. |

## 4. Fazioni

Il gioco ha 5 fazioni. Ogni fazione ha un'identità meccanica chiara e un rapporto diverso con la Marea.

| Fazione | Tema | Stile di gioco | Rapporto con la Marea |
|---|---|---|---|
| **Fucina** | Fuoco, rame, fabbri | Aggressivo, danno diretto ai Fari | Spinge la Marea in modo rapido ma instabile |
| **Abisso** | Mare profondo, creature cieche | Controllo, rimozione, manipolazione della pesca | Forte con **Riflusso** |
| **Germoglio** | Alghe, coralli, crescita | Custodi che crescono, Radici, difesa | Costanza: effetti che durano più round |
| **Ingranaggio** | Meccanismi, orologi, fari | Reliquie e combinazioni | Blocca la Marea con **Ancora** |
| **Vespro** | Nebbia, spiriti, lanterne spente | Sacrificio, cimitero, Eco | Guadagna valore quando la Marea cambia lato |

Ogni coppia di fazioni (10 coppie) deve avere almeno una strategia valida.
Il primo set ha **150 carte**: 26 per fazione e 20 neutrali.

## 5. Collezione e modalità

### 5.1 Modalità di gioco

| Modalità | Descrizione | Fase |
|---|---|---|
| **Tutorial** | 5 partite guidate. Ogni partita introduce una regola. | MVP |
| **Spedizione** | Campagna roguelite in single player. Il giocatore parte con un mazzo piccolo e aggiunge carte dopo ogni vittoria. | MVP |
| **Sfida libera** | Partita contro l'IA con un mazzo personale. | MVP |
| **Draft** | Il giocatore sceglie carte da pacchetti e costruisce un mazzo sul momento. | Fase 3 |
| **PvP** | Partite online tra giocatori. | Fase 4 |

### 5.2 Economia della collezione

- Il giocatore ottiene carte dalle vittorie e dalla Spedizione. Il primo rilascio non usa denaro reale.
- Rarità: Comune, Non comune, Rara, Leggendaria.
- Il giocatore trasforma i duplicati in **Frammenti**. I Frammenti creano carte specifiche.
- Questo sistema riduce la frustrazione e mantiene il senso di collezione.

## 6. Architettura software

### 6.1 Stack tecnologico

| Area | Scelta | Motivo |
|---|---|---|
| Linguaggio | **TypeScript** (modalità strict) | Tipi forti per regole complesse. Un solo linguaggio per client e server. |
| Build | **Vite** | Avvio rapido, buon supporto per asset e WebAssembly futuro. |
| Monorepo | **pnpm workspaces** | Pacchetti separati con dipendenze condivise. |
| Rendering del campo | **PixiJS v8** (WebGL/WebGPU) | Rendering 2D veloce, sprite, shader, filtri. |
| Interfaccia dei menu | **Svelte** sopra il canvas | Menu, editor del mazzo e collezione con poco codice. |
| Animazioni | **GSAP** | Timeline, easing e sequenze affidabili. |
| Audio | **Howler.js** | Audio semplice e compatibile con i browser. |
| Lingue | **i18next** | Testi in italiano e inglese, plurali, lingua di riserva. Vedi la sezione 6.8. |
| Validazione dati | **Zod** | Schema per le carte e per i messaggi di rete. |
| Salvataggio locale | **IndexedDB** (libreria `idb`) | Collezione e progressi offline. |
| Database del server (fase 4) | **SQLite** (libreria `better-sqlite3`) | Un solo file, nessun processo separato, poca RAM. |
| Test | **Vitest**, **fast-check**, **Playwright** | Test unitari, test basati su proprietà, test end-to-end. |
| Server (fase 4) | **Node.js** + **WebSocket** (`ws`) | Il server esegue lo stesso motore di regole del client. |
| Deploy di test | **Raspberry Pi 3B** o **ThinkPad T480** | Hardware del proprietario. Vedi la sezione 6.7. |
| Deploy pubblico | Da decidere (esempio: Cloudflare Pages + un VPS) | Il pubblico richiede un hosting diverso. Vedi la sezione 6.7. |

### 6.2 Struttura del repository

```
tcg/
├── packages/
│   ├── engine/      Motore di regole puro (nessun DOM, nessuna grafica)
│   ├── cards/       Dati delle carte (JSON) e schema Zod
│   ├── i18n/        Testi del gioco in più lingue (it, en)
│   ├── ai/          Avversario artificiale
│   ├── client/      Gioco nel browser (PixiJS + Svelte)
│   ├── server/      Server per il PvP (fase 4)
│   └── tools/       Simulatore, validatore di carte, script per gli asset
├── assets/          Sorgenti Aseprite, audio, font pixel
└── docs/            Documentazione di design
```

### 6.3 Il motore di regole

Il motore è il componente più importante. Il motore è una libreria pura e deterministica.

Regole di architettura:

1. **Stato serializzabile.** Lo stato della partita è un oggetto JSON semplice. Lo stato non contiene classi o funzioni.
2. **Funzione di transizione.** `apply(state, action) → { state, events }`. La funzione non modifica lo stato originale.
3. **Determinismo.** Il motore usa un generatore casuale con seme (PRNG, generatore di numeri pseudo-casuali). Lo stesso seme e le stesse azioni danno sempre lo stesso risultato.
4. **Azioni legali.** `legalActions(state, player)` restituisce tutte le azioni valide. Il client e l'IA usano la stessa funzione.
5. **Eventi.** Ogni cambiamento produce un evento (`KeeperSummoned`, `DamageDealt`, `TideShifted`...). Il client anima gli eventi. Il client non calcola le regole.
6. **Viste per giocatore.** `viewFor(state, player)` nasconde le carte segrete. Il PvP usa questa funzione contro gli imbrogli.

```ts
type Action =
  | { type: "PlayCard"; card: InstanceId; targets: Target[]; slot?: Slot }
  | { type: "Move"; keeper: InstanceId; to: Slot }
  | { type: "Activate"; source: InstanceId; ability: number; targets: Target[] }
  | { type: "Pass" };

interface Result {
  state: GameState;
  events: GameEvent[];
}

function apply(state: GameState, action: Action): Result;
```

### 6.4 Effetti delle carte

Gli effetti delle carte usano un **linguaggio dichiarativo** in JSON.
Un piccolo insieme di funzioni TypeScript copre i casi speciali.

```json
{
  "id": "forge-012",
  "type": "keeper",
  "faction": "forge",
  "cost": 3,
  "attack": 3,
  "hold": 2,
  "keywords": ["overrun"],
  "effects": [
    {
      "when": "enterPlay",
      "condition": { "highTide": true },
      "actions": [{ "damage": 2, "target": "enemyBeaconSameLane" }]
    }
  ],
  "tidePush": 1
}
```

Il file della carta non contiene testi. I testi vivono nei file di traduzione (sezione 6.8):

```json
// locales/it/cards.json
{ "forge-012": { "name": "Fabbro delle Scintille", "flavor": "Il rame ricorda ogni colpo." } }

// locales/en/cards.json
{ "forge-012": { "name": "Sparksmith", "flavor": "Copper remembers every blow." } }
```

Il testo delle regole di una carta nasce in modo automatico dagli effetti. Un traduttore non riscrive le regole di ogni carta.

Vantaggi:

- Un designer aggiunge carte senza scrivere codice.
- Il validatore controlla ogni carta prima del build.
- L'IA legge gli effetti e stima il valore di una carta.

Il motore risolve gli effetti con una **coda di eventi**.
Gli effetti attivati vanno nella coda in un ordine definito: prima il giocatore attivo, poi l'avversario.
Questo ordine evita ambiguità tra effetti simultanei.

### 6.5 Flusso dei dati nel client

```
Input del giocatore
      │
      ▼
 azioniLegali() ──► evidenzia bersagli validi
      │
      ▼
 applica(azione) ──► nuovo stato + eventi
      │                     │
      │                     ▼
      │            Coda di animazione (timeline GSAP)
      │                     │
      ▼                     ▼
 Store dello stato ──► Rendering PixiJS
```

- Il client conserva due stati: lo **stato logico** (subito aggiornato) e lo **stato visivo** (aggiornato dalle animazioni).
- La coda di animazione riproduce gli eventi in ordine.
- Il giocatore può accelerare la coda con un clic.
- L'input del giocatore resta bloccato fino alla fine delle animazioni essenziali.

### 6.6 Multiplayer (fase 4)

- Il server è **autoritativo**: il server applica ogni azione e invia gli eventi.
- Il server invia a ogni giocatore solo la sua vista.
- Il server salva il seme e la lista delle azioni. Questo dato permette i replay completi.
- Il primo PvP è asincrono o con timer lungo. Questo modo riduce il carico sul server.

### 6.7 Hosting di test e hosting pubblico

Durante lo sviluppo il gioco gira su hardware del proprietario del progetto.
L'architettura tiene il server leggero. Così il server gira anche su un Raspberry Pi 3B.

| Macchina | Risorse | Uso previsto |
|---|---|---|
| **Raspberry Pi 3B** | 4 core ARM Cortex-A53, 1 GB di RAM | Hosting di test principale: client statico e server PvP con pochi giocatori. |
| **ThinkPad T480** | 8 GB di RAM, CPU x86-64 | Alternativa al Raspberry Pi. Simulazioni di bilanciamento lunghe. |

**Perché il Raspberry Pi 3B è sufficiente.**
- Il client è un insieme di file statici. Il browser del giocatore esegue tutto il rendering e l'IA.
- Il server esegue solo il motore di regole. Il motore non usa grafica e consuma poca CPU.
- Il server non esegue l'IA. In fase di test le partite contro l'IA restano nel browser.

**Regole per il Raspberry Pi 3B.**

1. Installa un sistema operativo a 64 bit (Raspberry Pi OS Lite, senza desktop).
2. Usa **Caddy** come server web. Caddy serve i file statici, gestisce HTTPS e inoltra le connessioni WebSocket al server Node.js.
3. Esegui il server Node.js con un limite di memoria: `node --max-old-space-size=256`.
4. Gestisci il processo con **systemd**. Evita Docker sul Raspberry Pi: Docker usa RAM in più.
5. Non compilare il progetto sul Raspberry Pi. GitHub Actions crea il build. Uno script copia il build sul Raspberry Pi con `rsync`.
6. Non eseguire le simulazioni di bilanciamento sul Raspberry Pi. Esegui le simulazioni sul ThinkPad o in CI.

**Budget di risorse sul Raspberry Pi 3B.**

| Componente | RAM massima |
|---|---|
| Sistema operativo | 150 MB |
| Caddy | 40 MB |
| Server Node.js con 10 partite attive | 200 MB |
| SQLite e margine | 100 MB |
| **Totale** | **circa 500 MB su 1 GB** |

Un test automatico misura la RAM del server con 10 partite simulate. Il test fallisce sopra 200 MB.

**Codice portabile.**
- Il server non dipende dall'hardware. Lo stesso codice gira su Raspberry Pi, ThinkPad e cloud.
- La configurazione usa variabili d'ambiente (porta, percorso del database, origine consentita).
- L'unica dipendenza nativa è `better-sqlite3`. La libreria ha binari precompilati per ARM64.

**Hosting pubblico (dopo i test).**
Il Raspberry Pi e il ThinkPad non servono il pubblico. Il passaggio al pubblico richiede:
- un CDN per il client statico (esempio: Cloudflare Pages);
- un VPS o un servizio di container per il server;
- un database gestito, oppure SQLite con backup automatici;
- un'immagine Docker del server, creata solo per questo ambiente.

### 6.8 Lingue (localizzazione)

Il gioco supporta più lingue dal primo giorno. Le prime lingue sono **italiano** e **inglese**.

- Il codice non contiene testi visibili al giocatore. Ogni testo ha una **chiave** (esempio: `ui.menu.play`).
- Ogni lingua ha una cartella: `packages/i18n/locales/it/`, `packages/i18n/locales/en/`.
- La libreria è **i18next**. La libreria gestisce plurali, variabili e lingua di riserva.
- La lingua di riserva è l'inglese. Una chiave mancante in italiano mostra il testo inglese.
- Il gioco sceglie la lingua del browser al primo avvio. Il giocatore cambia la lingua nelle opzioni.
- Le parole chiave hanno un nome per lingua (esempio: `overrun` → "Travolgere" / "Overrun").
- Il testo delle regole di una carta nasce da modelli tradotti (esempio: `Infliggi {{n}} danni al Faro nemico`).
- Il font pixel copre tutti i caratteri accentati dell'italiano e i caratteri delle lingue future.
- Il layout delle carte accetta testi più lunghi del 30%. Il tedesco e il francese usano parole lunghe.

Un controllo in CI blocca la PR se una chiave esiste in una lingua e manca nell'altra.

### 6.9 Convenzioni di sviluppo

| Tema | Regola |
|---|---|
| Lingua del codice | Codice, nomi tecnici, commenti e messaggi di commit in inglese. |
| Lingua della documentazione di design | Italiano. |
| Runtime | Node.js 22 LTS, pnpm. |
| Flusso di lavoro | Una PR per ogni traguardo. Il proprietario del progetto unisce le PR. |
| Licenza | Tutti i diritti riservati, fino a una decisione diversa. |
| Grafica provvisoria | Fino alla fase 2 il codice genera forme semplici al posto della pixel art. |

**Glossario per il codice.** I termini di gioco hanno un nome inglese fisso nel codice.

| Italiano (gioco) | Inglese (codice) |
|---|---|
| Faro | Beacon |
| Luce | Light |
| Custode | Keeper |
| Attacco / Tenuta | Attack / Hold |
| Rito Rapido / Rito Lento | QuickRite / SlowRite |
| Reliquia | Relic |
| Luogo | Site |
| Corsia | Lane |
| Fronte / Retro | Front / Back |
| Brace / Riserva | Ember / Reserve |
| Marea | Tide |
| Iniziativa | Initiative |
| Alba / Manovra / Scontro / Tramonto | Dawn / Maneuver / Clash / Dusk |
| Fucina / Abisso / Germoglio / Ingranaggio / Vespro | Forge / Abyss / Sprout / Gear / Vesper |

## 7. Grafica: pixel art con animazioni fluide

### 7.1 Direzione artistica

- **Risoluzione di base:** 480 × 270 pixel. Il gioco scala la scena con fattori interi (×2, ×3, ×4).
- **Palette:** 32 colori fissi. Ogni fazione ha 4–5 colori dominanti.
- **Carta in mano:** 64 × 88 pixel. Illustrazione: 56 × 40 pixel.
- **Custode sul campo:** sprite di 32 × 32 pixel con un'animazione di riposo di 4 fotogrammi.
- **Font:** un font pixel con licenza libera, a 2 dimensioni (testo e titoli).
- **Strumento:** Aseprite. Uno script esporta le spritesheet in JSON per PixiJS.

### 7.2 Tecnica per un movimento fluido

La pixel art ha pochi fotogrammi. Il movimento fluido nasce da tre livelli separati.

1. **Animazione a fotogrammi** (8–12 fotogrammi al secondo). Questo livello dà il carattere pixel art.
2. **Trasformazioni interpolate** (60 fotogrammi al secondo). Posizione, scala e rotazione usano curve di easing.
3. **Effetti** (60 fotogrammi al secondo). Particelle, luce, scossa della camera e shader.

Regole tecniche:

- Usa il filtro `nearest` su tutte le texture. Il filtro mantiene i pixel nitidi.
- Arrotonda la posizione degli sprite **fermi** al pixel intero. Lascia le posizioni frazionarie solo durante il movimento.
- Usa **squash and stretch** (compressione e allungamento) su carte e Custodi durante gli impatti.
- Usa l'**anticipazione** prima di un attacco: il Custode arretra di 2 pixel, poi scatta in avanti.
- Usa l'**hit stop**: il gioco ferma l'azione per 60–80 ms durante un colpo forte.
- Inclina la carta in mano verso il puntatore con una leggera rotazione.

### 7.3 Shader e effetti

| Effetto | Uso |
|---|---|
| Contorno a 1 pixel | Evidenzia la carta selezionata e i bersagli validi. |
| Dissolvenza a dithering | Morte di un Custode, Faro spento. |
| Scambio di palette | Varianti rare delle carte (carte "lucenti"). |
| Luce dinamica a griglia | Luce dei Fari e lanterne della fazione Vespro. |
| Onde | Indicatore della Marea al centro del campo. |

### 7.4 Leggibilità e accessibilità

- Ogni fazione ha un'icona e una forma, non solo un colore. Questo aiuta i giocatori daltonici.
- Il giocatore può aprire ogni carta a schermo intero con il testo completo.
- Il gioco supporta tastiera, mouse e tocco.
- Il gioco offre un'opzione per ridurre le animazioni e la scossa della camera.

### 7.5 Interfaccia responsiva

- Su desktop il campo usa tutta la larghezza.
- Su mobile in verticale la mano si apre a ventaglio in basso e il campo ruota di 90°.
- L'obiettivo di prestazioni è 60 fotogrammi al secondo su un telefono di fascia media del 2022.

## 8. Intelligenza artificiale avversaria

L'IA usa lo stesso motore del gioco e ha tre livelli di difficoltà.

| Livello | Tecnica |
|---|---|
| **Facile** | Euristica a regole: gioca la carta con il valore stimato più alto. |
| **Medio** | Ricerca in profondità limitata (2–3 azioni) con funzione di valutazione. |
| **Difficile** | **ISMCTS** (Information Set Monte Carlo Tree Search): simula molte partite con le carte nascoste dell'avversario ipotizzate a caso. |

- Implementazione (novembre 2026): l'IA difficile usa ISMCTS sulla catena e una ricerca più profonda nella Manovra. Vedi `docs/motore.md`, sezione 4.1.
- L'IA gira in un **Web Worker**. Il Web Worker evita blocchi dell'interfaccia.
- L'IA ha un limite di tempo per azione (esempio: 800 ms).
- La funzione di valutazione considera: Luce dei Fari, valore sul campo, carte in mano, controllo della Marea.

## 9. Qualità, test e bilanciamento

### 9.1 Test

- **Test unitari** per ogni parola chiave e per ogni fase del round.
- **Test basati su proprietà** con fast-check. Esempi di invarianti:
  - La Marea resta sempre tra −5 e +5.
  - Il numero totale di carte di un giocatore non cambia.
  - Ogni azione legale produce uno stato valido.
- **Test di localizzazione**: ogni chiave esiste in italiano e in inglese.
- **Test di replay**: un file con seme e azioni deve sempre produrre lo stesso stato finale.
- **Test end-to-end** con Playwright per i flussi principali (tutorial, partita completa, editor del mazzo).

### 9.2 Bilanciamento

- Uno strumento a riga di comando simula migliaia di partite IA contro IA.
- Lo strumento calcola la percentuale di vittoria per carta, per mazzo e per primo giocatore.
- Un mazzo con più del 55% di vittorie contro il campo richiede una revisione.
- Ogni carta ha un **valore di riferimento**: (Attacco + Tenuta + valore dell'effetto) ≈ 2 × costo + 1.

### 9.3 Integrazione continua

GitHub Actions esegue a ogni pull request:

1. Il controllo dei tipi TypeScript.
2. I test unitari e i test basati su proprietà.
3. Il validatore delle carte.
4. Una simulazione breve di 500 partite per trovare errori del motore.
5. Il build del client e un'anteprima del deploy.

## 10. Roadmap

| Fase | Durata stimata | Obiettivo | Criterio di uscita |
|---|---|---|---|
| ~~0. Prototipo cartaceo~~ | — | Fase saltata. Il motore con l'interfaccia testuale sostituisce il prototipo di carta. | — |
| **1. Motore** | 4 settimane | Motore di regole completo, interfaccia testuale da terminale | Fucina e Germoglio, 50 carte, IA facile, testi in italiano e inglese, tutti i test verdi |
| **2. Vertical slice** | 6 settimane | Prima versione giocabile nel browser con grafica finale | 1 partita completa con animazioni, tutorial, IA media |
| **3. Contenuti** | 8 settimane | 5 fazioni, 150 carte, Spedizione, Draft, collezione | Bilanciamento entro il 45–55% di vittorie per mazzo |
| **4. Online** | 6 settimane | Server, PvP, replay, account | 100 partite PvP senza errori di sincronizzazione |

Il motore viene prima della grafica. Questo ordine permette di testare le regole senza costi di animazione.

## 11. Rischi

| Rischio | Impatto | Mitigazione |
|---|---|---|
| Regole troppo complesse per i nuovi giocatori | Alto | Tutorial a passi, Luoghi assenti nelle prime partite, anteprima delle conseguenze. |
| Partite troppo lunghe | Medio | Limite di catena, timer per azione, 10 punti Luce per Faro, Marea crescente dal round 14. |
| Combinazioni di carte che rompono il gioco | Alto | Simulazioni automatiche, test basati su proprietà, limite di 2 parole chiave. |
| Costo alto della pixel art | Medio | Palette fissa, sprite piccoli, riuso delle animazioni tra Custodi simili. |
| Prestazioni basse su mobile | Medio | PixiJS con batching, atlanti di texture, test su dispositivi reali. |
| RAM insufficiente sul Raspberry Pi 3B | Basso | Budget di memoria, test automatico della RAM, ThinkPad come alternativa. |
| Desincronizzazione nel PvP | Alto | Motore deterministico, server autoritativo, test di replay. |

## 12. Decisioni prese

Il proprietario del progetto ha risposto alle decisioni aperte l'11 novembre 2026:

1. **Nome del gioco.** Il gioco si chiama **"High Tides"**, in inglese in tutte le lingue. "Fari Sommersi" era il titolo provvisorio.
2. **Priorità del PvP.** Il PvP è nella fase 4, già completa.
3. **Modello economico.** Il gioco è gratuito, anche le espansioni future. La monetizzazione arriva solo dopo un certo numero di giocatori.
4. **Produzione della grafica.** La grafica resta interna.
5. **Piattaforme.** Il gioco funziona solo nel browser, anche sul telefono.
6. **Plancia verticale.** La plancia resta orizzontale. A fine progetto una nuova versione grafica verticale permette il confronto. Il gioco può anche offrire le due plance come opzione del giocatore.
