/**
 * 数据入库：loadAll(POEMS_DIR) → 单库（poems/authors/dynasties/tags/poem_tags + poem_content）。
 * 支持 SQLite、PostgreSQL 与 Turso；拼音不再落库。首次或更新时执行；可与 gen_markdown 串联。
 * @author poetry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadAll } from "../lib/load_data.js";
import { loadAuthorBios } from "../lib/load_author_bios.js";
import { getDb, getDatabasePath, closeDb } from "../lib/db/client.js";
import { createTables } from "../lib/db/schema.js";
import { compressToBlob } from "../lib/db/compress.js";
import { toSlug } from "../lib/slug.js";
import type { Poem, Author, Dynasty, Tag } from "../lib/types.js";

/** 从项目根加载 .env，使 DATABASE_TYPE、TURSO_DATABASE_URL 等在本脚本中生效（tsx 不会自动加载 .env） */
function loadEnv(): void {
  let dir = process.cwd();
  const root = path.parse(dir).root;
  while (dir !== root) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      const envPath = path.join(dir, ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
          if (m && process.env[m[1]!] === undefined) {
            const val = m[2]!.replace(/^["']|["']$/g, "").trim();
            process.env[m[1]!] = val;
          }
        }
      }
      break;
    }
    dir = path.dirname(dir);
  }
}
loadEnv();

const POEMS_DIR =
  process.env.POEMS_DIR ??
  process.env.POEMS_OUTPUT_DIR ??
  path.join(process.cwd(), "chinese-poetry-md");

const EXCERPT_MAX_LEN = 30;

function excerptFromParagraphs(paragraphs: string[]): string | null {
  if (!paragraphs?.length) return null;
  const first = paragraphs[0]?.trim() ?? "";
  if (first.length <= EXCERPT_MAX_LEN) return first || null;
  return first.slice(0, EXCERPT_MAX_LEN) + "…";
}

