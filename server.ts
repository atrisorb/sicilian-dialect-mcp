#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Risolve vocabolario.json nella stessa directory del file sorgente o nella root se compilato in /dist
const resolveVocabPath = (): string => {
  const sameDir = path.join(__dirname, "vocabolario.json");
  if (fs.existsSync(sameDir)) {
    return sameDir;
  }
  const parentDir = path.join(__dirname, "..", "vocabolario.json");
  if (fs.existsSync(parentDir)) {
    return parentDir;
  }
  return sameDir;
};

const VOCAB_PATH = resolveVocabPath();

export interface VocabEntry {
  lemma: string;
  varianti?: string[];
  categoria?: string;
  origine: string;
  significato: string;
}

export interface VocabDatabase {
  version: string;
  schema_convention?: Record<string, string>;
  termini: VocabEntry[];
}

export interface ParsedMeaningSegment {
  definizione: string;
  luoghi: string[];
}

function loadDatabase(): VocabDatabase {
  if (!fs.existsSync(VOCAB_PATH)) {
    const emptyDb: VocabDatabase = {
      version: "1.0.0",
      termini: [],
    };
    fs.writeFileSync(VOCAB_PATH, JSON.stringify(emptyDb, null, 2), "utf-8");
    return emptyDb;
  }
  const raw = fs.readFileSync(VOCAB_PATH, "utf-8");
  return JSON.parse(raw) as VocabDatabase;
}

