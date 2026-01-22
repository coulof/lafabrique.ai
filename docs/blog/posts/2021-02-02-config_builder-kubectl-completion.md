---
date: 2021-02-02
authors:
  - coulof
categories:
  - Kubernetes
---

# Blazing fast kubectl completion

You can use cache_builder from [kubectl-fzf](https://github.com/bonnefoa/kubectl-fzf) :material-github: to speed-up completion and use a systemd unit to start it on login.

<!-- more -->

## The premise

At the time of the writing, my `.kube/config` has a dozen of clusters configured; some of them are on slow networks.

Striking the tab key with `kubectl` can lead to very slow [completion](https://kubernetes.io/docs/tasks/tools/install-kubectl/#enabling-shell-autocompletion) :material-kubernetes: and freeze the terminal till the completion functions finish.

## The solution

A simple web search on *kubectl cache* led me to [kubectl-fzf](https://github.com/bonnefoa/kubectl-fzf) :material-github:, which uses [`fzf`](https://github.com/junegunn/fzf) :material-github: to search from a cache.

`kubectl-fzf` can be installed locally or on the target cluster. Since I'm dealing with plenty of ephemeral clusters I opted for the local approach.

### 1. Load kubectl-fzf as an oh-my-zsh plugin

Copy [`kubectl_fzf.plugin.zsh`](https://github.com/bonnefoa/kubectl-fzf/blob/master/kubectl_fzf.plugin.zsh) :material-github: under `~/.oh-my-zsh/plugins/kubectl_fzf`.

Replace the first line to put the cache in the home directory:

```shell
sed -i '1 s@export KUBECTL_FZF_CACHE@export KUBECTL_FZF_CACHE=$HOME/tmp/kubectl_fzf_cache@' \
  ~/.oh-my-zsh/plugins/kubectl_fzf
```

### 2. Add a systemd service for the local user

Add the following config to `$HOME/.local/share/systemd/user/cache-builder.service`:

```ini
[Unit]
Description=kubectl-fzf cache builder
After=network.target

[Service]
Type=simple
ExecStart=%h/go/bin/cache_builder -dir %h/tmp/kubectl_fzf_cache
Restart=always

[Install]
WantedBy=default.target
```

Enable the service:

```bash
systemctl --user enable cache-builder.service
systemctl --user restart cache-builder.service
systemctl --user status cache-builder.service
```

`systemctl --user restart cache-builder` is useful to force rebuilding the cache when you switch `kubeconfig`.

## Conclusion

The `cache_builder` from `kubectl-fzf`, `fzf` itself & systemd are magic!

There is still plenty to tune like:

* [blocklist in the cache](https://github.com/bonnefoa/kubectl-fzf#configuration) :material-github:
* [change fzf display](https://github.com/bonnefoa/kubectl-fzf#options) :material-github:
* or run `cache_builder` as a container
