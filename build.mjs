// Builds mdview.html: downloads the pinned libraries into vendor/ (cached) and inlines them into
// src/template.html. Bump a version below and run `node build.mjs` to update.
// `node build.mjs --no-plantuml` leaves PlantUML out (-2.3 MB; plantuml blocks then show as code).
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CDN = 'https://cdn.jsdelivr.net/npm/';
const KATEX = 'katex@0.16.22';
const HLJS = '@highlightjs/cdn-assets@11.11.1';
const PLANTUML = '@plantuml/core@1.2026.8';
const WITH_PLANTUML = !process.argv.includes('--no-plantuml');
const LIBS = {
  marked: 'marked@15.0.12/marked.min.js',
  footnote: 'marked-footnote@1.2.4/dist/index.umd.min.js',
  purify: 'dompurify@3.2.6/dist/purify.min.js',
  hljs: `${HLJS}/highlight.min.js`,
  katex: `${KATEX}/dist/katex.min.js`,
  mermaid: 'mermaid@11.6.0/dist/mermaid.min.js',
  'gh-css': 'github-markdown-css@5.8.1/github-markdown.css',
  'hljs-light': `${HLJS}/styles/github.min.css`,
  'hljs-dark': `${HLJS}/styles/github-dark.min.css`,
  'katex-css': `${KATEX}/dist/katex.min.css`,
  plantuml: `${PLANTUML}/plantuml.js`,
  'plantuml-viz': `${PLANTUML}/viz-global.js`,
  'plantuml-themes': `${PLANTUML}/themes.js`,
};

// plantuml.js is an ES module; the page runs libraries as classic scripts, so wrap it and expose its exports.
function plantumlClassic(js) {
  const re = /export\s*\{\s*(\w+) as render\s*,\s*(\w+) as renderToString\s*\};?\s*$/;
  if (!re.test(js)) throw new Error('plantuml.js: export statement not found');
  return `(function () {\n'use strict';\n${js.replace(re, 'globalThis.plantumlCore = { render: $1, renderToString: $2 };')}\n})();`;
}

// License texts for THIRD-PARTY-NOTICES.md (also embedded in mdview.html, since the bundled code is compressed).
const NOTICES = [
  ['marked', LIBS.marked, 'MIT', 'marked@15.0.12/LICENSE.md'],
  ['marked-footnote', LIBS.footnote, 'MIT', 'https://raw.githubusercontent.com/bent10/marked-extensions/main/license'],
  ['DOMPurify', LIBS.purify, 'MPL-2.0 OR Apache-2.0', 'dompurify@3.2.6/LICENSE'],
  ['highlight.js', LIBS.hljs, 'BSD-3-Clause', `${HLJS}/LICENSE`],
  ['KaTeX (code and fonts)', LIBS.katex, 'MIT', `${KATEX}/LICENSE`],
  ['Mermaid', LIBS.mermaid, 'MIT', 'mermaid@11.6.0/LICENSE'],
  ['github-markdown-css', LIBS['gh-css'], 'MIT', 'github-markdown-css@5.8.1/license'],
  ['PlantUML (@plantuml/core, incl. themes)', LIBS.plantuml, 'MIT', `${PLANTUML}/LICENSE`, true],
  ['Viz.js 3.24.0 (in @plantuml/core viz-global.js)', LIBS['plantuml-viz'], 'MIT', 'https://raw.githubusercontent.com/mdaines/viz-js/v3/LICENSE', true],
  ['Graphviz 14.1.1 (object code inside Viz.js)', 'source: https://gitlab.com/graphviz/graphviz/-/tree/14.1.1', 'EPL-2.0', 'https://gitlab.com/graphviz/graphviz/-/raw/14.1.1/LICENSE', true],
  ['Expat (object code inside Viz.js)', 'source: https://github.com/libexpat/libexpat', 'MIT', 'https://raw.githubusercontent.com/libexpat/libexpat/master/expat/COPYING', true],
];

async function notices() {
  let out = '# Third-party notices\n\nmdview.html bundles the following software. Each component keeps its own license; the\n' +
    'full texts follow. Graphviz is distributed in object code form under the Eclipse Public License 2.0;\n' +
    'its source code is available at https://gitlab.com/graphviz/graphviz/-/tree/14.1.1.\n';
  for (const [name, spec, license, licenseFile, plantumlOnly] of NOTICES) {
    if (plantumlOnly && !WITH_PLANTUML) continue;
    out += `\n---\n\n## ${name}\n\n${spec} — ${license}\n\n\`\`\`\n${(await get(licenseFile)).trim()}\n\`\`\`\n`;
    if (name === 'Mermaid') {
      const js = await get(LIBS.mermaid);
      const i = js.indexOf('Bundled license information:');
      out += `\nMermaid bundles further libraries; their notices, as shipped in mermaid.min.js:\n\n\`\`\`\n${js.slice(i, js.indexOf('*/', i)).trim()}\n\`\`\`\n`;
    }
  }
  return out;
}

