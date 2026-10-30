# mdview

A Markdown viewer in a single HTML file: [`mdview.html`](mdview.html) (~3.8 MB, works offline, no CDN).

**Try it online:** https://alexeyanischenko.github.io/mdview/mdview.html — e.g. the
[feature sample](https://alexeyanischenko.github.io/mdview/mdview.html?file=test/sample%20doc.md).

Renders GFM (tables, task lists, strikethrough, autolinks, footnotes), GitHub alerts (`> [!NOTE]`),
YAML front matter, highlighted code (highlight.js, 58 languages incl. PowerShell/batch/Dockerfile —
add more in `EXTRA_LANGUAGES` in `build.mjs`), KaTeX math (`$…$`, `$$…$$`, ```` ```math ````),
Mermaid diagrams, and PlantUML (```` ```plantuml ```` / ```` ```puml ````; `@startuml` is optional)
via the official in-browser engine `@plantuml/core` — no Java or server. Also: TOC sidebar,
light/dark/auto theme, copy buttons, live reload on file change, links between `.md` files, relative
images. HTML in the Markdown is sanitized with DOMPurify.

Libraries are stored gzipped + base64 and unpacked in the browser with `DecompressionStream`.
Mermaid, KaTeX (code and fonts) and PlantUML are only unpacked when a document uses them, so plain
documents open as fast as with a small file. `node build.mjs --no-plantuml` builds a 1.6 MB version
without PlantUML. PlantUML `!include <stdlib>` bundles (C4, AWS, …) are fetched from
plantuml.github.io when a diagram uses one; apart from that, mdview itself makes no network requests
(the document's own images and links load as usual).

## Opening a file

The file to show is given with `?file=`: a URL, a path relative to the page, or (with the local
server) a path on your disk.

| Where the viewer runs | Example | Local files on your disk |
|---|---|---|
| **Online** (GitHub Pages) | `https://alexeyanischenko.github.io/mdview/mdview.html?file=https://raw.githubusercontent.com/<user>/<repo>/<branch>/README.md` | drag & drop or **Open…** only |
| **Local server** (`mdview.cmd`) | `mdview.cmd C:\docs\notes.md` → `http://127.0.0.1:8765/?file=C:\docs\notes.md` | yes, by path |
| **Double-clicked** `mdview.html` | `file:///…/mdview.html` | drag & drop or **Open…** only |
| Chrome with file access | see below | yes, by path |

- `?file=` accepts any URL that allows cross-origin reads: `raw.githubusercontent.com`,
  `gist.githubusercontent.com`, and most static hosts. A GitHub page link
  (`github.com/<user>/<repo>/blob/…`) does not work — use the **Raw** link.
- A web page cannot read files from your computer by path — browsers forbid it, so
  `…github.io/…/mdview.html?file=C:\notes.md` shows an explanation instead. For local files either
  drop/open them in the page (re-rendered on change in Chrome and Edge), or run the local server.
- A page opened from `file://` can't read other local files either (opaque origin, in Chrome, Edge
  and Firefox alike); the page detects this and shows the alternatives.

### Local server

`mdview.cmd <file>` starts `serve.py` (Python 3, stdlib only) minimized and opens the file in the
default browser. The server binds `127.0.0.1:8765`, serves the viewer plus `.md`/`.txt`/image files
at `/@fs/<absolute path>`, and rejects requests with a foreign `Host` header. A second `mdview.cmd`
call reuses the running server; close its console window to stop it. Options: `--port N`,
`--no-open`. Relative images and links between `.md` files work, and the page re-renders when the
file changes.

### Chrome with file access

The flag is ignored if that Chrome profile is already running, hence a separate `--user-data-dir`:

```
chrome.exe --allow-file-access-from-files --user-data-dir="%LOCALAPPDATA%\mdview-chrome" "file:///C:/path/to/mdview.html?file=C:/docs/notes.md"
```

Keys: `Ctrl+O` open, `R` reload, `T` toggle TOC.

## Building

`mdview.html` is generated — edit `src/template.html`, then run `node build.mjs` (Node 18+).
Library versions are pinned at the top of `build.mjs`; downloads are cached in `vendor/` (not
committed). The build also writes [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md) and embeds the
same text in `mdview.html`. `test/` holds a sample document that exercises every feature.

## License

mdview is released under the [MIT License](LICENSE) — provided as is, without warranty of any kind.

## Third-party software

mdview.html bundles marked, marked-footnote, DOMPurify, highlight.js, KaTeX, Mermaid,
github-markdown-css and PlantUML (`@plantuml/core`, with Viz.js, Graphviz and Expat). All are MIT,
BSD-3-Clause or MPL-2.0/Apache-2.0, except Graphviz 14.1.1 (EPL-2.0, object code; source at
https://gitlab.com/graphviz/graphviz/-/tree/14.1.1). Full texts: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
