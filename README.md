# Tengo for VS Code

Language support for [Tengo](https://github.com/d5/tengo) and Platforma Tengo
packages: syntax highlighting plus full IDE features powered by
[`tengo-lsp`](https://github.com/popoffvg/tengo-lsp).

## Features

- **Syntax highlighting** for `.tengo` files (TextMate grammar).
- **Go to definition**
  - jump from an `import("...")` string to the imported file;
  - jump from an import alias (`util` in `util := import(":util")`) to the
    imported file;
  - jump from `alias.member` to the matching key in the target file's
    `export { ... }` block;
  - resolve SDK artifact calls — `plapi.getTemplateId`, `ll.importTemplate`,
    `assets.importSoftware`, `assets.importAsset`, `getSoftwareInfo` — from
    their string argument to the artifact file.
- **Find references** across the open file.
- **Completion** — type `.` after an imported alias to list the members
  exported by that module.
- **Hover** — shows the signature and doc comment (`//` and `/** */` JSDoc
  blocks, resolved through wrapped `export` maps) of imported members.

### Import resolution

Imports are resolved the way the Platforma package builder resolves them:

- **Local artifacts** (`:util`, `:pframes.pcolumn`) resolve against the current
  package's `src/` directory, with dotted ids mapping to nested paths and
  `index.*` fallbacks.
- **Package artifacts** (`@scope/pkg:index`, `pkg:util`) resolve via the nearest
  `node_modules`, probing both the source layout and the published
  `dist/tengo/{lib,software,asset}/<id>.<ext>` layout.

Stdlib modules (`fmt`, `json`, `text`, `os`, …) are recognized and do not
navigate to a file.

## Installation

1. Install this extension from the VSIX or the Marketplace.
2. Open any `.tengo` file. On first activation the extension locates the
   `tengo-lsp` binary automatically:
   1. the `tengo.lsp.path` setting, if set and pointing at an existing file;
   2. a `tengo-lsp` found on your `PATH`;
   3. otherwise it **downloads the matching release binary** from
      [`popoffvg/tengo-lsp`](https://github.com/popoffvg/tengo-lsp/releases)
      and caches it in the extension's global storage.

No separate install step is required — the language server is fetched
on demand the first time you open a Tengo file.

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| `tengo.lsp.path` | `""` | Path to the `tengo-lsp` binary. If empty, the extension searches `PATH` and then downloads a release build. |

Supported download targets: macOS (`aarch64`, `x86_64`), Linux (`aarch64`,
`x86_64`), Windows (`x86_64`). On other platforms, build `tengo-lsp` yourself
and point `tengo.lsp.path` at it.

## Building the extension

```bash
npm install
npm run compile        # bundle src/extension.ts -> out/extension.js
npm run package        # produces a .vsix
```

## License

MIT