async function main(): Promise<void> {
  console.log("seed_db: loading from", POEMS_DIR);
  const { poems, authors, dynasties, tags } = loadAll(POEMS_DIR);
  const bioMap = loadAuthorBios(POEMS_DIR);
  console.log(`seed_db: ${poems.length} poems, ${authors.length} authors, ${dynasties.length} dynasties, ${tags.length} tags, ${bioMap.size} author bios`);

  const dbType = (process.env.DATABASE_TYPE ?? "sqlite").toLowerCase();
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (dbType === "turso" && tursoUrl) {
    console.log("seed_db: database target: Turso (remote)");
  } else {
    console.log("seed_db: database path:", getDatabasePath());
  }

  const db = await getDb();
  await createTables(db);

  await db.exec("DELETE FROM poem_tags");
  await db.exec("DELETE FROM poem_content");
  await db.exec("DELETE FROM poems");
  await db.exec("DELETE FROM authors");
  await db.exec("DELETE FROM dynasties");
  await db.exec("DELETE FROM tags");

  const isPg = db.dialect === "postgres";

  for (const t of tags) {
    if (isPg) {
      await db.run(
        "INSERT INTO tags (slug, name, poem_count) VALUES (?, ?, ?) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, poem_count = EXCLUDED.poem_count",
        [t.slug, t.name, t.poem_count]
      );
    } else {
      await db.run("INSERT OR REPLACE INTO tags (slug, name, poem_count) VALUES (?, ?, ?)", [t.slug, t.name, t.poem_count]);
    }
  }
  for (const a of authors) {
    const descRaw = bioMap.get(a.slug) ?? null;
    const desc = compressToBlob(descRaw ?? null);
    if (isPg) {
      await db.run(
        "INSERT INTO authors (slug, name, poem_count, description) VALUES (?, ?, ?, ?) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, poem_count = EXCLUDED.poem_count, description = EXCLUDED.description",
        [a.slug, a.name, a.poem_count, desc]
      );
    } else {
      await db.run("INSERT OR REPLACE INTO authors (slug, name, poem_count, description) VALUES (?, ?, ?, ?)", [a.slug, a.name, a.poem_count, desc]);
    }
  }
  for (const d of dynasties) {
    if (isPg) {
      await db.run(
        "INSERT INTO dynasties (slug, name, poem_count) VALUES (?, ?, ?) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, poem_count = EXCLUDED.poem_count",
        [d.slug, d.name, d.poem_count]
      );
    } else {
      await db.run("INSERT OR REPLACE INTO dynasties (slug, name, poem_count) VALUES (?, ?, ?)", [d.slug, d.name, d.poem_count]);
    }
  }
  console.log("seed_db: authors, dynasties, tags inserted");

  for (const p of poems) {
    const excerpt = excerptFromParagraphs(p.paragraphs);
    if (isPg) {
      await db.run(
        "INSERT INTO poems (slug, title, author_slug, dynasty_slug, rhythmic, excerpt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, author_slug = EXCLUDED.author_slug, dynasty_slug = EXCLUDED.dynasty_slug, rhythmic = EXCLUDED.rhythmic, excerpt = EXCLUDED.excerpt",
        [p.slug, p.title, p.authorSlug, p.dynastySlug, p.rhythmic ?? null, excerpt]
      );
      const paraJson = JSON.stringify(p.paragraphs);
      const paraBlob = compressToBlob(paraJson)!;
      await db.run(
        "INSERT INTO poem_content (slug, paragraphs, translation, appreciation, annotation) VALUES (?, ?, ?, ?, ?) ON CONFLICT (slug) DO UPDATE SET paragraphs = EXCLUDED.paragraphs, translation = EXCLUDED.translation, appreciation = EXCLUDED.appreciation, annotation = EXCLUDED.annotation",
        [p.slug, paraBlob, compressToBlob(p.translation ?? null), compressToBlob(p.appreciation ?? null), compressToBlob(p.annotation ?? null)]
      );
    } else {
      const paraJson = JSON.stringify(p.paragraphs);
      const paraBlob = compressToBlob(paraJson)!;
      await db.run("INSERT OR REPLACE INTO poems (slug, title, author_slug, dynasty_slug, rhythmic, excerpt) VALUES (?, ?, ?, ?, ?, ?)", [
        p.slug,
        p.title,
        p.authorSlug,
        p.dynastySlug,
        p.rhythmic ?? null,
        excerpt,
      ]);
      await db.run("INSERT OR REPLACE INTO poem_content (slug, paragraphs, translation, appreciation, annotation) VALUES (?, ?, ?, ?, ?)", [
        p.slug,
        paraBlob,
        compressToBlob(p.translation ?? null),
        compressToBlob(p.appreciation ?? null),
        compressToBlob(p.annotation ?? null),
      ]);
    }

    for (const tagSlug of p.tags ?? []) {
      const s = typeof tagSlug === "string" ? toSlug(tagSlug) : toSlug(String(tagSlug));
      if (s) {
        if (isPg) {
          await db.run("INSERT INTO poem_tags (poem_slug, tag_slug) VALUES (?, ?) ON CONFLICT (poem_slug, tag_slug) DO NOTHING", [p.slug, s]);
        } else {
          await db.run("INSERT OR IGNORE INTO poem_tags (poem_slug, tag_slug) VALUES (?, ?)", [p.slug, s]);
        }
      }
    }
  }

  console.log("seed_db: poems, poem_content, poem_tags inserted");

  const poemRow = await db.get<{ c: number }>("SELECT count(*) as c FROM poems");
  const authorRow = await db.get<{ c: number }>("SELECT count(*) as c FROM authors");
  const contentRow = await db.get<{ c: number }>("SELECT count(*) as c FROM poem_content");
  const poemCount = poemRow?.c ?? 0;
  const authorCount = authorRow?.c ?? 0;
  const contentCount = contentRow?.c ?? 0;
  console.log(`seed_db: verified: ${poemCount} poems, ${authorCount} authors, ${contentCount} poem_content rows`);

  if (!isPg && dbType === "sqlite") {
    await db.exec("VACUUM");
    console.log("seed_db: VACUUM done.");
  }

  await closeDb();
  console.log("seed_db: done.");
}

main();
