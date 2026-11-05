# Kubernetes

These Kustomize files deploy Grocy Next on a Kubernetes cluster, such as k3s.
They are examples for any self-hosting user. Your namespace, your host, and
your Secret stay in an overlay outside this repo.

## Layout

| Path                          | What it holds                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `base/`                       | The Deployment with the three probes, the Service, and the ConfigMap. Do not apply the base alone.             |
| `overlays/sqlite/`            | Grocy Next on SQLite. One replica, the `Recreate` strategy, and one `ReadWriteOnce` claim for the SQLite file. |
| `overlays/postgres/`          | Grocy Next on a PostgreSQL that the overlay runs for you. A one-instance StatefulSet, a Service, and a Secret. |
| `overlays/postgres-external/` | Grocy Next on your own PostgreSQL server. No database. The app reads one Secret with the connection values.    |
| `components/ingress/`         | An optional Ingress with a placeholder host. Add the component to your overlay to expose the app.              |

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

## The database Secret

The two PostgreSQL overlays give the pod a second Secret with the name
`grocy-next-database`. The pod reads the connection values from it. The keys
are the variable names.

| Key           | Value                                                     |
| ------------- | --------------------------------------------------------- |
| `DB_HOST`     | The host of the PostgreSQL server, as the pod reaches it. |
| `DB_PORT`     | Optional. The port of the server. The default is 5432.    |
| `DB_NAME`     | The database.                                             |
| `DB_USER`     | The user.                                                 |
| `DB_PASSWORD` | The password of the user.                                 |

The `postgres` overlay creates this Secret with a placeholder password. The
`postgres-external` overlay does not create it. You create it.

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

## Apply the `postgres` overlay

The `postgres` overlay runs a one-instance PostgreSQL for you. Use it when you
want PostgreSQL and have no database server. Create the Grocy Secret. Then
apply the overlay:

```sh
kubectl apply -k deploy/kubernetes/overlays/postgres
```

The overlay creates the database Secret with the placeholder password
`change-me`. The PostgreSQL pod creates the database with the values of the
Secret at its first start. The app pod retries the connection while
PostgreSQL starts. When the connection does not answer within 60 seconds, the
startup probe restarts the app pod one time. This can happen on the first
apply. Check both:

```sh
kubectl rollout status statefulset/grocy-next-postgres
kubectl rollout status deployment/grocy-next
```

Set your own password before the first apply. Add a `secretGenerator` entry
with the same name and `behavior: merge` in an overlay outside this repo. The
example below shows it. A change to the database, the user, or the password
after the first start does not change the database. To start again, delete
the StatefulSet and its claim, then apply again:

```sh
kubectl delete statefulset/grocy-next-postgres
kubectl delete persistentvolumeclaim/data-grocy-next-postgres-0
```

The claim requests 2 GiB from the default storage class. To change the size,
patch the claim template in your overlay before the first apply.

## Apply the `postgres-external` overlay

The `postgres-external` overlay ships no database. Use it when you have a
PostgreSQL server. Create the database and the user on your server. Create the
Grocy Secret and the database Secret:

```sh
kubectl create secret generic grocy-next-database \
  --from-literal=DB_HOST=postgres.example.com \
  --from-literal=DB_NAME=grocy-next \
  --from-literal=DB_USER=grocy-next \
  --from-literal=DB_PASSWORD=your-password
```

Then apply the overlay:

```sh
kubectl apply -k deploy/kubernetes/overlays/postgres-external
```

The pod exits at start when one of the four values is missing. The readiness
probe passes when the database connection answers.

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

For the `postgres` overlay, point `resources` at `overlays/postgres` and set
your password with a `secretGenerator` entry with the same name and
`behavior: merge`:

```yaml
secretGenerator:
  - name: grocy-next-database
    behavior: merge
    literals:
      - DB_PASSWORD=a-long-random-password
```

For the `postgres-external` overlay, point `resources` at
`overlays/postgres-external` and create the database Secret in your
namespace.

## The Ingress

The Ingress component routes every path of one host to the Service. The host
in the repo is the placeholder `grocy-next.example.com`. The patch above sets
your host. The Ingress names no class and has no TLS. When you need them, add
`ingressClassName` and a `tls` section in your overlay.
