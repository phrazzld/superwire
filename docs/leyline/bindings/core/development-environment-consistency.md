---
id: development-environment-consistency
last_modified: '2025-06-09'
version: '0.2.0'
derived_from: automation
enforced_by: 'container orchestration, development containers, version managers, IDE configuration automation'
---

# Binding: Establish Consistent Development Environment Automation

Eliminate "works on my machine" through automated, reproducible environments. One command to start, same behavior everywhere.

## Rationale

Manual environment setup is a bug in your process. Like a perfectly organized workshop where every tool has its place, automated environments ensure developers spend time building, not configuring. The investment in environment automation pays immediate dividends through eliminated setup friction, consistent behavior, and preserved focus on actual development work.

## Rule Definition

**Required:**
- One-command environment setup (`docker-compose up` or equivalent)
- Exact version pinning for all languages and tools
- Container-based or virtualized development environments
- IDE/editor configuration included and versioned
- Local execution of same quality gates as CI/CD
- Automated dependency installation on environment creation

**Prohibited:**
- Manual setup steps in documentation
- Global tool installation requirements
- "It works on my machine" as valid defense
- Version ranges instead of exact versions
- Undocumented environment variables
- Setup requiring more than 5 minutes

## Tiered Implementation

### 🚀 Tier 1: Essential (Must Have)
- **Version specification**: `.tool-versions` or equivalent
- **Basic container**: Simple Dockerfile with dependencies
- **IDE config**: `.vscode/settings.json` or `.editorconfig`
- **Setup script**: Single command initialization

### ⚡ Tier 2: Enhanced (Should Have)
- **Service orchestration**: `docker-compose.yml` for databases/redis
- **Git hooks**: Pre-commit hooks auto-installed
- **Local quality gates**: Run linting/tests locally
- **Performance optimization**: Volume mounts, build caching

### 🏆 Tier 3: Enterprise (Nice to Have)
- **Multi-project coordination**: Shared service management
- **Compliance scanning**: Security checks in dev
- **Advanced monitoring**: Container health metrics
- **Self-healing**: Auto-recovery from common issues

## Implementation Patterns

### Development Container Configuration
```json
// .devcontainer/devcontainer.json
{
  "name": "Project Dev Environment",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "postCreateCommand": "make setup",
  "customizations": {
    "vscode": {
      "extensions": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"],
      "settings": {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": true
        }
      }
    }
  }
}
```

### Version Management
```bash
# .tool-versions (asdf format)
nodejs 18.19.0
python 3.11.7
golang 1.21.5
postgres 15.2

# Or package.json engines
"engines": {
  "node": "18.19.0",
  "npm": "10.2.4"
}
```

### One-Command Setup
```bash
#!/bin/bash
# setup.sh - Everything needed to start developing
set -euo pipefail

echo "🚀 Setting up development environment..."

# Install dependencies
npm ci
pip install -r requirements.txt

# Start services
docker-compose up -d

# Run migrations
npm run db:migrate

# Verify setup
npm run health-check

echo "✅ Ready! Run 'npm run dev' to start"
```

### Service Orchestration
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    volumes:
      - .:/app
      - /app/node_modules  # Preserve container's node_modules
    environment:
      - DATABASE_URL=postgres://dev:dev@postgres:5432/app
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

## Validation

- [ ] New developer productive in <5 minutes
- [ ] `git clone && ./setup.sh` just works
- [ ] Same behavior on Mac, Linux, Windows (WSL2)
- [ ] IDE opens with correct settings/extensions
- [ ] All services start automatically
- [ ] Tests run identically locally and in CI
- [ ] No "missing dependency" errors
- [ ] Clear error messages when setup fails

## Examples

### Good: Everything Automated
```bash
git clone repo && cd repo
./setup.sh  # or: docker-compose up
# ✅ Ready to code in 2 minutes
```

### Bad: Manual Setup Hell
```bash
# ❌ Install Node 18 (but not 19!)
# ❌ Install Python 3.11.7 specifically
# ❌ Install PostgreSQL and create database
# ❌ Copy .env.example to .env and edit...
# ❌ Run migrations but first you need to...
# 😭 2 hours later still debugging
```

## Tools & Automation

- **Containers**: Docker, Dev Containers, Vagrant
- **Version Managers**: asdf, nvm, pyenv, rbenv
- **Orchestration**: docker-compose, Tilt, Skaffold
- **IDE Config**: VS Code settings, EditorConfig
- **Setup Tools**: Make, Task, Just

## Related Bindings

- [automated-quality-gates](automated-quality-gates.md): Run same checks locally
- [git-hooks-automation](git-hooks-automation.md): Auto-install pre-commit hooks
- [tooling-investment](tooling-investment.md): Invest in developer productivity
