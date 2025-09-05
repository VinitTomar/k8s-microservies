#!/usr/bin/env ts-node

// @ts-nocheck

import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

interface PnpmProject {
  name: string;
  path: string; // absolute path reported by pnpm
}

/** Find repo root (directory containing pnpm-workspace.yaml) */
function findRepoRoot(startDir: string) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("pnpm-workspace.yaml not found in any parent directory");
}

/** Run pnpm list -r --depth=-1 --json and parse result */
function readPnpmProjects(): PnpmProject[] {
  try {
    const out = execSync("pnpm list -r --depth=-1 --json", { encoding: "utf8" });
    return JSON.parse(out) as any[];
  } catch (err: any) {
    console.error("Failed to run `pnpm list`. Ensure pnpm is available in this environment.");
    throw err;
  }
}

/** Return only workspace projects that are declared as dependencies (not devDeps) of the app */
function getWorkspaceDepsForApp(appPkgPath: string, allProjects: PnpmProject[]) {
  const pkg = JSON.parse(fs.readFileSync(appPkgPath, "utf8"));
  const deps = Object.keys(pkg.dependencies ?? {});
  // only workspace ones: find in allProjects by name
  const workspaceDeps = allProjects.filter(p => deps.includes(p.name));
  return { workspaceDeps, appName: pkg.name as string | undefined };
}

/** For a given workspace package, compute the relative paths to include:
 *  - package.json (file)
 *  - directory containing "main" (if defined)
 *  - directory containing "types" (if defined)
 *  All paths returned are relative to repoRoot.
 */
function collectMinimalPathsForProject(project: PnpmProject, repoRoot: string): string[] {
  const pkgJsonAbs = path.join(project.path, "package.json");
  if (!fs.existsSync(pkgJsonAbs)) return [];

  const pkg = JSON.parse(fs.readFileSync(pkgJsonAbs, "utf8"));
  const relPaths = new Set<string>();

  // add package.json (file relative)
  relPaths.add(path.relative(repoRoot, pkgJsonAbs));

  // add directory containing main (if present)
  if (pkg.main && typeof pkg.main === "string") {
    const mainAbs = path.join(project.path, pkg.main);
    const mainDirAbs = fs.existsSync(mainAbs) ? path.dirname(mainAbs) : path.dirname(path.join(project.path, pkg.main));
    relPaths.add(path.relative(repoRoot, mainDirAbs));
  }

  // add directory containing types (if present)
  if (pkg.types && typeof pkg.types === "string") {
    const typesAbs = path.join(project.path, pkg.types);
    const typesDirAbs = fs.existsSync(typesAbs) ? path.dirname(typesAbs) : path.dirname(path.join(project.path, pkg.types));
    relPaths.add(path.relative(repoRoot, typesDirAbs));
  }

  return Array.from(relPaths);
}

/** Create tarball at outputPath by invoking system tar with -C repoRoot <paths...> */
function createTarball(repoRoot: string, relPaths: string[], outputPath: string) {
  if (relPaths.length === 0) {
    console.log("No files/dirs to include in tarball. Exiting.");
    return;
  }

  // validate existence and filter
  const existing = relPaths.filter(p => fs.existsSync(path.join(repoRoot, p)));
  if (existing.length === 0) {
    console.log("No existing paths found to include in tarball. Exiting.");
    return;
  }

  // spawn tar safely without shell quoting issues
  const args = ["-czf", outputPath, "-C", repoRoot, ...existing];
  console.log("Running: tar " + args.map(a => (a.includes(" ") ? `"${a}"` : a)).join(" "));
  const res = spawnSync("tar", args, { stdio: "inherit" });
  if (res.error) {
    throw res.error;
  }
  if (res.status !== 0) {
    throw new Error(`tar exited with code ${res.status}`);
  }
}

/** Main CLI */
function main() {
  const idx = process.argv.indexOf("--app");
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error("Usage: ts-node generate-minimal-dep-tar.ts --app ./relative/path/to/app");
    process.exit(1);
  }

  const appArg = process.argv[idx + 1];
  const appPath = path.resolve(appArg);
  const appPkgPath = path.join(appPath, "package.json");
  if (!fs.existsSync(appPkgPath)) {
    console.error(`Could not find package.json for app at ${appPkgPath}`);
    process.exit(1);
  }

  const repoRoot = findRepoRoot(appPath);
  const allProjects = readPnpmProjects();

  const { workspaceDeps, appName } = getWorkspaceDepsForApp(appPkgPath, allProjects);
  console.log(`App: ${appName ?? appArg}`);
  console.log(`Found ${workspaceDeps.length} workspace dependency(ies) from package.json dependencies (devDeps ignored).`);

  // collect minimal relative paths (deduplicated)
  const relPathsSet = new Set<string>();
  for (const proj of workspaceDeps) {
    // Ensure it's inside repoRoot (workspace)
    const projAbs = path.resolve(proj.path);
    if (!projAbs.startsWith(repoRoot)) {
      console.log(`Skipping non-workspace dependency: ${proj.name}`);
      continue;
    }
    const paths = collectMinimalPathsForProject(proj, repoRoot);
    for (const p of paths) relPathsSet.add(p);
  }

  const relPaths = Array.from(relPathsSet);
  const outputTar = path.join(repoRoot, appName+".tar.gz");

  createTarball(repoRoot, relPaths, outputTar);
  console.log(`✅ Created ${outputTar} with ${relPaths.length} item(s).`);
}

main();
