# PRD 07: Business Model & Licensing Strategy

---

## 1. Document Control

### 1.1 Metadata
| Attribute | Value |
| :--- | :--- |
| **Product / Domain** | Business Model, Licensing & Distribution Strategy |
| **Version** | 1.0.0 |
| **Status** | Approved |
| **Target Persona** | Open-Source Self-Hosters & Hosted SaaS Subscribers |
| **Target Packages** | Root Repository, `apps/web` |
| **Last Updated** | 2026-07-03 |

---

## 2. Executive Summary & Value Proposition

### 2.1 Problem Statement
Open-source developer tools often struggle with commercial sustainability. Pure open-source licenses (MIT/Apache 2.0) leave projects vulnerable to third-party commercial exploitation by cloud providers offering managed wrappers without contributing back. Conversely, closed-source SaaS models lose the trust, community contributions, and privacy guarantees required by self-hosting learners.

### 2.2 Product Vision & Justification
The project adopts a dual-track distribution model:
1. **Source-Available Open Core:** Distributed under the Elastic License 2.0 (ELv2) for community inspection, self-hosting, and non-commercial customization.
2. **Hosted Subscription SaaS:** Managed multi-tenant cloud service providing zero-setup operation, cross-device sync, and bundled API quota for non-technical users.

---

## 3. Product Goals & Scope

### 3.1 Strategic Goals
- **ELv2 License Compliance:** Enforce licensing terms that allow personal/internal self-hosting while strictly prohibiting commercial managed service resale.
- **Zero-Setup SaaS Tier:** Provide a friction-free cloud subscription experience with zero configuration required by the user.
- **Cost-Optimized Architecture:** Utilize prompt caching, Gemini 3.5 Flash, and lightweight GraphRAG schemas to maintain high margin viability on subscription tiers.

### 3.2 Non-Goals (Scope Boundaries)
- **Proprietary Core Split:** Creating a closed-source private codebase fork is out of scope; the SaaS tier runs the unified monorepo codebase with cloud adapter configurations.
- **Ad-Supported Free Tier:** Serving advertisements or selling user study analytics data is strictly non-goal.

---

## 4. User Workflows & Persona

### 4.1 Target Persona
- **Self-Hosting Developer:** Technical user who deploys the application locally or on personal VPS using their own API keys.
- **SaaS Subscriber:** Non-technical learner who subscribes to the hosted web application for immediate out-of-the-box access.

### 4.2 Step-by-Step User Journey
1. **Trigger:** Learner visits website landing page.
2. **Action:** User chooses between "Self-Host on GitHub" or "Start Cloud Subscription".
3. **System Response:** Self-hosters clone repository and configure `.env.local`; SaaS subscribers authenticate via OAuth and gain immediate access to hosted workspace.
4. **Completion:** Both user types access complete study feature set within their chosen deployment tier.

### 4.3 Edge Cases & Failure Modes
- **Commercial Re-Distribution Violation:** Attempting to host the software as a paid public service triggers automated license violation enforcement notices under ELv2.

---

## 5. Detailed Functional Requirements

| ID | Feature / Component | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **FR-1** | ELv2 Licensing Header | All repository packages must contain standard ELv2 header declarations restricting commercial managed service provisioning. | Must Have |
| **FR-2** | Local API Key Configuration | Self-hosted mode must accept user-provided API keys (e.g. `GEMINI_API_KEY`) stored exclusively in local environment variables or local database. | Must Have |
| **FR-3** | SaaS Quotas & Token Caps | Cloud subscription tier must enforce per-user monthly token and document ingestion caps based on active tier level. | Must Have |

---

## 6. Security, Data Privacy & AI Safety Guardrails

### 6.1 Data Privacy & Protection
- **Self-Hosted Isolation:** Self-hosted instances transmit data strictly between the user's browser, local server, and selected AI provider API.
- **SaaS Multi-Tenant Isolation:** Database row-level security (RLS) ensures complete data separation between subscriber accounts.

---

## 7. UX & Interface Specifications

### 7.1 UI Components & Placement
- Subscription status dashboard in Settings page displaying current monthly token usage, document count, and billing status.

---

## 8. Technical & Operational Constraints

- **Single Codebase Maintainability:** Infrastructure logic must use abstraction interfaces to prevent code divergence between self-hosted and SaaS builds.

---

## 9. Success Metrics & Telemetry

- **GitHub Growth:** Stars, forks, and community contributions on open repository.
- **SaaS Conversion:** Conversion rate from landing page visits to active monthly paid subscriptions.

---

## 10. Risks, Assumptions & Open Issues

| Risk / Open Issue | Impact (H/M/L) | Description | Proposed Mitigation / Status |
| :--- | :--- | :--- | :--- |
| **ELv2 Brand Perception** | Low | Some users confuse ELv2 with closed-source proprietary software. | Clear documentation explaining that self-hosting for personal/internal use is 100% free. |
