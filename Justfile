set shell := ["bash", "-uc"]

# エラーで停止するように設定

VM_NAME := "agent-sandbox"
WORKTREE_DIR := ".sandbox-worktree"
WORKTREE_ABSPATH := justfile_directory() / WORKTREE_DIR
LIMA_CONF := "lima-sandbox.yaml"
LIMA_CONF_RESOLVED := ".lima-sandbox-resolved.yaml"

# デフォルトタスク：ヘルプを表示
default:
    @just --list

# 隔離環境を構築して起動
up:
    @echo "🚀 Preparing sandbox worktree..."
    @if [ ! -d {{ WORKTREE_DIR }} ]; then \
        git worktree add {{ WORKTREE_DIR }} HEAD; \
    fi
    @echo "🏗 Starting Lima VM..."
    @sed 's|__WORKTREE_ABSPATH__|{{ WORKTREE_ABSPATH }}|' {{ LIMA_CONF }} > {{ LIMA_CONF_RESOLVED }}
    limactl start --name={{ VM_NAME }} {{ LIMA_CONF_RESOLVED }}
    @rm -f {{ LIMA_CONF_RESOLVED }}
    @echo "✅ Sandbox is ready!"

# VM内のシェルに入る（エージェントの実行環境）
shell:
    limactl shell {{ VM_NAME }}

# VM内で特定のコマンドを実行する
run command:
    limactl shell {{ VM_NAME }} {{ command }}

# VMを停止
stop:
    limactl stop {{ VM_NAME }}

# 環境を完全に破壊して初期化（VM削除 & Worktree削除）
destroy:
    @echo "🔥 Destroying sandbox..."
    -limactl delete -f {{ VM_NAME }}
    -git worktree remove --force {{ WORKTREE_DIR }}
    -rm -rf {{ WORKTREE_DIR }}
    @echo "✨ Cleaned up."

# ログを表示
logs:
    limactl list {{ VM_NAME }}
