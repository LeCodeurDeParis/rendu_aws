import subprocess
import sys
import os

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
NUXT_DIR = os.path.join(ROOT_DIR, "code", "nuxt")


def run(cmd, cwd=None):
    print(f"> {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print("Lint failed")
        sys.exit(result.returncode)


def lint_nuxt():
    print("Running Nuxt ESLint checks")
    run("pnpm install", cwd=NUXT_DIR)
    run("pnpm run lint", cwd=NUXT_DIR)
    print("Lint passed")


if __name__ == "__main__":
    lint_nuxt()
