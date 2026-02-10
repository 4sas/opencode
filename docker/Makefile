# -----------------------------------------------------------------------------
# Docker
# -----------------------------------------------------------------------------
DOCKER_DIR := docker
BUILD_TAG ?= latest

# Make のリダイレクト先（Windows cmd: NUL / Unix系: /dev/null）
# bash 等で NUL にリダイレクトするとファイルが作られるため、/dev/null が存在すれば優先する
NULLDEV := $(if $(wildcard /dev/null),/dev/null,NUL)

# OS 判定（WSL/Mac/Linux/Windows を想定）
UNAME_S := $(shell uname -s 2>$(NULLDEV))
ifeq ($(UNAME_S),)
HOST_OS := Windows
else
HOST_OS := $(UNAME_S)
endif
IS_WINDOWS := $(filter Windows MINGW% MSYS% CYGWIN%,$(HOST_OS))

# macOS（Darwin）のときだけ amd64 を強制（Apple Silicon 対策）
ifeq ($(HOST_OS),Darwin)
DOCKER_COMPOSE_ENV := DOCKER_DEFAULT_PLATFORM=linux/amd64
else
DOCKER_COMPOSE_ENV :=
endif

define parse_project_dir
$(if $(word 2,$(1)),$(word 1,$(1)),)
endef

define parse_service_name
$(if $(word 2,$(1)),$(word 2,$(1)),$(word 1,$(1)))
endef

# コンテナ起動
.PHONY: dc-up
dc-up:
	cd $(DOCKER_DIR)/$(PROJECT_DIR) && $(DOCKER_COMPOSE_ENV) docker compose up -d $(SERVICE_NAME)

.PHONY: dc-up.%
dc-up.%:
	$(MAKE) dc-up \
		PROJECT_DIR=$(call parse_project_dir,$(subst ., ,$*)) \
		SERVICE_NAME=$(call parse_service_name,$(subst ., ,$*))

# コンテナ起動（ビルド込み）
.PHONY: dc-up-b
dc-up-b:
	cd $(DOCKER_DIR)/$(PROJECT_DIR) && $(DOCKER_COMPOSE_ENV) docker compose up -d --build $(SERVICE_NAME)

.PHONY: dc-up-b.%
dc-up-b.%:
	$(MAKE) dc-up-b \
		PROJECT_DIR=$(call parse_project_dir,$(subst ., ,$*)) \
		SERVICE_NAME=$(call parse_service_name,$(subst ., ,$*))

# 停止（コンテナは残す）
.PHONY: dc-stop
dc-stop:
	cd $(DOCKER_DIR)/${PROJECT_DIR} && docker compose stop

.PHONY: dc-stop.%
dc-stop.%:
	$(MAKE) dc-stop PROJECT_DIR=$*

# 停止＋削除（ボリュームは残す）
.PHONY: dc-down
dc-down:
	cd $(DOCKER_DIR)/${PROJECT_DIR} && docker compose down --rmi local

.PHONY: dc-down.%
dc-down.%:
	$(MAKE) dc-down PROJECT_DIR=$*

# 停止＋削除（ボリューム削除）
.PHONY: dc-down-v
dc-down-v:
	cd $(DOCKER_DIR)/${PROJECT_DIR} && docker compose down --rmi local --volumes

.PHONY: dc-down-v.%
dc-down-v.%:
	$(MAKE) dc-down-v PROJECT_DIR=$*

# 起動確認
.PHONY: dc-ps
dc-ps:
	cd $(DOCKER_DIR)/${PROJECT_DIR} && docker compose ps

.PHONY: dc-ps.%
dc-ps.%:
	$(MAKE) dc-ps PROJECT_DIR=$*

# ログ確認
.PHONY: dc-logs
dc-logs:
	cd $(DOCKER_DIR)/${PROJECT_DIR} && docker compose logs -f $(SERVICE_NAME)

.PHONY: dc-logs.%
dc-logs.%:
	$(MAKE) dc-logs \
		PROJECT_DIR=$(call parse_project_dir,$(subst ., ,$*)) \
		SERVICE_NAME=$(call parse_service_name,$(subst ., ,$*))

