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
- Momenti: `play` (Riti), `enterPlay`, `dawn`, `dusk`, `death`.
- Condizioni: `highTide` (Alta Marea), `lowTide` (Riflusso), `resonance` (Risonanza).
- Azioni: `damage`, `heal`, `buff`, `destroy`, `grant`, `draw`, `tide`, `ember`, `summon`.
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

## 4. Intelligenza artificiale

| Livello | Tecnica | Risultato misurato |
|---|---|---|
| Casuale | Sceglie un'azione legale a caso. | Usato solo dal simulatore. |
| Facile | Valuta ogni azione dopo lo Scontro del round. | Vince 30 partite su 30 contro il giocatore casuale. |
| Media | Cerca sequenze di 2 azioni proprie (5 candidati per livello). | Vince il 60% delle partite decise contro la facile (177 partite). |

La funzione di valutazione considera la Luce (con valore concavo: un punto vale di più su un Faro debole), il campo, la mano, la Marea e il danno previsto del prossimo Scontro.
L'IA media non guarda le carte nascoste: la ricerca suppone che l'avversario passi.
Il comando `pnpm duel --a medium --b easy --games 30` confronta due livelli.

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
