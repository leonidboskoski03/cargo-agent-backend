# 20 - Contract Discipline

API behavior source of truth: `docs/contracts/api/*.md`.

- Before API edits, load matching contract file.
- If code and contract differ, surface mismatch explicitly.
- If API behavior changes, update the matching contract in the same change.
- Do not treat archive files as active contract input.
- Follow precedence in `docs/README.md` when docs conflict.

