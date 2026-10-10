import { execFileSync } from "node:child_process";

/** Runs SQL in the local Docker Compose database (E2E setup only). */
export function sql(statement: string) {
  return execFileSync("docker", ["compose", "exec", "-T", "db", "psql", "-U", "popspot", "-d", "popspot", "-tAc", statement], {
    cwd: "../..",
    encoding: "utf8",
  }).trim();
}
