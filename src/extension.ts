import * as vscode from "vscode";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as child_process from "child_process";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

const REPO = "popoffvg/tengo-lsp";
let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const serverPath = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: "Tengo LSP" },
    (progress) => {
      progress.report({ message: "locating tengo-lsp…" });
      return getOrDownloadBinary(context, progress);
    }
  );

  if (!serverPath) {
    vscode.window.showErrorMessage(
      "tengo-lsp: could not find or download binary. Set tengo.lsp.path manually."
    );
    return;
  }

  const serverOptions: ServerOptions = {
    command: serverPath,
    transport: TransportKind.stdio,
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "tengo" }],
  };

  client = new LanguageClient("tengo-lsp", "Tengo Language Server", serverOptions, clientOptions);
  await client.start();
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}

async function getOrDownloadBinary(
  context: vscode.ExtensionContext,
  progress: vscode.Progress<{ message?: string }>
): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration("tengo.lsp");
  const configPath = config.get<string>("path");
  if (configPath && fs.existsSync(configPath)) {
    return configPath;
  }

  const inPath = findInPath("tengo-lsp");
  if (inPath) {
    return inPath;
  }

  const binaryName = process.platform === "win32" ? "tengo-lsp.exe" : "tengo-lsp";

  // Binary bundled into a platform-specific VSIX (see .github/workflows/release.yml).
  const bundledPath = path.join(context.extensionPath, "server", binaryName);
  if (fs.existsSync(bundledPath)) {
    if (process.platform !== "win32") {
      try {
        fs.chmodSync(bundledPath, 0o755);
      } catch {
        // best effort; binary may already be executable
      }
    }
    return bundledPath;
  }

  await fs.promises.mkdir(context.globalStorageUri.fsPath, { recursive: true });
  const cachedPath = path.join(context.globalStorageUri.fsPath, binaryName);
  if (fs.existsSync(cachedPath)) {
    return cachedPath;
  }

  const assetName = getAssetName();
  if (!assetName) {
    vscode.window.showErrorMessage(
      `tengo-lsp: unsupported platform ${process.platform}/${process.arch}`
    );
    return undefined;
  }

  progress.report({ message: `downloading ${assetName}…` });

  let downloadUrl: string;
  try {
    downloadUrl = await resolveLatestDownloadUrl(assetName);
  } catch (e) {
    vscode.window.showErrorMessage(`tengo-lsp: failed to fetch release info — ${e}`);
    return undefined;
  }

  const tmpArchive = path.join(os.tmpdir(), assetName);
  try {
    await downloadFile(downloadUrl, tmpArchive);
    progress.report({ message: "extracting…" });
    await extractBinary(tmpArchive, context.globalStorageUri.fsPath);
  } finally {
    if (fs.existsSync(tmpArchive)) {
      fs.unlinkSync(tmpArchive);
    }
  }

  if (!fs.existsSync(cachedPath)) {
    vscode.window.showErrorMessage("tengo-lsp: extraction produced no binary");
    return undefined;
  }

  if (process.platform !== "win32") {
    fs.chmodSync(cachedPath, 0o755);
  }

  return cachedPath;
}

function getAssetName(): string | undefined {
  const platformMap: Record<string, string> = {
    darwin: "darwin",
    linux: "linux",
    win32: "windows",
  };
  const archMap: Record<string, string> = {
    arm64: "aarch64",
    x64: "x86_64",
  };

  const p = platformMap[process.platform];
  const a = archMap[process.arch];
  if (!p || !a) {
    return undefined;
  }

  const ext = process.platform === "win32" ? ".zip" : ".tar.gz";
  return `tengo-lsp-${p}-${a}${ext}`;
}

function findInPath(bin: string): string | undefined {
  try {
    const cmd = process.platform === "win32" ? `where ${bin}` : `which ${bin}`;
    const result = child_process
      .execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] })
      .trim();
    return result || undefined;
  } catch {
    return undefined;
  }
}

async function resolveLatestDownloadUrl(assetName: string): Promise<string> {
  const apiUrl = `https://api.github.com/repos/${REPO}/releases/latest`;
  const body = await httpGet(apiUrl, {
    "User-Agent": "vscode-tengo",
    Accept: "application/vnd.github+json",
  });
  const release = JSON.parse(body) as {
    assets: { name: string; browser_download_url: string }[];
  };
  const asset = release.assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(`no asset named ${assetName} in latest release`);
  }
  return asset.browser_download_url;
}

function httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      https
        .get(u, { headers }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            follow(res.headers.location!);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${u}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (c: Buffer) => chunks.push(c));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        })
        .on("error", reject);
    };
    follow(url);
  });
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const follow = (u: string) => {
      https
        .get(u, { headers: { "User-Agent": "vscode-tengo" } }, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            follow(res.headers.location!);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} downloading ${u}`));
            return;
          }
          const out = fs.createWriteStream(dest);
          res.pipe(out);
          out.on("finish", resolve);
          out.on("error", reject);
        })
        .on("error", reject);
    };
    follow(url);
  });
}

async function extractBinary(archive: string, destDir: string): Promise<void> {
  if (archive.endsWith(".tar.gz")) {
    await execCommand(`tar -xzf "${archive}" -C "${destDir}"`);
  } else {
    await execCommand(
      `powershell -Command "Expand-Archive -Path '${archive}' -DestinationPath '${destDir}' -Force"`
    );
  }
}

function execCommand(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    child_process.exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}
