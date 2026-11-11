# Motore delle regole

Questo documento descrive il motore delle regole del primo traguardo.
Il documento elenca anche le scelte che il piano di progetto non definisce in modo preciso.

## 1. Interfaccia del motore

Il pacchetto `@tcg/engine` espone queste funzioni:

| Funzione | Effetto |
|---|---|
| `newGame({ seed, decks })` | Crea una partita nella fase di mulligan. |
| `legalActions(state)` | Restituisce le azioni valide del giocatore che deve agire. |
| `apply(state, action)` | Restituisce `{ state, events }`. La funzione non modifica lo stato originale. |
| `viewFor(state, player)` | Nasconde la mano avversaria, i mazzi e lo stato del generatore casuale. |
| `eventsFor(events, player)` | Nasconde le carte pescate dall'avversario. |
| `checkInvariants(state)` | Controlla le regole fisse dello stato. Test e simulatore usano questa funzione. |

Lo stato è un oggetto JSON semplice. Il generatore casuale (mulberry32) salva il suo stato dentro lo stato della partita.
Lo stesso seme e le stesse azioni danno sempre lo stesso risultato.

Il motore non contiene testi per il giocatore. Il pacchetto `@tcg/i18n` traduce gli eventi e genera il testo delle regole dagli effetti delle carte.

## 2. Linguaggio degli effetti

Ogni carta è un oggetto JSON in `packages/cards/data/`. Lo schema Zod è in `packages/cards/src/schema.ts`.

