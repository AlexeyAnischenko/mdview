---
title: Sample
tags: [test, mdview]
---
# mdview sample

Intro with **bold**, *italic*, ~~strike~~, `code`, a link to [other doc](sub/other.md#second), an autolink https://example.com and a footnote.[^1]

## Table & tasks

| Lib | Size | Note |
|:----|-----:|:----:|
| marked | 40 KB | parser |
| mermaid | 2.6 MB | lazy |

- [x] done
- [ ] todo

## Code

```js
const greet = (name) => `Hello, ${name}!`;
console.log(greet('world'));
```

```python
def f(x: int) -> int:
    return x * 2
```

## Math

Inline $E = mc^2$ and prices $5 and $10 stay text.

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

## Diagram

```mermaid
graph LR
  A[Markdown] --> B(marked) --> C{DOMPurify} --> D[Page]
```

## PlantUML

```plantuml
@startuml
actor User
User -> Viewer : open notes.md
Viewer -> Browser : render
Browser --> User : HTML
@enduml
```

```puml
class Viewer {
  +render(text)
}
class Loader
Viewer --> Loader : reads
Loader <|-- FileLoader
```

## Alerts

> [!NOTE]
> Useful information.

> [!WARNING]
> Careful here.

## Images

Images are loaded relative to the Markdown file — here from a subfolder, with spaces in the names.

Vector (SVG), Markdown syntax with a hover title:

![How mdview works](sub/how%20it%20works.svg "Markdown in, rendered page out")

Raster (PNG), an HTML `<img>` tag with a width — a Mandelbrot set, seahorse valley:

<img src="sub/mandelbrot%20set.png" alt="Mandelbrot set, seahorse valley" width="560">

<details><summary>HTML details</summary>Hidden text <script>alert('xss')</script><img src=x onerror="alert(1)"></details>

[^1]: The footnote text.