async function get(spec, binary = false) {
  const file = path.join(ROOT, 'vendor', spec.replace(/^https?:\/\//, '').replace(/[/@:]/g, '_'));
  const url = /^https?:/.test(spec) ? spec : CDN + spec;
  let buf;
  try {
    buf = await fs.readFile(file);
  } catch {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    buf = Buffer.from(await r.arrayBuffer());
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, buf);
    console.log('downloaded', spec);
  }
  return binary ? buf : buf.toString('utf8');
}

// github-markdown-css switches theme only by media query; add explicit [data-theme] overrides.
function themeGithubCss(css) {
  const block = (scheme) => {
    const re = new RegExp(`@media \\(prefers-color-scheme: ${scheme}\\) \\{\\s*\\.markdown-body, \\[data-theme="${scheme}"\\] \\{([\\s\\S]*?)\\n  \\}\\n\\}`);
    const m = re.exec(css);
    if (!m) throw new Error(`github-markdown-css: ${scheme} block not found`);
    css = css.replace(m[0], '');
    return m[1];
  };
  const dark = block('dark'), light = block('light');
  return `.markdown-body {${light}}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .markdown-body {${dark}} }
:root[data-theme="dark"] .markdown-body {${dark}}
${css}`;
}

// Prefixes every selector of a flat (no @-rules) stylesheet.
function scope(css, prefix) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel, body) =>
    sel.split(',').map((s) => `${prefix} ${s.trim()}`).join(',') + `{${body}}`);
}

async function katexCss() {
  let css = await get(LIBS['katex-css']);
  const fonts = [...new Set([...css.matchAll(/url\((fonts\/[^)]+?\.woff2)\)/g)].map((m) => m[1]))];
  for (const f of fonts) {
    const data = (await get(`${KATEX}/dist/${f}`, true)).toString('base64');
    css = css.split(`url(${f})`).join(`url(data:font/woff2;base64,${data})`);
  }
  // keep only the (now inlined) woff2 source in each @font-face
  return css.replace(/(format\("woff2"\)),url\([^)]+\) format\("woff"\),url\([^)]+\) format\("truetype"\)/g, '$1');
}

// highlight.min.js is the ~36-language "common" build; these are added on top.
const EXTRA_LANGUAGES = ['powershell', 'dos', 'dockerfile', 'cmake', 'nginx', 'apache', 'groovy', 'gradle', 'scala', 'dart',
  'elixir', 'haskell', 'protobuf', 'latex', 'vim', 'x86asm', 'armasm', 'fsharp', 'clojure', 'erlang', 'ocaml', 'julia'];

const hljsLight = await get(LIBS['hljs-light']);
const hljsDark = await get(LIBS['hljs-dark']);
const parts = {
  versions: Object.values(LIBS).filter((s) => WITH_PLANTUML || !s.startsWith(PLANTUML)).filter((s) => s.endsWith('.js')).map((s) => s.match(/^(@[^/]+\/)?[^/]+/)[0]).filter((s, i, a) => a.indexOf(s) === i).join(', '),
  'gh-css': themeGithubCss(await get(LIBS['gh-css'])),
  'hljs-css': hljsLight.replace(/\/\*[\s\S]*?\*\//g, '') +
    `\n@media (prefers-color-scheme: dark) {${scope(hljsDark, ':root:not([data-theme="light"])')}}\n` +
    scope(hljsDark, ':root[data-theme="dark"]'),
};
// The page unpacks these at runtime with DecompressionStream (see lib() in the template).
const pack = (text) => zlib.gzipSync(text, { level: 9 }).toString('base64');
for (const k of ['marked', 'footnote', 'purify', 'katex', 'mermaid']) parts[k] = pack(await get(LIBS[k]));
let hljs = await get(LIBS.hljs);
for (const lang of EXTRA_LANGUAGES) hljs += '\n' + await get(`${HLJS}/languages/${lang}.min.js`);
parts.hljs = pack(hljs);
parts['katex-css'] = pack(await katexCss());

let html = await fs.readFile(path.join(ROOT, 'src', 'template.html'), 'utf8');
if (WITH_PLANTUML) {
  parts.plantuml = pack(plantumlClassic(await get(LIBS.plantuml)));
  parts['plantuml-viz'] = pack(await get(LIBS['plantuml-viz']));
  parts['plantuml-themes'] = pack(await get(LIBS['plantuml-themes']));
} else {
  html = html.replace(/^.*id="lib-plantuml[\w-]*".*\r?\n/gm, '');
}
parts.notices = await notices();
if (/<\/script/i.test(parts.notices)) throw new Error('notices would close their <script> element');
if (WITH_PLANTUML) await fs.writeFile(path.join(ROOT, 'THIRD-PARTY-NOTICES.md'), parts.notices);
html = html.replace(/\/\*@INLINE:([\w-]+)\*\//g, (_, name) => {
  if (!(name in parts)) throw new Error('unknown placeholder ' + name);
  return parts[name];
});
const out = path.join(ROOT, 'mdview.html');
await fs.writeFile(out, html);
console.log(`wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
