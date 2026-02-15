---
description: Rito拡張機能を配布用にパッケージ（Zip圧縮）する
---

ブラウザ拡張機能のファイルを、配布・申請用にZip形式で圧縮します。不要なファイル（.DS_Storeなど）は自動的に除外されます。

1. `chrome_extension` ディレクトリに移動します。
2. 以下のコマンドを実行して、ルートディレクトリに `rito-extension.zip` を作成します。

// turbo
```bash
zip -r ../rito-extension.zip . -x "*.DS_Store" -x ".gitignore" -x "__MACOSX" "*.zip"
```
