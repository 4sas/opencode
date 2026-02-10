# -----------------------------------------------------------------------------
# Git
# -----------------------------------------------------------------------------

# Make のリダイレクト先（Windows cmd: NUL / Unix系: /dev/null）
# bash 等で NUL にリダイレクトするとファイルが作られるため、/dev/null が存在すれば優先する
NULLDEV ?= $(if $(wildcard /dev/null),/dev/null,NUL)
.PHONY: git-staged-diff gsd
# git diff --staged の差分を temp に保存
git-staged-diff gsd:
	mkdir -p temp
	git diff --staged > temp/git_diff.diff


.PHONY: git-upstream-add gua
# upstream リモートを追加
git-upstream-add gua:
	@if [ -z "$(URL)" ]; then \
	  echo "Usage: make gru URL=<upstream-url>"; \
	  echo "Example: make gru URL=https://github.com/org/repo.git"; \
	  exit 1; \
	fi; \
	git remote add upstream "$(URL)"


.PHONY: git-upstream-sync gus
# upstream リモートと同期
git-upstream-sync gus:
	git fetch upstream --prune --prune-tags --tags
	git push origin --prune --tags
	for b in $$(git for-each-ref --format='%(refname:short)' refs/remotes/upstream/* \
	  | sed -n 's|^upstream/||p' \
	  | grep -vE '^(HEAD|main)$$' \
	  | grep -v '^$$'); do \
	  git push origin "refs/remotes/upstream/$$b:refs/heads/$$b"; \
	done


# ブランチ間の差分を表示
.PHONY: git-branch-diff gbd
# 使い方:
#   make gbd BASE=feature/dify_ollama TARGET=feature/ingress-nginx
git-branch-diff gbd:
	@if [ -z "$(BASE)" ] || [ -z "$(TARGET)" ]; then \
	  echo "Usage: make gbd BASE=<base-branch> TARGET=<target-branch>"; \
	  echo "Example: make gbd BASE=main TARGET=feature/my-branch"; \
	  exit 1; \
	fi; \
	mkdir -p temp; \
	git diff "$(BASE)"..."$(TARGET)" > "temp/git_diff.diff"; \
	echo "created: temp/git_diff.diff"


.PHONY: git-log.% gl.%
# git log を temp に保存
git-log.% gl.%:
	mkdir -p temp
	git log -n $* > temp/git_log.log


.PHONY: git-log-midnight glm
# git log --since=midnight -p を temp に保存
git-log-midnight glm:
	mkdir -p temp
	git log --since=midnight -p > temp/git_log.log


.PHONY: git-log-since.% gls.%
# 特定の日を指定したい場合: make gls.2025-12-06
git-log-since.% gls.%:
	mkdir -p temp
	git log --since="$* 00:00" --until="$* 23:59:59" -p > temp/git_log.log


.PHONY: conventional-commits cc
# Conventional Commits で使用する git diff --staged, git log を作成
conventional-commits cc:
	$(MAKE) git-staged-diff
	$(MAKE) git-log.10


.PHONY: semver
# Git のタグと Conventional Commits から現在のバージョンをセマンティックバージョニングで計算して出力
semver:
	@last_tag=$$(git describe --tags --abbrev=0 2>$(NULLDEV) || echo "0.0.0"); \
	if git describe --tags --abbrev=0 >$(NULLDEV) 2>&1; then \
	  log_range="$$last_tag..HEAD"; \
	else \
	  log_range=""; \
	fi; \
	base_tag="$$last_tag"; \
	# 先頭の v は取り除く (v1.2.3 → 1.2.3) \
	if echo "$$base_tag" | grep -q '^v'; then \
	  base_tag=$${base_tag#v}; \
	fi; \
	major=$$(echo "$$base_tag" | cut -d. -f1); \
	minor=$$(echo "$$base_tag" | cut -d. -f2); \
	patch=$$(echo "$$base_tag" | cut -d. -f3); \
	[ -z "$$major" ] && major=0; \
	[ -z "$$minor" ] && minor=0; \
	[ -z "$$patch" ] && patch=0; \
	breaking=0; feat=0; fix=0; \
	# 直近タグ以降のコミットを Conventional Commits で走査 \
	if [ -n "$$log_range" ]; then \
	  commits=$$(git log "$$log_range" --format='%s'); \
	else \
	  commits=$$(git log --format='%s'); \
	fi; \
	if [ -n "$$commits" ]; then \
	  IFS=$$'\n'; \
	  set -f; \
	  for subject in $$commits; do \
	    [ -z "$$subject" ] && continue; \
	    # type! または type(scope)!: は breaking と判定 \
	    if echo "$$subject" | grep -Eq '^[a-zA-Z]+(\([^)]+\))?!:'; then \
	      breaking=1; \
	    fi; \
	    # feat: / feat(scope): があれば minor \
	    if echo "$$subject" | grep -Eq '^feat(\(|:)'; then \
	      feat=1; \
	    fi; \
	    # fix: / fix(scope): があれば patch \
	    if echo "$$subject" | grep -Eq '^fix(\(|:)'; then \
	      fix=1; \
	    fi; \
	  done; \
	  set +f; \
	fi; \
	# Conventional Commits 準拠でバージョンを決定 \
	if [ "$$breaking" -eq 1 ]; then \
	  major=$$((major+1)); minor=0; patch=0; \
	elif [ "$$feat" -eq 1 ]; then \
	  minor=$$((minor+1)); patch=0; \
	elif [ "$$fix" -eq 1 ]; then \
	  patch=$$((patch+1)); \
	fi; \
	echo "$$major.$$minor.$$patch"
