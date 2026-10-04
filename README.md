# AKS application platform

[![Source validation](https://github.com/Pmen225/aks-platform-engineering/actions/workflows/build-deploy.yml/badge.svg?branch=main)](https://github.com/Pmen225/aks-platform-engineering/actions/workflows/build-deploy.yml)

An Azure Kubernetes Service project combining Terraform infrastructure, a containerised Node.js application, Kubernetes resources and a manual application deployment workflow. The source defines managed image access, Entra ID authentication, health probes and CPU based pod autoscaling.

## Architecture

```text
GitHub Actions, manual deployment using OIDC
  -> ACR image build with commit SHA tag
  -> Entra authenticated AKS access
       -> Deployment -> public HTTP LoadBalancer Service
       -> readiness and liveness probes
       -> HorizontalPodAutoscaler

AKS kubelet identity -> AcrPull role on ACR
Container Insights configuration -> Log Analytics workspace
```

Terraform defines an AKS cluster, Basic ACR registry and Log Analytics workspace in UK South. The cluster uses the Free control plane tier and a shared system pool of two Standard_D4s_v5 nodes. The kubelet managed identity has AcrPull permission on the registry.

The Express application runs on Node.js 22 and exposes `/`, `/healthz` and `/readyz`. The Deployment starts with two replicas. Its HPA targets 60% average CPU utilisation and specifies a range of two to five replicas.

## Security controls

- Entra ID authentication and Azure RBAC, with local AKS accounts disabled
- ACR admin credentials disabled
- Container execution as UID 1000, with privilege escalation disabled, all Linux capabilities dropped and a read only root filesystem
- RuntimeDefault seccomp profile and no automatic service account token mount
- CPU and memory requests and limits, plus separate readiness and liveness probes
- Committed provider and application dependency lock files

AKS workload identity, an OIDC issuer and the Key Vault CSI integration are enabled. The sample contains no Key Vault, federated application identity, SecretProviderClass or secret mount, and the application does not call Azure APIs.

## Delivery workflow

Pushes and pull requests run source validation. Deployment is conditional on an explicit manual workflow request with `deploy` enabled and a successful validation job. It builds the application in ACR with a commit SHA image tag, authenticates to AKS through Entra ID, applies the Kubernetes resources and waits for the rollout.

The workflow depends on existing Azure resources, OIDC federation, appropriate ACR and AKS roles, and configuration in the GitHub `portfolio` environment. Environment approval rules are an external repository setting. Terraform provisioning and the federation configuration are outside the deployment job.

## Validation

The validation job checks Terraform formatting and schema, application dependencies and HTTP routes, a Docker image build, and strict Kubernetes resource schemas. The badge reports the latest workflow status on `main`.

The health endpoints check the HTTP process only and do not test Azure services or other dependencies.

## Design and operations

The Service exposes public HTTP without TLS or application authentication. The cluster shares system and application workloads on one node pool, with no node autoscaling configured. The HPA changes pod replicas; additional replicas can remain pending if the fixed node pool lacks capacity.

The Deployment source contains a local image reference that the deployment workflow replaces with the ACR image. Container Insights uses the configured Log Analytics workspace. Terraform uses local state and has no shared remote backend configured.

Two worker VMs and their disks, ACR, public load balancer resources, log ingestion and egress can incur charges despite the Free control plane tier. State and saved plans can contain sensitive values and are excluded from version control. Resource removal and any separately managed federation or access grants have distinct lifecycles.

## Source layout

- [`infra/`](infra/): AKS, ACR, managed identity permissions and monitoring resources
- [`app/`](app/): application, Dockerfile, dependency lock and HTTP tests
- [`k8s/`](k8s/): Deployment, Service and HPA
- [Build and deployment workflow](.github/workflows/build-deploy.yml): validation and optional application deployment
