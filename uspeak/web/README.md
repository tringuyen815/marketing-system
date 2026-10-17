# USPEAK Marketing Command Center — Preview

Browser-local workspace with campaigns, editable drafts, revision-specific approvals, a Vietnam-time content calendar, JSON backups and a public YouTube RSS collector. No AI provider, NAS access, app authentication, cloud database or social publisher is connected. The app labels these limits explicitly. Review unfinished outlines before approval; editing invalidates approval and scheduling. Preview access is controlled by hosting.

Deploy this directory as a standalone Vercel project root (framework Other, no build command). Do not deploy the whole repository root over the existing production site. The existing root index.html is preserved.

Tests: node --test model.test.mjs research.test.mjs. Browser UI verification remains pending.
