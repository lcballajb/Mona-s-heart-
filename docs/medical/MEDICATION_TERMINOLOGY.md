# Medication terminology

The browser calls only `GET /v1/terminology/medications?q=…`; the server validates the query and calls the official NLM RxNorm HTTPS API. Search begins at two characters. Results preserve RxCUI, prescribable name, term type, brand, ingredient, strength, dose form, source, retrieval time, and verification state, and duplicate RxCUIs are removed. RxNorm is not a recommendation, prescribing, dosing, start, or stop service. Explicit confirmation remains mandatory.

`RXNORM_PROXY_ENABLED` defaults off. Disabled/unavailable service preserves input and offers retry and free text as **Unverified entry**. The tiny fictional fallback is never verified and displays: “Fallback terminology data—verification may be limited.” Production must enable and monitor the server proxy after operational review.

Cache keys are SHA-256 hashes of provider plus normalized lower-case query; no identity is included. Positive TTL is 15 minutes, negative TTL one minute, maximum 500 process-local entries. Configuration changes invalidate by restart; operators may call `clear()` during maintenance. Shared caching reduces disclosure to upstream but process memory still contains results, so access must remain restricted. There is no stale serving: expired entries are deleted, and fallback is labeled rather than presented as stale live data.
