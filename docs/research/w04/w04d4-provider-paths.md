# W4·D4 — provider-path evidence (AWS / GCP)

Scope: the claims made in the shared lead-in, the AWS and GCP provider blocks, and
the two provider decision checks in the "FDE lens" step of `weeks/w04/w04d4.html`.
The Cypher, modeling, vector-index, and GraphRAG evidence stays in `w04d4.md`; nothing
here changes those claims. No quiz questions, no code popup changes, no Terraform or
other IaC (W4 contract). All sources first-party; **accessed 2026-10-14** with `curl`
(HTML → text). Neo4j pages are used for Neo4j product facts only.

## Shared — Aura vs self-managed on the cloud marketplaces

Source: https://neo4j.com/docs/operations-manual/current/cloud-deployments/

- "Neo4j's cloud marketplace listings offer a quick and easy way to get started with graph databases on the cloud platform of your choice. You can choose between Neo4j Aura (pay-as-you-go or annual), a fully managed service, or Neo4j Enterprise or Neo4j Community, which you can deploy and manage yourself on your preferred cloud platform."
- Table rows: "Neo4j Enterprise edition on AWS", "Neo4j Community edition on AWS", "Neo4j Aura on AWS", "Neo4j's AWS Marketplace listings"; "Neo4j Enterprise and Community editions on Google Cloud Platform", "Neo4j Aura on Google Cloud", "Neo4j's Google Cloud Marketplace listings".
- Glossary: a server is "A physical machine, a virtual machine, or a container running an instance of Neo4j."
- Note: the former per-cloud pages (`…/cloud-deployments/neo4j-aws/`, `…/neo4j-gcp/`) now redirect to this page. The self-managed AWS/GCP deployment links point to Neo4j's CloudFormation and Terraform repositories on GitHub; the lesson does not teach or link them (no IaC this week).

Source: https://neo4j.com/docs/aura/cloud-providers/

- "You can subscribe to Neo4j Aura from cloud provider marketplaces. Your subscription gets billed together with other services that you're already using, and can contribute towards your spend commitment with cloud providers."
- "The following marketplaces are available: Amazon Web Services (AWS) … Google Cloud Platform (GCP)".
- AWS: "You can subscribe to Neo4j Aura via the AWS marketplace."
- Google Cloud: "You can subscribe to Neo4j Aura via the Google Cloud marketplace." and "Purchasing from the Google Cloud Marketplace requires the Billing Account Administrator (roles/billing.admin) role".
- The page's tier statements for the marketplace listings are inconsistent (AWS section says "Currently this marketplace subscription only provides access to AuraDB Professional" under an "AuraDB Business Critical / AuraDB Professional" header), so the lesson makes **no** claim about which Aura tiers each marketplace sells, and does **not** tie private endpoints to a marketplace subscription.

## Shared — private connectivity to Aura

Source: https://neo4j.com/docs/aura/security/secure-connections/

- Applies to "AuraDB Virtual Dedicated Cloud" and "AuraDS Enterprise": they "run in a dedicated AWS cloud account, Azure subscription, or GCP project to achieve complete isolation".
- "An Aura instance can be publicly available, completely private, or allow both public and private access. If public traffic is enabled, your Aura instances are public and traffic to them is allowed to traverse the public internet and they are accessible with the correct username and password."
- "To make your instance completely private, you need to disable public traffic, use the cloud provider's network, and create a private endpoint inside your VPC".
- "Private endpoints are network interfaces inside your own VPC, which can only be accessed within your private network."
- AWS: "Refer to AWS PrivateLink documentation for IAM requirements." Figure: "VPC connectivity with AWS PrivateLink".
- GCP: "Refer to GCP Private Service Connect documentation for required permissions." Figure: "VPC connectivity with GCP Private Service Connect".
- Lesson claims derived: Aura's Virtual Dedicated Cloud tier supports private endpoints over AWS PrivateLink / GCP Private Service Connect; public traffic can then be disabled; with public traffic on, traffic may traverse the public internet (check distractor).

