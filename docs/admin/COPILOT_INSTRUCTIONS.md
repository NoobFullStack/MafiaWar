# GitHub Copilot Coding Agent Instructions

These are the recommended instructions for using GitHub Copilot Coding Agent in the `@NoobFullStack/MafiaWar` repository. They ensure that Copilot contributions are high quality, safe, and consistent with our workflow.

---

## 1. Scope and Task Types

- **Focus Areas:**  
  Assign Copilot Coding Agent to **small, well-defined tasks**:
  - Bug fixes
  - Small/incremental features
  - Code refactoring
  - Improving test coverage
  - Updating documentation

- **Do Not Use For:**  
  Large-scale or architectural changes.

- **Validation:**  
  All work must be validated with tests and/or manual checks before merging.

---

## 2. Task Specification

- **Clear, Specific Prompts:**  
  Always specify files, functions, and desired outcomes.
  - Example:  
    `Fix the bug in src/game/Player.ts where player health isn’t updating.`
  - Example:  
    `Add a test for attackEnemy in src/game/Combat.test.ts.`
  - Example:  
    `Document the usage of yarn start in README.md.`

- **Acceptance Criteria:**  
  Define what "done" means for every task.

---

## 3. Workflow with Yarn

- **Dependency Management:**  
  Use `yarn` for all dependency and script management:
    - `yarn install`
    - `yarn test`
    - `yarn lint`

- **Validation:**  
  Code must pass `yarn test` and `yarn lint` before merging.

- **Scripts:**  
  Newly added scripts must be documented in `package.json` and in the project README.

---

## 4. Testing Requirements

- **Test Coverage:**  
  All bug fixes and features **must include tests** (unit/integration as appropriate).

- **Run Tests:**  
  Always verify with `yarn test`.  
  If manual validation is needed, specify it in the PR description.

- **Test Files:**  
  Add or modify files in the `/tests` directory or relevant `*.test.ts` files as needed.

---

## 5. Documentation

- **Code Changes:**  
  Document all public APIs, new features, and significant changes.

- **README & Docs:**  
  Update `README.md` or other documentation files for:
    - New usage patterns
    - New scripts
    - Any behavioral changes

- **Inline Comments:**  
  Add meaningful comments where logic is non-trivial.

---

## 6. Pull Request and Review Process

- **PR Content:**  
  Every Copilot PR **must include**:
    - A clear description of what was changed and why
    - A checklist confirming:
      - Tests pass (`yarn test`)
      - Lint checks pass (`yarn lint`)
      - Documentation is updated

- **Self-Review:**  
  Summarize what was validated, including any manual testing performed.

---

## 7. General Best Practices

- **Small Commits:**  
  Prefer multiple small, atomic commits over large ones.

- **No Secrets:**  
  Never commit secrets or sensitive data.

- **Changelog:**  
  If a changelog is used, update it for notable changes.

---

## References

- [Best practices for using GitHub Copilot to work on tasks](https://docs.github.com/en/copilot/tutorials/coding-agent/get-the-best-results)
- [GitHub Copilot coding agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent)