- `effects`: elenco di effetti. Ogni effetto ha un momento (`when`), una condizione opzionale e una lista di azioni.
- Momenti: `play` (Riti), `enterPlay`, `dawn`, `dusk`, `death`, `tideTurn` (Cambio di Marea).
- Condizioni: `highTide` (Alta Marea), `lowTide` (Riflusso), `resonance` (Risonanza), `armed` (Armato: hai almeno una Reliquia in gioco), `haunted` (Infestato: il tuo cimitero ha almeno 5 carte).
- Azioni: `damage`, `heal`, `buff`, `destroy`, `grant`, `draw`, `tide`, `ember`, `summon`, `bounce` (riporta un Custode in mano), `discard` (l'avversario scarta carte a caso), `recall` (riprendi in mano gli ultimi Custodi del cimitero).
- `target`: il bersaglio che il giocatore sceglie. Le azioni usano questo bersaglio con il riferimento `chosen`.
- `aura`: bonus di una Reliquia per il suo Custode, o bonus di un Luogo per tutti i Custodi della corsia.
- `abilities`: abilità attivate (una volta per round). Il motore supporta le abilità. Le prime 50 carte non le usano.

Il validatore (`pnpm validate:cards`) controlla le regole che lo schema non esprime.
Esempio: un Rito non usa riferimenti di corsia, perché un Rito non ha una corsia.

## 3. Scelte di regole

Il piano lascia aperti alcuni dettagli. Il motore usa queste scelte. Ogni scelta è facile da cambiare.

### 3.1 Azioni, risposte e catena

1. Ogni azione diversa da "passa" va nella catena: giocare una carta, spostare un Custode, attivare un'abilità.
2. Dopo ogni azione, l'avversario riceve la priorità. L'avversario risponde con un Rito Rapido oppure passa.
3. Una risposta passa la priorità all'altro giocatore. L'altro giocatore può rispondere di nuovo.
4. Un "passa" con la catena aperta risolve tutta la catena, dall'ultima carta alla prima.
5. Dopo la catena, agisce l'avversario del giocatore che ha aperto la catena.
6. Una risposta non conta come azione del turno.
7. La catena ha un limite di 4 carte.
8. Il costo (Brace, Sacrificio) si paga quando il giocatore dichiara l'azione.
9. Il bersaglio si controlla quando l'effetto si risolve. Un Rito senza bersaglio valido non ha effetto e va nel cimitero.

### 3.2 Giocare le carte

1. Il bersaglio scelto di un Rito è obbligatorio. Il bersaglio scelto di un Custode è opzionale: senza bersagli validi, l'effetto non fa nulla.
2. La spinta della Marea (`tidePush`) avviene prima degli effetti. Così una carta può attivare la sua Alta Marea.
3. La Risonanza si controlla quando il giocatore dichiara la carta.
4. Uno spostamento costa 1 Brace e porta il Custode in uno slot vicino e vuoto: l'altra fila della stessa corsia, o la stessa fila di una corsia vicina.
5. Chiunque può sostituire un Luogo. Gli effetti di Alba e Tramonto di un Luogo valgono per il giocatore che lo ha giocato.
6. Un giocatore può giocare un Custode su un suo slot occupato. Il vecchio Custode va nel cimitero con le sue Reliquie. Questa sostituzione non è una morte: nessun effetto di Morte e nessuna Eco.

### 3.3 Scontro

1. Le corsie si risolvono da A a C. Dentro una corsia, tutto il danno avviene nello stesso momento.
2. Un Custode in Fronte attacca il Custode in Fronte avversario. Senza un Custode in Fronte avversario, attacca il Faro.
3. Un Custode con Gittata attacca dal Retro come un Custode in Fronte.
4. Un Custode appena entrato non attacca (salvo Slancio). Il Custode risponde al Custode in Fronte che lo attacca. Il Custode non risponde a un attacco con Gittata.
5. Travolgere vale solo per l'attacco, non per la risposta.
6. Il motore controlla la vittoria dopo lo Scontro completo. Due Fari spenti nello stesso Scontro danno una partita pari.

### 3.4 Round e risorse

1. Nel round 1 ogni giocatore pesca 1 carta all'Alba, come negli altri round.
2. La Riserva si aggiunge al massimo di Brace. Con 10 Brace massime e 2 in Riserva, il giocatore ha 12 Brace.
3. La Scintilla è un Rito Rapido a costo 0: "Guadagna 1 Brace".
4. Il mulligan pesca le nuove carte e poi rimescola nel mazzo le carte sostituite.
5. Una cura non supera 10 Luce e non riaccende un Faro spento.
6. Una copia di Eco e un Custode creato da un effetto sono **token**: escono dal gioco quando lasciano il campo.
7. Il **Cambio di Marea** avviene quando la Marea passa da un lato all'altro, oppure lascia lo 0. Gli effetti `tideTurn` di tutte le carte in gioco si attivano, prima quelli del giocatore con l'Iniziativa.
8. Un Cambio di Marea dentro un altro Cambio di Marea non attiva di nuovo gli effetti. Questa regola evita i cicli infiniti.
9. Un Custode che torna in mano perde danni e modifiche. Con la mano piena va nel cimitero. Un token esce dal gioco.
10. **Marea crescente.** Dal round 14, alla fine del Tramonto, ogni Faro acceso di entrambi i giocatori perde 1 Luce. Un Faro a 1 Luce si spegne. Il motore controlla la vittoria subito dopo. Questa regola riduce le partite che arrivano al round 20 (dal 15% al 4% circa con l'IA facile). Il numero del round è la costante `RISING_TIDE_ROUND`.

## 4. Intelligenza artificiale

| Livello | Tecnica | Risultato misurato |
|---|---|---|
| Casuale | Sceglie un'azione legale a caso. | Usato solo dal simulatore. |
| Facile | Valuta ogni azione dopo lo Scontro del round. | Vince 30 partite su 30 contro il giocatore casuale. |
| Media | Cerca sequenze di 2 azioni proprie (5 candidati per livello). | Vince il 60% delle partite decise contro la facile (177 partite). |
| Difficile | Nella Manovra cerca sequenze di 3 azioni proprie (8 candidati per livello). Sulla catena usa ISMCTS. | Vince il 53% delle partite decise contro la media (319 partite, 8 incontri tra mazzi diversi). |

La funzione di valutazione considera la Luce (con valore concavo: un punto vale di più su un Faro debole), il campo, la mano, la Marea e il danno previsto del prossimo Scontro.
L'IA media non guarda le carte nascoste: la ricerca suppone che l'avversario passi.
Il comando `pnpm duel --a medium --b easy --games 30` confronta due livelli.

### 4.1 IA difficile e ISMCTS

ISMCTS (Information Set Monte Carlo Tree Search) cerca una mossa senza conoscere le carte nascoste. Il codice è in `packages/ai/src/ismcts.ts`.

1. **Determinizzazione.** Ogni iterazione indovina le informazioni nascoste: le carte della mano e del mazzo dell'avversario, l'ordine dei mazzi e lo stato del generatore casuale. L'ipotesi usa solo la lista delle carte non viste, non le posizioni reali. Un test controlla che la scelta non cambia quando cambiano le carte nascoste.
2. **Albero.** Un solo albero vale per tutte le ipotesi. UCB conta per ogni azione solo le iterazioni in cui l'azione è legale.
3. **Ampiezza.** La radice cerca le 8 azioni migliori secondo la valutazione rapida. I nodi sotto la radice cercano 5 azioni e "Passa".
4. **Valutazione.** Dopo 3 azioni, il round finisce con dei passaggi. La ricompensa è `tanh((valore − valore di "Passa") / 6)`.
5. **Tempo.** L'IA usa al massimo 800 ms per mossa (sezione 8 del piano), nel Web Worker.

Nelle prove, ISMCTS da solo non batte l'IA media: le due IA usano la stessa funzione di valutazione, e la ricerca tra le risposte dell'avversario aggiunge poco.
Per questo l'IA difficile usa ISMCTS solo sulla catena, dove le carte nascoste dell'avversario contano di più.
Nella Manovra usa la ricerca dell'IA media, più larga e più profonda.
Il limite attuale è la funzione di valutazione: una ricerca ancora più profonda (6 × 4) non vince di più.

`pnpm duel --a hard --b medium --games 40 --iterations 800` confronta l'IA difficile con la media.
Il comando gioca ogni seme due volte con i posti scambiati. Con due livelli diversi, ogni seconda coppia scambia anche i mazzi.
`--iterations` fissa il numero di iterazioni di ISMCTS, così il risultato è riproducibile.

## 5. Test

| Tipo | File |
|---|---|
| Regole del round, mulligan, risorse | `packages/engine/test/rounds.test.ts` |
| Scontro e parole chiave di combattimento | `packages/engine/test/combat.test.ts` |
| Effetti delle carte, Reliquie, Luoghi | `packages/engine/test/cards.test.ts` |
| Risposte e catena | `packages/engine/test/chain.test.ts` |
| Proprietà (fast-check), replay, viste | `packages/engine/test/properties.test.ts` |
| Dati delle carte e mazzi | `packages/cards/test/cards.test.ts` |
| Testi e localizzazione | `packages/i18n/test/i18n.test.ts` |

La CI esegue anche il simulatore: 500 partite con mosse casuali e 30 partite con l'IA facile.
Il simulatore controlla gli invarianti dopo ogni azione.