function saveDatabase(db: VocabDatabase): void {
  fs.writeFileSync(VOCAB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

/**
 * Analizza la stringa "significato" secondo il formato:
 * "Significato 1 (Luogo A, Luogo B), Significato 2 (Luogo C)"
 * oppure restituisce un singolo segmento legato a "origine" se non ci sono parentesi di luogo.
 */
function parseSignificatoSegments(
  significato: string,
  defaultOrigine: string
): ParsedMeaningSegment[] {
  const regex = /([^,()]+?)\s*\(([^)]+)\)(?:,\s*|$)/g;
  const segments: ParsedMeaningSegment[] = [];
  let match: RegExpExecArray | null;

  let matchedAny = false;
  while ((match = regex.exec(significato)) !== null) {
    matchedAny = true;
    const definizione = match[1].trim().replace(/^,\s*/, "");
    const luoghiRaw = match[2];
    const luoghi = luoghiRaw
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    segments.push({ definizione, luoghi });
  }

  if (!matchedAny) {
    return [
      {
        definizione: significato.trim(),
        luoghi: [defaultOrigine.trim()],
      },
    ];
  }

  return segments;
}

/**
 * Calcola il punteggio di specificità Bottom-Up (Quartiere -> Comune -> Provincia -> Sicilia)
 * Restituisce:
 *  4 = Match esatto di Quartiere (es. "Civita - Catania (CT)")
 *  3 = Match di Comune (es. "Paternò (CT)" o "Catania (CT)")
 *  2 = Match di Provincia (es. "(CT)")
 *  1 = Match Regionale ("Sicilia")
 *  0 = Nessun match diretto con il filtro
 */
function computeSpecificityScore(
  luogoTarget: {
    quartiere?: string;
    comune?: string;
    provincia?: string;
  },
  luogoRegistrato: string
): { score: number; matchedLevel: string } {
  const normReg = luogoRegistrato.toLowerCase().trim();
  const q = luogoTarget.quartiere?.toLowerCase().trim();
  const c = luogoTarget.comune?.toLowerCase().trim();
  const p = luogoTarget.provincia?.toLowerCase().trim().replace(/[()]/g, "");

  // 1. Controllo Quartiere (massima priorità bottom-up)
  if (q && normReg.includes(q)) {
    if (!c || normReg.includes(c)) {
      return { score: 4, matchedLevel: "Quartiere" };
    }
  }

  // 2. Controllo Comune (senza che il luogo registrato sia ristretto a un ALTRO quartiere diverso)
  if (c && normReg.includes(c)) {
    const isRestrictedToOtherNeighborhood =
      normReg.includes("-") && (!q || !normReg.includes(q));
    if (!isRestrictedToOtherNeighborhood) {
      return { score: 3, matchedLevel: "Comune" };
    }
  }

  // 3. Controllo Provincia (es. "(ct)" o "catania")
  if (p) {
    const siglaMatch = normReg === `(${p})` || normReg.endsWith(`(${p})`);
    if (siglaMatch && !normReg.includes("-")) {
      // Se era un altro comune della stessa provincia, diamo score provinciale solo se il luogo registrato è la provincia intera
      if (c && !normReg.includes(c) && normReg !== `(${p})`) {
        return { score: 0, matchedLevel: "Altro Comune della Provincia" };
      }
      return { score: 2, matchedLevel: "Provincia" };
    }
  }

  // 4. Fallback Regionale ("Sicilia")
  if (normReg === "sicilia") {
    return { score: 1, matchedLevel: "Regione (Sicilia)" };
  }

  return { score: 0, matchedLevel: "Nessun match" };
}

/**
 * Risolve il significato attivo per una località specifica applicando la catena Bottom-Up:
 * Quartiere (4) -> Comune (3) -> Provincia (2) -> Sicilia (1)
 */
function resolveMeaningForLocation(
  entry: VocabEntry,
  locationFilter: {
    quartiere?: string;
    comune?: string;
    provincia?: string;
  }
) {
  const segments = parseSignificatoSegments(entry.significato, entry.origine);
  let bestScore = -1;
  let bestLevel = "Nessuno";
  const activeDefinitions: string[] = [];

  for (const seg of segments) {
    // Controlliamo sia i luoghi tra parentesi del segmento, sia l'origine generale della voce
    const candidatePlaces = [...seg.luoghi];
    for (const place of candidatePlaces) {
      const { score, matchedLevel } = computeSpecificityScore(
        locationFilter,
        place
      );
      if (score > bestScore && score > 0) {
        bestScore = score;
        bestLevel = `${matchedLevel} [${place}]`;
        activeDefinitions.length = 0;
        activeDefinitions.push(seg.definizione);
      } else if (score === bestScore && score > 0) {
        if (!activeDefinitions.includes(seg.definizione)) {
          activeDefinitions.push(seg.definizione);
        }
      }
    }
  }

  return {
    matched: bestScore > 0,
    specificityScore: bestScore,
    resolvedLevel: bestLevel,
    significatoRisolto:
      activeDefinitions.length > 0 ? activeDefinitions.join("; ") : null,
    tuttiISegmenti: segments,
  };
}

const server = new Server(
  {
    name: "sicilian-dialect-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "lookup_sicilian_term",
        description:
          "Cerca una parola siciliana (lemma o variante) nel vocabolario.json locale. Se vengono specificati quartiere, comune o provincia, risolve il significato esatto tramite ereditarietà Bottom-Up (Quartiere -> Comune -> Provincia -> Sicilia).",
        inputSchema: {
          type: "object",
          properties: {
            term: {
              type: "string",
              description: "Il lemma o la variante dialettale da cercare",
            },
            quartiere: {
              type: "string",
              description:
                "Opzionale. Nome del quartiere/rione (es. 'Civita', 'Kalsa', 'San Cristoforo')",
            },
            comune: {
              type: "string",
              description:
                "Opzionale. Nome del comune (es. 'Paternò', 'Catania', 'Palermo')",
            },
            provincia: {
              type: "string",
              description:
                "Opzionale. Sigla della provincia (es. 'CT', 'PA', 'ME', 'SR', 'RG', 'EN', 'CL', 'AG', 'TP')",
            },
          },
          required: ["term"],
        },
      },
      {
        name: "translate_to_local_dialect",
        description:
          "Cerca nel vocabolario.json i termini siciliani corrispondenti a una parola o concetto in italiano, ordinandoli dal più specifico per il quartiere/comune richiesto fino al termine pan-siciliano.",
        inputSchema: {
          type: "object",
          properties: {
            italian_query: {
              type: "string",
              description:
                "Parola o concetto in italiano da cercare all'interno dei significati (es. 'lavorare', 'ragazzo', 'buca')",
            },
            quartiere: {
              type: "string",
              description: "Opzionale. Quartiere target",
            },
            comune: {
              type: "string",
              description: "Opzionale. Comune target (es. 'Paternò')",
            },
            provincia: {
              type: "string",
              description: "Opzionale. Sigla provincia target (es. 'CT')",
            },
          },
          required: ["italian_query"],
        },
      },
      {
        name: "get_location_vocabulary",
        description:
          "Estrae tutti i vocaboli e le accezioni che appartengono o assumono un significato specifico in un dato quartiere, comune o provincia.",
        inputSchema: {
          type: "object",
          properties: {
            quartiere: {
              type: "string",
              description: "Opzionale. Nome del quartiere",
            },
            comune: {
              type: "string",
              description: "Nome del comune (es. 'Paternò', 'Catania')",
            },
            provincia: {
              type: "string",
              description: "Sigla della provincia (es. 'CT')",
            },
            include_regional_fallbacks: {
              type: "boolean",
              description:
                "Se true, include anche i vocaboli pan-siciliani ('Sicilia') ereditati dal luogo. Default: false (mostra solo i termini o significati specifici dell'area).",
            },
          },
        },
      },
      {
        name: "upsert_sicilian_term",
        description:
          "Aggiunge o aggiorna un lemma nel file vocabolario.json rispettando rigorosamente la convenzione di origine e la formattazione con parentesi per i significati variabili su base geografica.",
        inputSchema: {
          type: "object",
          properties: {
            lemma: {
              type: "string",
              description: "Lemma principale in siciliano",
            },
            varianti: {
              type: "array",
              items: { type: "string" },
              description: "Varianti fonetiche o ortografiche",
            },
            categoria: {
              type: "string",
              description: "Categoria grammaticale (es. 'sostantivo femminile', 'verbo')",
            },
            origine: {
              type: "string",
              description:
                "Origine precisa: 'Sicilia' se pan-siciliano, altrimenti 'Comune (PROV)' o 'Quartiere - Comune (PROV)' (es. 'Paternò (CT)' o 'Civita - Catania (CT)')",
            },
            significato: {
              type: "string",
              description:
                "Significato unico se invariante, oppure formattato come: 'Significato 1 (Luogo A, Luogo B), Significato 2 (Luogo C)' se il significato cambia anche una sola volta.",
            },
          },
          required: ["lemma", "origine", "significato"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const db = loadDatabase();

  if (name === "lookup_sicilian_term") {
    const schema = z.object({
      term: z.string(),
      quartiere: z.string().optional(),
      comune: z.string().optional(),
      provincia: z.string().optional(),
    });
    const parsed = schema.parse(args);
    const qTerm = parsed.term.toLowerCase().trim();

    const matches = db.termini.filter(
      (t) =>
        t.lemma.toLowerCase() === qTerm ||
        t.varianti?.some((v) => v.toLowerCase() === qTerm)
    );

    const hasLocationFilter = Boolean(
      parsed.quartiere || parsed.comune || parsed.provincia
    );

    const results = matches.map((entry) => {
      if (!hasLocationFilter) {
        return {
          ...entry,
          segmenti_semantici: parseSignificatoSegments(
            entry.significato,
            entry.origine
          ),
        };
      }
      const resolution = resolveMeaningForLocation(entry, {
        quartiere: parsed.quartiere,
        comune: parsed.comune,
        provincia: parsed.provincia,
      });
      return {
        ...entry,
        risoluzione_locale: resolution,
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              file_sorgente: VOCAB_PATH,
              query: parsed,
              risultati_trovati: results.length,
              risultati: results,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "translate_to_local_dialect") {
    const schema = z.object({
      italian_query: z.string(),
      quartiere: z.string().optional(),
      comune: z.string().optional(),
      provincia: z.string().optional(),
    });
    const parsed = schema.parse(args);
    const needle = parsed.italian_query.toLowerCase().trim();
    const hasLocationFilter = Boolean(
      parsed.quartiere || parsed.comune || parsed.provincia
    );

    const candidates: Array<{
      lemma: string;
      varianti?: string[];
      origine: string;
      significato_completo: string;
      significato_attivo_nel_luogo: string | null;
      livello_ereditarieta: string;
      priorita_bottom_up: number;
    }> = [];

    for (const entry of db.termini) {
      const segments = parseSignificatoSegments(
        entry.significato,
        entry.origine
      );
      const matchingSegments = segments.filter((s) =>
        s.definizione.toLowerCase().includes(needle)
      );

      if (matchingSegments.length === 0) continue;

      if (!hasLocationFilter) {
        candidates.push({
          lemma: entry.lemma,
          varianti: entry.varianti,
          origine: entry.origine,
          significato_completo: entry.significato,
          significato_attivo_nel_luogo: matchingSegments
            .map((s) => `${s.definizione} (${s.luoghi.join(", ")})`)
            .join(", "),
          livello_ereditarieta: "Generale (nessun filtro geografico)",
          priorita_bottom_up: 1,
        });
      } else {
        let bestScore = 0;
        let bestLevel = "Non attestato nel luogo richiesto";
        let activeDef: string | null = null;

        for (const seg of matchingSegments) {
          for (const place of seg.luoghi) {
            const { score, matchedLevel } = computeSpecificityScore(
              {
                quartiere: parsed.quartiere,
                comune: parsed.comune,
                provincia: parsed.provincia,
              },
              place
            );
            if (score > bestScore) {
              bestScore = score;
              bestLevel = `${matchedLevel} [${place}]`;
              activeDef = seg.definizione;
            }
          }
        }

        if (bestScore > 0) {
          candidates.push({
            lemma: entry.lemma,
            varianti: entry.varianti,
            origine: entry.origine,
            significato_completo: entry.significato,
            significato_attivo_nel_luogo: activeDef,
            livello_ereditarieta: bestLevel,
            priorita_bottom_up: bestScore,
          });
        }
      }
    }

    // Ordina per priorità Bottom-Up decrescente: Quartiere (4) -> Comune (3) -> Provincia (2) -> Sicilia (1)
    candidates.sort((a, b) => b.priorita_bottom_up - a.priorita_bottom_up);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              query_italiano: parsed.italian_query,
              coordinate_target: {
                quartiere: parsed.quartiere ?? null,
                comune: parsed.comune ?? null,
                provincia: parsed.provincia ?? null,
              },
              candidati_ordinati_bottom_up: candidates,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "get_location_vocabulary") {
    const schema = z.object({
      quartiere: z.string().optional(),
      comune: z.string().optional(),
      provincia: z.string().optional(),
      include_regional_fallbacks: z.boolean().optional().default(false),
    });
    const parsed = schema.parse(args);
    const minScore = parsed.include_regional_fallbacks ? 1 : 2;

    const localTerms = db.termini
      .map((entry) => {
        const res = resolveMeaningForLocation(entry, {
          quartiere: parsed.quartiere,
          comune: parsed.comune,
          provincia: parsed.provincia,
        });
        return { entry, res };
      })
      .filter((item) => item.res.specificityScore >= minScore)
      .sort((a, b) => b.res.specificityScore - a.res.specificityScore)
      .map((item) => ({
        lemma: item.entry.lemma,
        varianti: item.entry.varianti,
        origine_voce: item.entry.origine,
        significato_locale_risolto: item.res.significatoRisolto,
        livello_match: item.res.resolvedLevel,
        score_bottom_up: item.res.specificityScore,
        significato_integrale_json: item.entry.significato,
      }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              filtro: parsed,
              totale_voci: localTerms.length,
              voci: localTerms,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === "upsert_sicilian_term") {
    const schema = z.object({
      lemma: z.string().min(1),
      varianti: z.array(z.string()).optional().default([]),
      categoria: z.string().optional().default(""),
      origine: z.string().min(1),
      significato: z.string().min(1),
    });
    const parsed = schema.parse(args);

    const existingIndex = db.termini.findIndex(
      (t) =>
        t.lemma.toLowerCase() === parsed.lemma.toLowerCase() &&
        t.origine.toLowerCase() === parsed.origine.toLowerCase()
    );

    const newEntry: VocabEntry = {
      lemma: parsed.lemma.trim(),
      varianti: parsed.varianti,
      categoria: parsed.categoria.trim(),
      origine: parsed.origine.trim(),
      significato: parsed.significato.trim(),
    };

    let action: "updated" | "inserted";
    if (existingIndex >= 0) {
      db.termini[existingIndex] = newEntry;
      action = "updated";
    } else {
      db.termini.push(newEntry);
      action = "inserted";
    }

    saveDatabase(db);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "success",
              action,
              file: VOCAB_PATH,
              entry: newEntry,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Tool sconosciuto: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Errore fatale nel server MCP:", err);
  process.exit(1);
});