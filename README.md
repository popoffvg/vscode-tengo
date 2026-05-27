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

Pick whichever source applies. After installing, the language server itself
needs no separate step — see [Language server](#language-server) below.

### From a `.vsix` (GitHub release)

1. Download `tengo-<version>.vsix` from the
   [Releases page](https://github.com/popoffvg/vscode-tengo/releases).
2. In VS Code: open the Command Palette (`Cmd/Ctrl+Shift+P`) →
   **Extensions: Install from VSIX…** → select the downloaded file.
   Or from a terminal:
   ```bash
   code --install-extension tengo-<version>.vsix
   ```

### From the Marketplace / Open VSX

Once published, search for **Tengo** (publisher `popoffvg`) in the Extensions
view, or:

```bash
code --install-extension popoffvg.tengo
```

### Language server

On first activation (when you open any `.tengo` file) the extension locates the
`tengo-lsp` binary automatically, in this order:

1. the `tengo.lsp.path` setting, if set and pointing at an existing file;
2. a `tengo-lsp` found on your `PATH`;
3. otherwise it **downloads the matching release binary** from
   [`popoffvg/tengo-lsp`](https://github.com/popoffvg/tengo-lsp/releases) and
   caches it in the extension's global storage.

No manual install of the server is required — it is fetched on demand the first
time you open a Tengo file. If the download fails (e.g. offline or an
unsupported platform), build `tengo-lsp` yourself and point `tengo.lsp.path` at
the binary.

Supported download targets: macOS (`aarch64`, `x86_64`), Linux (`aarch64`,
`x86_64`), Windows (`x86_64`).

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| `tengo.lsp.path` | `""` | Path to the `tengo-lsp` binary. If empty, the extension searches `PATH` and then downloads a release build. |

## Development

```bash
npm install
npm run compile        # one-off bundle: src/extension.ts -> out/extension.js
npm run watch          # rebuild on change
npm run package        # produce a local .vsix via @vscode/vsce
```

Press `F5` in VS Code to launch an Extension Development Host with the extension
loaded.

## Releasing

Releases are automated by [`.github/workflows/release.yml`](.github/workflows/release.yml).
Pushing a tag of the form `vX.Y.Z` triggers a workflow that:

1. installs dependencies and compiles the bundle;
2. sets `package.json`'s version from the tag;
3. packages `tengo-<version>.vsix`;
4. creates a GitHub release with auto-generated notes and attaches the VSIX;
5. publishes to the VS Code Marketplace and Open VSX **if** the corresponding
   tokens are configured.

```bash
# cut a release
git tag v0.1.1
git push origin v0.1.1
```

Marketplace publishing is optional and skipped unless these repository secrets
are set:

| Secret | Used for |
| --- | --- |
| `VSCE_PAT` | Publishing to the VS Code Marketplace (`vsce publish`). |
| `OVSX_PAT` | Publishing to [Open VSX](https://open-vsx.org) (`ovsx publish`). |

Without them, the workflow still builds the VSIX and attaches it to the GitHub
release.

## License

MIT — see [LICENSE](LICENSE).
