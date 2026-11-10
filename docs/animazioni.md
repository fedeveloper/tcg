# Specifiche di animazione

Questo documento descrive le animazioni degli eventi del motore.
I valori esatti sono in [`assets/animations/animations.json`](../assets/animations/animations.json).
Il client legge quel file e costruisce una timeline GSAP per ogni evento.

## 1. Principi

Il movimento usa 3 livelli, come nel piano di progetto (sezione 7.2).

| Livello | Frequenza | Contenuto |
|---|---|---|
| Fotogrammi | 180 ms per fotogramma | Riposo dei Custodi, Fari, boa della Marea |
| Trasformazioni | 60 fotogrammi al secondo | Posizione, scala, rotazione con curve di easing |
| Effetti | 60 fotogrammi al secondo | Particelle, luce, scossa della camera, shader |

Definizioni:

- **Anticipazione**: un piccolo movimento contrario prima dell'azione. Il giocatore capisce cosa sta per accadere.
- **Hit stop**: una pausa breve di tutto il gioco nel momento del colpo. Il colpo sembra più forte.
- **Squash and stretch**: compressione e allungamento. Lo sprite cambia `scaleX` e `scaleY`, ma l'area resta quasi uguale.
- **Dissolvenza a dithering**: i pixel spariscono secondo una matrice di Bayer 4 × 4. Non usare la trasparenza parziale.

Regole comuni:

- Metti il perno (pivot) di un Custode ai piedi, al centro. Lo squash schiaccia lo sprite verso il terreno.
- Arrotonda al pixel intero la posizione di ogni sprite fermo.
- Durante l'hit stop ferma la timeline globale. Non fermare le particelle del colpo.
- Applica lo squash and stretch con valori tra 0,75 e 1,25.
- Limita la scossa della camera a 3 pixel.
- `dir` vale +1 per un'azione verso destra e −1 per un'azione verso sinistra.

## 2. Tabella degli eventi

| Evento | Durata | Blocca l'input | Tecniche |
|---|---|---|---|
| `CardPlayed` | 420 ms | Sì | Anticipazione, squash and stretch |
| `KeeperSummoned` | 460 ms | Sì | Squash and stretch, onda |
| `KeeperDamaged` | 380 ms (+260 ms di attacco) | No | Anticipazione, hit stop, squash and stretch |
| `KeeperDied` | 520 ms | Sì | Squash, dissolvenza a dithering |
| `BeaconDamaged` | 420 ms | No | Hit stop, scossa |
| `BeaconOut` | 1100 ms | Sì | Hit stop, dissolvenza a dithering, luce |
| `TideShifted` | 600 ms | No | Anticipazione, onde |

## 3. Eventi

### 3.1 `CardPlayed`

1. Alza la carta di 6 pixel e allungala (0,92 × 1,08) in 90 ms. Questa è l'anticipazione.
2. Sposta la carta sopra la cella bersaglio in 200 ms (`power3.out`).
3. Schiaccia la carta (1,12 × 0,90) in 60 ms.
4. Riporta la scala a 1 in 70 ms (`back.out(2)`).
5. Genera 6 scintille `fx/spark` con il colore della fazione.
6. Dissolvi un Rito con lo shader a dithering in 220 ms.

Un Custode, una Reliquia o un Luogo continua con il proprio evento.

### 3.2 `KeeperSummoned`

1. Metti il Custode 20 pixel sopra lo slot, allungato (0,80 × 1,25).
2. Fai cadere il Custode in 160 ms (`power2.in`).
3. Schiaccia il Custode (1,25 × 0,75) in 70 ms all'atterraggio.
4. Genera 2 sbuffi `fx/puff` ai lati dei piedi.
5. Avvia un anello d'onda sotto lo slot (300 ms).
6. Riporta la scala a 1 in 230 ms (`elastic.out(1, 0.5)`).
7. Avvia l'animazione di riposo.

### 3.3 `KeeperDamaged`

Se l'evento ha una sorgente (`source`), anima prima l'attaccante:

1. Arretra l'attaccante di 2 pixel in 120 ms. Questa è l'anticipazione.
2. Lancia l'attaccante in avanti di 12 pixel in 90 ms (`power4.in`), allungato (1,15 × 0,90).
3. Riporta l'attaccante allo slot in 220 ms dopo il colpo.

