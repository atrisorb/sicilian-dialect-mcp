---
name: sicilian-dialect-atlas
description: Padroneggia, genera, traduce e analizza testi in tutte le varianti diatopiche, micro-diatopiche e diastratiche della lingua siciliana (province, comuni, isole linguistiche gallo-italiche e arbereshe, e quartieri urbani). Usa questa skill quando l'utente chiede di parlare, tradurre, scrivere o analizzare il dialetto siciliano di una specifica provincia, comune, frazione, borgata o quartiere della Sicilia.
license: MIT
metadata:
  author: atrisorb
---

# Sicilian Dialect Atlas

Motore geolinguistico e sociolinguistico per la generazione, traduzione e analisi filologica delle varianti del siciliano attraverso province, isoglosse, comuni e micro-varianti di quartiere.

## When to Use

- L'utente chiede di tradurre o generare testo nel dialetto di una specifica provincia, comune o quartiere siciliano (es. catanese della Civita, palermitano della Kalsa, ragusano di Ibla, gallo-italico di Nicosia o San Fratello).
- L'utente richiede il confronto fonetico, morfologico o lessicale tra due o piu varianti locali della Sicilia.
- L'utente vuole adattare un dialogo o un testo letterario al registro autentico (diastratico e diatopico) di una specifica micro-area urbana o rurale siciliana.

## Steps

### 1. Risoluzione delle Coordinate Geolinguistiche (4 Livelli)

Prima di generare o tradurre qualsiasi testo, mappa la richiesta su quattro livelli gerarchici:

1. **Macro-Area Dialettale (Classificazione CSFLS / Piccitto-Ruffino)**:
   - **Siciliano Occidentale**: Palermitano, Trapanese, Agrigentino centro-occidentale.
   - **Siciliano Centrale (Metafonetico)**: Madonita, Nisseno-Ennese, Agrigentino orientale.
   - **Siciliano Sud-Orientale**: Parlate iblee (Ragusano, Modicano, Vittoriese) e Siracusano meridionale.
   - **Siciliano Orientale Non Metafonetico**: Catanese-Acitano-Etneo, Siracusano settentrionale, Messinese (tirrenico e ionico).
   - **Dialetti Insulari Minori**: Eoliano, Pantesco, Usticese, Egadino, Pelagio.
   - **Alloglossie Storiche (Isole Linguistiche)**: Gallo-Italico (es. Piazza Armerina, Aidone, Nicosia, Sperlinga, San Fratello, Novara di Sicilia) e Arbereshe (es. Piana degli Albanesi, Contessa Entellina, Santa Cristina Gela).

2. **Fonetica e Morfologia Provinciale e Comunale**:
   - **Vocalismo e Metafonesi**: Applica rigorosamente la presenza o assenza di dittongazione metafonetica di *e* aperta (*ie*) e *o* aperta (*uo*). Nel Catanese, Siracusano e Messinese il vocalismo e rigorosamente non metafonetico (es. *beddu*, *bonu*, *pedi*, *focu*); nel Centrale e in molte aree occidentali/sud-orientali applica gli esiti metafonetici o i frangimenti vocalici specifici (es. palermitano con dittongazioni incondizionate o turbamenti vocalici).
   - **Consonantismo**: Calibra gli esiti delle cacuminali/retroflesse (*dd*, *tr*, *str*), l'assimilazione di *-nd-* (*nn*) e *-mb-* (*mm*) - con le eccezioni conservative dell'area messinese nord-orientale - gli esiti di *fl-*, *pl-*, *cl-* (*ci-*, *chj-*), il rotacismo di *d* intervocalica o iniziale (*r*) tipico di Palermo e Catania popolare, e la realizzazione di *rr* o *r* pre-consonantica.
   - **Morfosintassi**: Seleziona gli articoli determinativi locali (*u/a/i* vs *lu/la/li* nelle aree conservative occidentali/centrali), i pronomi personali, le desinenze verbali del passato remoto e l'uso dell'ausiliare *aviri* + *a* + infinito per il futuro deontico.

3. **Lessico Identitario del Comune (Shibboleth Lessicali)**:
   - Seleziona i lessemi specifici del comune richiesto evitando mescolanze artificiali tra Sicilia occidentale e orientale.
   - Esempio di opposizione lessicale: *picciottu / carusu* (Palermo vs Catania/Est), *travagghiari / faticari*, *muccaturi / fazzulettu*, *zotta / curteddu*, *tuppuliari / bussari*, *annacari / cunzari*.

