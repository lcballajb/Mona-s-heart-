# Security update register

| Item                     | Baseline                    | Source                     | Cadence | Owner         | Status/evidence                          | Next review       |
| ------------------------ | --------------------------- | -------------------------- | ------- | ------------- | ---------------------------------------- | ----------------- |
| Node.js                  | 24 (package engines/.nvmrc) | nodejs.org releases        | Monthly | Engineering   | Monitor                                  | 2026-09-04        |
| PostgreSQL               | 16 container baseline       | postgresql.org security    | Monthly | Data/Security | Monitor                                  | 2026-09-04        |
| Dependencies/Actions     | Lockfile/workflows          | GitHub advisories/releases | Weekly  | Security      | Automated reminder/scan                  | 2026-08-11        |
| TLS/certificates/domains | Undocumented                | CA/registrar inventory     | Weekly  | Operations    | Missing—configure without exposing names | Before production |
| Containers/base images   | Alpine baselines            | Registry/vendor advisories | Weekly  | Security      | Scanning missing                         | Before production |
