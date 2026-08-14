---
'@danieljoffe/shared-ui': patch
---

PageLayout: suppress the focus outline on the `main` landmark. The App Router focuses it after every client-side navigation, which drew a visible ring around the entire page for all users; a non-interactive skip-link/navigation focus target needs no visible ring.
