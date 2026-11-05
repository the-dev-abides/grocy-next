# Kubernetes

These Kustomize files deploy Grocy Next on a Kubernetes cluster, such as k3s.
They are examples for any self-hosting user. Your namespace, your host, and
your Secret stay in an overlay outside this repo.

## Layout

| Path                  | What it holds                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `base/`               | The Deployment with the three probes, the Service, and the ConfigMap. Do not apply the base alone.             |
| `overlays/sqlite/`    | Grocy Next on SQLite. One replica, the `Recreate` strategy, and one `ReadWriteOnce` claim for the SQLite file. |
| `components/ingress/` | An optional Ingress with a placeholder host. Add the component to your overlay to expose the app.              |

## The Secret

The pod reads the Grocy URL and the Grocy API key from one Secret with the
name `grocy-next-grocy-access`. You create it. The keys are the two variable names.

```sh
kubectl create secret generic grocy-next-grocy-access \
  --from-literal=GROCY_URL=https://grocy.example.com \
  --from-literal=GROCY_API_KEY=your-key
```

`GROCY_URL` is the address of your Grocy instance, as the pod reaches it.
`GROCY_API_KEY` is a key from the Grocy "Manage API keys" page. The pod exits
at start when one of the two is missing.

## Apply the `sqlite` overlay

Create the Secret. Then apply the overlay from a clone of this repo:

```sh
kubectl apply -k deploy/kubernetes/overlays/sqlite
```

The files set no namespace. The command above applies to the current
namespace. Add `-n <namespace>` to apply to another namespace. The Secret must
be in the same namespace.

The pod is ready when the three probes pass:

```sh
kubectl rollout status deployment/grocy-next
```

The app listens on port 3000 in the pod. The Service `grocy-next` routes port
80 to it inside the cluster. To open the app with no Ingress, forward the
port:

```sh
kubectl port-forward service/grocy-next 3000:80
```

## An overlay outside this repo

An overlay in your own folder references the repo overlay by URL. It sets your
namespace and adds the Ingress component with your host. Kustomize fetches the
repo at the `ref` that you name.

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: grocy-next

resources:
  - https://github.com/the-dev-abides/grocy-next//deploy/kubernetes/overlays/sqlite?ref=main

components:
  - https://github.com/the-dev-abides/grocy-next//deploy/kubernetes/components/ingress?ref=main

patches:
  - target:
      kind: Ingress
      name: grocy-next
    patch: |
      - op: replace
        path: /spec/rules/0/host
        value: grocy-next.your-domain.example
```

Create the namespace and the Secret in it. Then apply your overlay:

```sh
kubectl create namespace grocy-next
kubectl -n grocy-next create secret generic grocy-next-grocy-access \
  --from-literal=GROCY_URL=https://grocy.example.com \
  --from-literal=GROCY_API_KEY=your-key
kubectl apply -k .
```

To change a ConfigMap value, add a `configMapGenerator` entry with the same
name and `behavior: merge`:

```yaml
configMapGenerator:
  - name: grocy-next
    behavior: merge
    literals:
      - DB_FILE=/data/household.db
```

## The Ingress

The Ingress component routes every path of one host to the Service. The host
in the repo is the placeholder `grocy-next.example.com`. The patch above sets
your host. The Ingress names no class and has no TLS. When you need them, add
`ingressClassName` and a `tls` section in your overlay.
