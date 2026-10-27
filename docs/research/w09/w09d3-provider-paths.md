# W9 D3 provider-path evidence — federated trust boundaries

**Accessed 2026-10-14; rechecked 2026-10-27.** First-party sources only. Scope: the static AWS/GCP trust-boundary exercise. No identity provider, role, pool, account, project, or credential is created.

## GCP-primary path: AWS workload to Google Cloud

Source: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds

- Google documents configuring Workload Identity Federation for AWS workloads. The external workload obtains AWS security credentials, exchanges external identity through a workload identity pool/provider, and receives Google access under configured attribute mapping and IAM policy.
- The design review must bind AWS account/role attributes, audience, mapped subject, allowed Google resource, token lifetime, audit identity, and denial behavior. It must not use a downloaded service-account key.

Source: https://cloud.google.com/iam/docs/best-practices-for-using-workload-identity-federation

- Google recommends restricting attribute conditions and following least privilege. The lesson derives a negative test for wrong account, role, audience, or resource from that boundary.

## AWS-primary path: Google workload to AWS

Source: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html

- IAM OIDC identity providers establish trust between an OIDC-compatible provider and an AWS account. AWS documents the required issuer (`iss`), audience (`aud`), signing keys, and `AssumeRoleWithWebIdentity` path.
- The review must pin issuer, audience/client ID, subject and trust-policy conditions, target role permissions, token lifetime, CloudTrail evidence, and denial behavior. A valid token is authentication evidence, not permission to every role or resource.

Source: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_oidc.html

- AWS describes web-identity federation as temporary security credentials. The lesson uses this only as a design alternative; it does not call STS.

## Shared decision rule

The team records one Week 6 primary-cloud ADR. Personal AWS/GCP/Both reading selection does not change it. Cross-cloud identity is accepted only when the exact issuer, audience, subject/account constraints, target role/resource, short-lived credential path, audit trail, denial tests, owner, and fallback are reviewable. Otherwise the safe state is a documented single-cloud fallback, not static keys.
