# Illustrazioni dipinte

Questa cartella contiene le illustrazioni HD delle carte (piano grafica, sezione 6.4).

- `originals/`: gli originali 1344x960 dei modelli locali. Git ignora questa cartella.
- `meta/<cardId>.json`: modello, seme, riferimenti e prompt di ogni illustrazione.
- `web/{lg,md,sm}/<cardId>.webp`: le versioni per il gioco (768, 384 e 192 px di larghezza, rapporto 7:5).

Per creare le versioni web:

1. Copia gli originali in `assets/art/originals/`.
2. Esegui `corepack pnpm art`.

NOTA: le 8 carte di prova usano per ora le anteprime da 384 px. La versione `lg` è quindi sfocata.