Poi anima il bersaglio nel momento del colpo:

1. Mostra `fx/hit` sul bersaglio.
2. Colora il bersaglio di bianco per 60 ms.
3. Applica l'hit stop: 0 ms per danno 1–2, 60 ms per danno 3 o più, 80 ms per un colpo mortale.
4. Spingi il bersaglio indietro di 3 pixel e schiaccialo (0,85 × 1,12) in 60 ms.
5. Riporta il bersaglio allo slot in 240 ms (`elastic.out(1, 0.4)`).
6. Mostra il numero del danno. Il numero sale di 14 pixel e sparisce in 600 ms.
7. Scuoti la camera di 1 pixel per danno 3 o più, di 2 pixel per un colpo mortale.

### 3.4 `KeeperDied`

1. Ferma l'animazione di riposo.
2. Schiaccia il Custode (1,20 × 0,80) in 80 ms.
3. Dissolvi il Custode con lo shader a dithering in 440 ms, dall'alto verso il basso.
4. Abbassa il Custode di 3 pixel durante la dissolvenza.
5. Genera 3 sbuffi e 5 scintille con il colore della fazione.
6. Rimuovi lo sprite.

Se segue `EchoReturned`, una copia chiara vola verso la mano in 300 ms.

### 3.5 `BeaconDamaged`

1. Mostra `fx/hit` sulla lampada del Faro.
2. Colora il Faro di bianco per 60 ms.
3. Applica l'hit stop: 40 ms per danno 1–2, 80 ms per danno 3 o più.
4. Scuoti il Faro di 2 pixel in orizzontale per 300 ms, con ampiezza decrescente.
5. Scuoti la camera di 1 o 2 pixel per 160 ms.
6. Passa allo stato `damaged` quando la Luce scende a 5 o meno.
7. Riduci il raggio della luce del 20% per 80 ms, poi ripristinalo.
8. Mostra il numero del danno in colore `glow`.

### 3.6 `BeaconOut`

1. Applica un hit stop di 80 ms.
2. Scuoti la camera di 3 pixel per 260 ms.
3. Aumenta la luce (raggio × 1,6) in 120 ms. Questo è l'ultimo lampo.
4. Spegni la luce in 500 ms (`power2.in`).
5. Passa dallo sprite acceso allo sprite `out` con una dissolvenza a dithering di 500 ms.
6. Genera 10 scintille che cadono.
7. Avvia l'animazione `beacon/out` (fumo).
8. Scurisci la corsia di quel lato del 35% in 400 ms.

### 3.7 `TideShifted`

1. Sposta la boa di 2 pixel nel verso contrario in 80 ms. Questa è l'anticipazione.
2. Sposta la boa alla nuova cella in 360 ms (`back.out(1.6)`). Ogni passo di Marea vale 12 pixel.
3. Aumenta l'ampiezza dello shader delle onde da 1 a 2,5, poi riportala a 1, in 520 ms.
4. Alza la linea dell'acqua sul lato che la Marea favorisce.
5. Genera 2 sbuffi sulla boa quando la Marea supera la soglia ±2.

## 4. Shader

| Shader | Parametri | Uso |
|---|---|---|
| `ditherDissolve` | `threshold` da 0 a 1 | Morte di un Custode, Rito giocato |
| `ditherCrossfade` | `threshold`, texture di arrivo | Faro che si spegne |
| `outline` | colore, 1 pixel | Carta selezionata, bersagli validi |
| `waves` | `amplitude`, `offsetX` | Mare, indicatore della Marea |
| `ripple` | raggio, durata | Ingresso di un Custode |

La dissolvenza confronta `threshold` con la matrice di Bayer 4 × 4.
Aggiungi a `threshold` la coordinata verticale dello sprite (da 0 a 0,5). Così i pixel alti spariscono per primi.

## 5. Animazioni ridotte

ATTENZIONE: l'opzione "Riduci le animazioni" è un requisito di accessibilità (piano, sezione 7.4).

Con l'opzione attiva:

- Dimezza la durata di ogni timeline.
- Disattiva la scossa della camera e l'hit stop.
- Disattiva lo squash and stretch.
- Genera solo il 30% delle particelle.
- Mantieni la dissolvenza a dithering e i numeri di danno.
