# Make のリダイレクト先（Windows cmd: NUL / Unix系: /dev/null）
# bash 等で NUL にリダイレクトするとファイルが作られるため、/dev/null が存在すれば優先する
NULLDEV := $(if $(wildcard /dev/null),/dev/null,NUL)

-include .github/Makefile
-include docker/Makefile
-include docs/requirements/Makefile
-include helm/Makefile
-include terraform/Makefile

# OS 判定（WSL/Mac/Linux/Windows を想定）
UNAME_S := $(shell uname -s 2>$(NULLDEV))
ifeq ($(UNAME_S),)
HOST_OS := Windows
else
HOST_OS := $(UNAME_S)
endif
IS_WINDOWS := $(filter Windows MINGW% MSYS% CYGWIN%,$(HOST_OS))

# CPU アーキテクチャの判定
ifdef IS_WINDOWS
UNAME_M := $(shell powershell -Command "[System.Environment]::Is64BitProcess" 2>$(NULLDEV) || echo "unknown")
ifeq ($(UNAME_M),True)
ARCH := x86_64
else
ARCH := x86
endif
else
UNAME_M := $(shell uname -m 2>$(NULLDEV))
ARCH := $(UNAME_M)
endif

.PHONY: setup
setup:
	chmod +x scripts/runbooks/setup.sh
	scripts/runbooks/setup.sh

# -----------------------------------------------------------------------------
# ffmpeg
# -----------------------------------------------------------------------------
# カレントディレクトリの.mp4をffmpegで圧縮
# 圧縮済（.1280.mp4）は対象外
.PHONY: video-compression vc
video-compression vc:
	@for f in *.mp4; do [ -f "$$f" ] || continue; case "$$f" in *.1280.mp4) echo "==> skip (already converted): $$f" ;; *) out="$${f%.mp4}.1280.mp4"; echo "==> converting: $$f -> $$out"; ffmpeg -i "$$f" -c:v libx264 -preset medium -crf 22 -c:a aac -ar 44100 -ac 1 -b:a 64k -vf scale=1280:-2 "$$out"; ;; esac; done

# カレントディレクトリの.mp4をffmpegで.mp3に変換
# 圧縮済（.1280.mp4）は対象外
.PHONY: video2audio v2a
video2audio v2a:
	@command -v ffmpeg >$(NULLDEV) 2>&1 || { echo "ffmpeg が見つかりません (PATH を確認してください)"; exit 1; }
	@for f in *.mp4; do \
		[ -f "$$f" ] || continue; \
		case "$$f" in \
			*.1280.mp4) \
				echo "==> skip (already converted): $$f" ;; \
			*) \
				out="$${f%.mp4}.mp3"; \
				[ -f "$$out" ] && { echo "==> skip (already exists): $$out"; continue; }; \
				echo "==> converting: $$f -> $$out"; \
				ffmpeg -hide_banner -loglevel error -i "$$f" -vn -map 0:a:0? -c:a libmp3lame -q:a 2 -ac 2 "$$out" || { echo "==> failed: $$f"; continue; }; \
				;; \
		esac; \
	done

# -----------------------------------------------------------------------------
# Repomix
# -----------------------------------------------------------------------------
.PHONY: repo-mix rpmx
repo-mix rpmx:
	npx repomix@latest

.PHONY: repo-mix-preview rpmx-p
repo-mix-preview rpmx-p:
	npx repomix@latest --include-diffs --include-logs --include-logs-count 10

# -----------------------------------------------------------------------------
# システム情報
# -----------------------------------------------------------------------------
.PHONY: arch
arch:
	@echo "==> CPU Architecture Information"
	@echo "HOST_OS: $(HOST_OS)"
	@echo "ARCH: $(ARCH)"
ifdef IS_WINDOWS
	@echo "Platform: Windows"
	@powershell -Command "Get-ComputerInfo -Property 'CsSystemType' | Select-Object -ExpandProperty 'CsSystemType'"