4. **Micro-Diatopia e Diastratia di Quartiere (Rione / Borgata)**:
   - Nei grandi centri urbani e nei comuni storicamente divisi in rioni distinti, applica i tratti socio-fonetici e gergali del quartiere:
     - **Catania**: Distingui la parlata dei quartieri storici e marinari (*Civita, Antico Corso, San Cristoforo, Pescheria, Ognina, Tondicello*) - caratterizzata da forte cadenza strascicata, caduta marcata delle sillabe atone, rotacismo intenso e gergo marinaro/mercatesco - rispetto al registro semi-urbano di *Borgo-Sanzio* o alle varianti dei comuni pedemontani etnei (*Pedara, Nicolosi, Belpasso, Acireale*).
     - **Palermo**: Distingui i mandamenti storici (*Kalsa, Albergheria, Ballaro, Capo, Vucciria, Borgo Vecchio, Danisinni*) - con intenso frangimento vocalico, allungamento delle toniche e lessico gergale storico - dalle borgate marinare (*Arenella, Vergine Maria, Sferracavallo, Mondello*) e dalle aree residenziali moderne.
     - **Messina**: Distingui i rioni storici (*Tirone, Giostra, Boccetta, Camaro, Zaera*) dai villaggi marinari dello Stretto (*Torre Faro, Ganzirri*, con lessico alieutico specifico) e dai villaggi collinari del Sud.
     - **Comuni Policentrici o divisi in Rioni Storici**: Rispetta le opposizioni storiche intra-comunali documentate (es. *Ragusa Ibla* vs *Ragusa Superiore*, *Modica Bassa/Alta/Sorda*, *Sciacca Marina/San Michele*, *Caltagirone*).

### 2. Protocollo di Rigore Filologico (Anti-Allucinazione)

1. **Trasparenza sulla Granularita**: Non tutti i quartieri dei 391 comuni siciliani possiedono una grammatica o una fonetica distinta dalla koine comunale. Nei piccoli e medi comuni, la variazione tra quartieri e quasi esclusivamente **diastratica** (legata a eta, ceto sociale o mestiere: es. quartiere di pescatori vs quartiere contadino) e non strutturale.
2. **Divieto di Invenzione Fonetica**: Se l'utente richiede un quartiere specifico per il quale non esiste una variante micro-diatopica documentata diversa dal resto del comune, utilizza fedelmente il dialetto del **comune di appartenenza** calibrato sul registro sociolinguistico appropriato del quartiere (popolare, marinaro, rurale o borghese) e dichiara esplicitamente il livello di granularita applicato.
3. **Consultazione File di Riferimento**: Se nella skill sono presenti file ausiliari in `references/` (es. `references/catania.md`, `references/palermo.md`), caricali e usali come fonte primaria per il lessico e i modi di dire del quartiere richiesto.

### 3. Formato di Risposta Consigliato

Quando l'utente chiede una traduzione o un testo localizzato, struttura l'output in modo chiaro:

1. **Testo nella variante richiesta**: Scritto con grafia fonetica coerente (standard CSFLS o grafia dialettale leggibile con indicazione degli esiti specifici).
2. **Coordinate Linguistiche Applicate**: Breve nota tecnica che specifica:
   - Macro-area e Comune.
   - Quartiere / Registro sociolinguistico.
   - Fenomeni fonetici, morfologici e lessicali chiave adottati (es. assenza/presenza di metafonesi, shibboleth lessicali scelti).

## Gotchas

- **Non sovrapporre Palermitano e Catanese**: Evita il "siciliano standard televisivo" che mescola fonetica palermitana e lessico catanese (es. non usare dittonghi metafonetici *biiddu/buonu* nel dialetto di Catania, dove si dice *beddu/bonu*; non usare *carusu* a Palermo centro al posto di *picciottu*).
- **Attenzione alle Isole Gallo-Italiche e Arbereshe**: A Nicosia, Sperlinga, Aidone, Piazza Armerina, San Fratello o Piana degli Albanesi il dialetto storico locale non appartiene al sistema romanzo meridionale estremo ma ha basi gallo-italiche o albanesi, spesso affiancate da una variante sicilianizzata. Specifica sempre quale dei due registri stai usando.
- **Grafia Coerente**: Usa convenzioni coerenti per i suoni retroflessi (*dd* per la cacuminale, *tr/str* con nota fonetica se necessario) e per le palatali (*ci*, *sc*, *gghi*).