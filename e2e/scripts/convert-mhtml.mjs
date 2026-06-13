/**
 * Convert an IE-exported MHTML snapshot into a clean, Chromium-loadable HTML fixture.
 *
 * Steps (per the Estratégia de Testes doc, US-3.2):
 *  1. Split the MIME multipart, find the text/html part, decode quoted-printable
 *     using the part's declared charset (preserves pt-BR accents: ç, ã...).
 *  2. Strip external resources (link/script/img) so the page renders offline.
 *  3. Neutralize __doPostBack so clicks/Enter don't POST to a dead endpoint.
 *     __VIEWSTATE hidden inputs are kept (harmless, preserves DOM shape).
 *
 * Pure Node stdlib — no third-party deps, CI-friendly (no Python at runtime).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

/** Decode a quoted-printable body (latin1-encoded byte string) into text via charset. */
function decodeQuotedPrintable(raw, charset) {
  const noSoftBreaks = raw.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < noSoftBreaks.length; i++) {
    const ch = noSoftBreaks[i];
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(noSoftBreaks.slice(i + 1, i + 3))) {
      bytes.push(parseInt(noSoftBreaks.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(ch.charCodeAt(0) & 0xff);
    }
  }
  const decoder = new TextDecoder(charset || 'utf-8');
  return decoder.decode(Uint8Array.from(bytes));
}

function extractHtml(mhtmlPath) {
  const raw = readFileSync(mhtmlPath, 'latin1');
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  if (!boundaryMatch) throw new Error('No MIME boundary found in ' + mhtmlPath);
  const boundary = '--' + boundaryMatch[1];
  const parts = raw.split(boundary);
  for (const part of parts) {
    if (/Content-Type:\s*text\/html/i.test(part)) {
      const headerEnd = part.search(/\r?\n\r?\n/);
      // MIME headers are 7-bit clean — only look for charset/encoding in the header,
      // never in the (still-encoded) body where <meta charset=3D"utf-8"> would mislead us.
      const header = headerEnd >= 0 ? part.slice(0, headerEnd) : part;
      const rawCharset = (header.match(/charset="?([^"\r\n;]+)"?/i) || [])[1] || 'utf-8';
      const charset = rawCharset.replace(/[^A-Za-z0-9-]/g, '') || 'utf-8';
      const cte = (header.match(/Content-Transfer-Encoding:\s*([^\r\n]+)/i) || [])[1] || '';
      let body = part.slice(headerEnd).replace(/^\r?\n\r?\n/, '');
      if (/quoted-printable/i.test(cte)) body = decodeQuotedPrintable(body, charset);
      return body;
    }
  }
  throw new Error('No text/html part found in ' + mhtmlPath);
}

function cleanForChromium(html) {
  return html
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<!--\[if[^\]]*?\]>[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<meta\b[^>]*http-equiv=["']?X-UA-Compatible["']?[^>]*>/gi, '')
    // neutralize ASP.NET postbacks so the static fixture doesn't try to POST
    .replace(/javascript:__doPostBack\([^)]*\)/gi, 'void(0)');
}

const TARGETS = [
  {
    src: 'docs/RAL/RAL - Relatório Anual de Lavra/LAVRA/PRODUÇÃO BRUTA/MOVIMENTAÇÃO DA PRODUÇÃO BRUTA/Informar a movimentação da produção bruta - 2.33.85.760.mhtml',
    out: 'e2e/fixtures/generated/ral-movimentacao.html',
  },
];

mkdirSync(resolve(repoRoot, 'e2e/fixtures/generated'), { recursive: true });
for (const t of TARGETS) {
  const html = cleanForChromium(extractHtml(resolve(repoRoot, t.src)));
  writeFileSync(resolve(repoRoot, t.out), html, 'utf-8');
  console.log(`converted: ${t.out} (${html.length} bytes)`);
}
