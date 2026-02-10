# クイックスタート

## docker 起動

```bash
make dc-up-b
```

## SearXNG の設定を初期化

1. [SearXNG](http://localhost:12348) を開く
2. 右上の [Preferences](http://localhost:12348/preferences) ボタンをクリック
3. 右下の [Reset defaults](http://localhost:12348/clear_cookies) ボタンをクリック

## OpenCode 設定ファイルで MCP 登録

> `~/.config/opencode/opencode.json`  
> `プロジェクト直下の opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "searxng": {
      "type": "local",
      "command": ["npx", "-y", "mcp-searxng"],
      "enabled": true,
      "environment": {
        "SEARXNG_URL": "http://localhost:12348"
        // 任意（Basic認証のSearXNGなら）
        // "AUTH_USERNAME": "user",
        // "AUTH_PASSWORD": "pass"
      },
      "timeout": 10000
    }
  }
}
```

OpenCode のコマンド `Toggle MCPs` を選択した後に `searxng connected` が表示されれば成功
