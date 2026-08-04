# SBOM policy

Generate CycloneDX JSON from the lockfile at releases and monthly; attach as a restricted build artifact unless disclosure is approved. Record tool/version, commit, timestamp and hash. Security validates completeness across npm, containers and OS packages, reconciles licenses with `THIRD_PARTY_NOTICES.md`, and retains SBOMs with release evidence. An SBOM is an inventory—not proof of safety or license compliance.