## AWS — self-managed Neo4j on EC2, and Amazon Neptune

Source: https://docs.aws.amazon.com/neptune/latest/userguide/migration-compatibility.html

- "Neo4j's has an all-in-one architectural approach, where data loading, data ETL, application queries, data storage, and management operations all occur in the same set of compute resources, such as EC2 instances."
- "There are a variety of features and tooling in Neo4j … that are not part of the openCypher specification, are incompatible with openCypher, or are incompatible with Neptune's implementation of openCypher."
- "APOC procedures – Because APOC procedures are not included in the openCypher specification, …" (can be rewritten in openCypher or Gremlin).

Source: https://docs.aws.amazon.com/neptune/latest/userguide/access-graph-opencypher.html

- "Neptune supports building graph applications using openCypher".
- "The current Neo4j implementation of the Cypher query language has diverged in some ways from the openCypher specification. If you are migrating current Neo4j Cypher code to Neptune, see Neptune compatibility with Neo4j and Rewriting Cypher queries to run in openCypher on Neptune".

Source: https://docs.aws.amazon.com/neptune/latest/userguide/intro.html

- "Amazon Neptune is a fast, reliable, fully managed graph database service … Neptune supports the popular property-graph query languages Apache TinkerPop Gremlin and Neo4j's openCypher, and the W3C's RDF query language, SPARQL."
- "Neptune is fully managed, so you no longer need to worry about database management tasks like hardware provisioning, software patching, setup, configuration, or backups." (Used for the contrast: on self-managed Neo4j those tasks are yours.)

## AWS — Aura on AWS Marketplace, and PrivateLink

Source: https://aws.amazon.com/marketplace/pp/prodview-xd42uzj2v7dae (linked from the Neo4j Aura marketplace docs)

- Listing: "Neo4j Aura (pay-as-you-go) | Graph Database", category "Software as a Service (SaaS)", "Sold by: Neo4j", "Deployed on AWS".
- "Neo4j AuraDB is a fully managed, secure, and highly available cloud graph database".

Source: https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html

- "AWS PrivateLink is a highly available, scalable technology that you can use to privately connect your VPC to services and resources as if they were in your VPC. You do not need to use an internet gateway, NAT device, public IP address … to allow communication with the service or resource from your private subnets."

## GCP — Aura on Google Cloud Marketplace, Private Service Connect, Spanner Graph

Source: https://docs.cloud.google.com/vpc/docs/private-service-connect (page "Last updated 2026-10-09 UTC")

- "Private Service Connect is a capability of Google Cloud networking that allows consumers to access managed services privately from inside their VPC network."
- "With Private Service Connect, consumers can use their own internal IP addresses to access services without leaving their VPC networks."

Source: https://docs.cloud.google.com/spanner/docs/graph/overview (page "Last updated 2026-10-09 UTC")

- "Spanner Graph supports an ISO Graph Query Language (GQL)-compatible graph query interface and enables interoperability between relational and graph models."
- "Spanner Graph lets you map tables to property graphs using declarative schema without data migration".
- "Built-in search capabilities: Rich vector and full-text search capabilities are integrated with graph".
- Navigation includes "Spanner Graph reference for openCypher users" (supports "translating, not pasting"; the lesson does not claim Spanner Graph runs Neo4j Cypher).
- Edition note ("available with the Spanner Enterprise edition and Enterprise Plus edition") not used on the page.

## Not claimed / could not verify

- **Self-managed Neo4j on Compute Engine** is not documented by name on a current first-party page (Neo4j's GCP page redirects to the generic cloud-deployments page, and its GCP self-managed link is a Terraform repository). The GCP block therefore says "deployed and run in your own project" without naming Compute Engine.
- No prices, quotas, regional availability, Aura tier-to-marketplace mapping, or marketplace credit claims (Neo4j's partner page and Aura docs disagree on credits).
- No Neptune vector-search or Neptune Analytics claims; no claim that Neptune or Spanner Graph runs this page's Cypher 25 `SEARCH` syntax.