else
	@echo "Platform: Unix-like ($(HOST_OS))"
endif

# -----------------------------------------------------------------------------
# aider
# -----------------------------------------------------------------------------
.PHONY: repo-map rpmp
repo-map rpmp:
	$(MAKE) dc-up-b.aider-map

# -----------------------------------------------------------------------------
# Python
# -----------------------------------------------------------------------------
VENV := .venv
PYTHON := $(if $(wildcard $(VENV)/bin/python),$(VENV)/bin/python,python)

# 依存関係を出力
.PHONY: pip-compile
pip-compile:
	$(PYTHON) -m piptools compile --generate-hashes --allow-unsafe --resolver=backtracking requirements.in

# 依存関係を更新して出力
.PHONY: pip-compile-upgrade
pip-compile-upgrade:
	$(PYTHON) -m piptools compile --upgrade --generate-hashes --allow-unsafe --resolver=backtracking requirements.in

.PHONY: pip-install
pip-install:
	$(PYTHON) -m pip install --no-cache-dir --require-hashes -r requirements.txt

.PHONY: pip-install.%
pip-install.%:
	$(PYTHON) -m pip install $*

.PHONY: py-test
py-test:
	$(PYTHON) -m pytest tests/

 # -----------------------------------------------------------------------------
 # yt-dlp
 # -----------------------------------------------------------------------------
YT_URL ?=
YT_SUB_LANG ?= ja
YT_SUB_FORMAT ?= vtt
YT_DLP := $(PYTHON) -m yt_dlp
OUTPUT_DIR ?= .output/yt-dlp
YT_DLP_SUB_OPTS := --skip-download --write-auto-sub --sub-lang $(YT_SUB_LANG) --sub-format $(YT_SUB_FORMAT) -o "$(OUTPUT_DIR)/%(title)s.%(ext)s"
# 字幕を分割するかどうか true=1 / false=0
YT_SUB_SPLIT ?= 1
# 分割する場合の最大ファイルサイズ（bytes）
YT_SUB_MAX_BYTES ?= 300000
YT_SUB_SPLITTER := $(PYTHON) scripts/yt_sub_split_vtt.py

# ex): make yt-sub YT_URL='https://www.youtube.com/watch?v=GyDrEx1Ibn8'
.PHONY: youtube-subtitle yt-sub
youtube-subtitle yt-sub:
	@url="$(YT_URL)"; \
	[ -n "$$url" ] || { echo "YT_URL が未指定です: make yt-sub YT_URL='https://...'"; exit 2; }; \
	$(YT_DLP) --version >$(NULLDEV) 2>&1 || { \
	  echo "yt_dlp が見つかりません: $(PYTHON) に yt-dlp をインストールしてください (例: $(PYTHON) -m pip install -U yt-dlp)"; \
	  exit 1; \
	}; \
	echo "==> Downloading subtitles from: $$url"; \
	echo "==> Output dir: $(OUTPUT_DIR)"; \
	mkdir -p "$(OUTPUT_DIR)"; \
	$(YT_DLP) $(YT_DLP_SUB_OPTS) "$$url"; \
	if [ "$(YT_SUB_SPLIT)" = "1" ]; then \
	  for f in "$(OUTPUT_DIR)"/*.$(YT_SUB_LANG).$(YT_SUB_FORMAT); do \
	    [ -f "$$f" ] || continue; \
	    echo "==> Splitting subtitles (max=$(YT_SUB_MAX_BYTES) bytes): $$f"; \
	    $(YT_SUB_SPLITTER) --max-bytes $(YT_SUB_MAX_BYTES) --out-dir "$(OUTPUT_DIR)" "$$f"; \
	  done; \
	fi

.PHONY: youtube-subtitle.% yt-sub.%
youtube-subtitle.% yt-sub.%:
	$(MAKE) yt-sub YT_URL=$*
