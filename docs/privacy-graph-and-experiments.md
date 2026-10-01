# Privacy graph and experiments

## Privacy graph

The graph is a read-only intelligence view over existing Consent Guru records. It does not duplicate website, policy, purpose, vendor, tracker, consent, processing activity, transfer, or finding records. It joins those records with runtime discovery and crawler observations.

The graph API is `GET /api/privacy-graph?websiteId=...` and `POST /api/privacy-graph` for supported simulations. Both require a dashboard membership and load the website only within that organization. The dashboard view is **Intelligence → Privacy Graph** (`/dashboard/graph`). It supports site selection, entity/provenance filters, relationship inspection, evidence IDs, and a read-only purpose-disable simulation.

Provenance remains explicit: browser observations and consent decisions are `observed`; administrative relationships and transfer authorizations are `configured`; findings are `inferred`; enforcement rules and transfer envelopes are `enforced`. Unknown event provenance is shown as `unknown`. The graph omits visitor identifiers, consent token hashes, recipient public-key bytes, private keys, and envelope ciphertext. Consent labels use a short non-sensitive identifier prefix.

The purpose simulation traces purpose links through decisions, policies, trackers, processing activities, transfer authorizations, transfers, and envelopes. It returns impact only and never changes policy, consent, authorization, or enforcement state.

## Experiments

Experiments extend the existing consent A/B testing surface. Dashboard users manage variants, allocation and lifecycle at **Intelligence → Experiments** (`/dashboard/experiments`). The experiment APIs are `GET/POST /api/experiments` and `GET/PATCH /api/experiments/:experimentId`; the SDK event endpoint is `POST /api/sdk/:siteKey/experiment-events`.

Assignment is stable for a visitor/session within an experiment. Events retain experiment, variant, event type, timestamp, and consent session where available; visitor identifiers are hashed and are not included in graph nodes. Experiment variants may change presentation but cannot change purposes, consent semantics, legal requirements, policy identity, or enforcement requirements. Existing policy A/B APIs remain available.

Experiment analytics report counts and rates from recorded events. They are descriptive and should not be interpreted as statistically significant conclusions without a separately designed statistical analysis.

## Storage and deployment

Runtime observations use `runtime_discovery_observations`; graph relationships are composed from existing records and are not persisted as a second copy. Experiments use `experiments` and `experiment_events` (migration `0061_experiments.sql`). Privacy events and consent sessions use migration `0060_consent_sessions_events.sql`. Apply migrations through the normal deployment process; do not treat a successful static migration check as proof that a target database has been migrated.