# Helm CHarts へ変換
.PHONY: dc2helm
dc2helm:
	kompose convert -c -f $(DOCKER_DIR)/${PROJECT_DIR}/docker-compose.yaml -o helm/${PROJECT_DIR}

.PHONY: dc2helm.%
dc2helm.%:
	$(MAKE) dc2helm PROJECT_DIR=$*

# コンテナビルド
.PHONY: dc-build
dc-build:
# 	docker build -t <Docker Image のタグ> -f <Dockerfile のパス> <ビルドコンテキスト>
	docker build -t chatgpt-api-system-laravel:$(BUILD_TAG) -f docker/app/laravel/Dockerfile .

.PHONY: dc-build.%
dc-build.%:
	$(MAKE) dc-build BUILD_TAG=$*

# -----------------------------------------------------------------------------
# ECR
# -----------------------------------------------------------------------------
# ECR へ push するために利用
AWS_REGION ?= ap-northeast-1
ECR_ENV ?= local # local | staging | production
ECR_REPOSITORY_BASE_NAME ?= chatgpt-api-system-laravel
IMAGE_LOCAL_NAME ?= chatgpt-api-system-laravel

.PHONY: ecr-push
ifneq ($(IS_WINDOWS),)
ecr-push:
	@powershell.exe -NoProfile -ExecutionPolicy Bypass -Command " \
		$$ErrorActionPreference = 'Stop'; \
		$$envName = '$(ECR_ENV)'; \
		if ('local', 'staging', 'production', '' -notcontains $$envName) { throw 'ECR_ENV must be one of: local | staging | production' }; \
		$$suffix = if ($$envName -eq 'local') { '-local' } elseif ($$envName -eq 'staging') { '-staging' } else { '' }; \
		$$accountId = (aws sts get-caller-identity --query Account --output text).Trim(); \
		$$registry = \"$$accountId\" + '.dkr.ecr.$(AWS_REGION).amazonaws.com'; \
		$$repo = \"$(ECR_REPOSITORY_BASE_NAME)\" + $$suffix; \
		$$tag = \"$(BUILD_TAG)\"; \
		$$imageUri = $$registry + '/' + $$repo + ':' + $$tag; \
		aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin $$registry; \
		docker tag \"$(IMAGE_LOCAL_NAME):$(BUILD_TAG)\" $$imageUri; \
		docker push $$imageUri; \
		Write-Host ('Pushed: ' + $$imageUri);"
else
ecr-push:
	@set -eu; \
		case "$(ECR_ENV)" in \
		local) suffix="-local" ;; \
		staging) suffix="-staging" ;; \
		production|"") suffix="" ;; \
		*) echo "ECR_ENV must be one of: local | staging | production" >&2; exit 2 ;; \
		esac; \
		account_id="$$(aws sts get-caller-identity --query Account --output text)"; \
		registry="$$account_id.dkr.ecr.$(AWS_REGION).amazonaws.com"; \
		repo="$(ECR_REPOSITORY_BASE_NAME)$${suffix}"; \
		image_uri="$$registry/$$repo:$(BUILD_TAG)"; \
		aws ecr get-login-password --region $(AWS_REGION) | docker login --username AWS --password-stdin "$$registry"; \
		docker tag "$(IMAGE_LOCAL_NAME):$(BUILD_TAG)" "$$image_uri"; \
		docker push "$$image_uri"; \
		echo "Pushed: $$image_uri"
endif

.PHONY: ecr-push.%
ecr-push.%:
	$(MAKE) ecr-push BUILD_TAG=$(basename $*) ECR_ENV=$(patsubst .%,%,$(suffix $*))

.PHONY: ecr-push-b.%
ecr-push-b.%:
	$(MAKE) dc-build BUILD_TAG=$(basename $*)
	$(MAKE) ecr-push BUILD_TAG=$(basename $*) ECR_ENV=$(patsubst .%,%,$(suffix $*))
