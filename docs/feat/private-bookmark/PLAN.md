# Private Bookmark v1 実装計画

## 1. 文書の位置づけ

本書は、`feat/private-bookmark/Proposal.md` に収録した AT Protocol Proposal 0016 Permissioned Data を前提に、Ritoへ「本人だけが利用できるプライベートブックマーク」を追加するためのv1要件を定義する。

Proposal 0016は草案であり、Lexicon、XRPC、認可フロー、用語およびPDS実装は変更される可能性がある。実装時は利用対象PDSの対応状況を確認し、未対応PDSでは機能を有効化しない。

## 2. 目的

- ブックマークを公開repoへ書かず、所有者本人のpermissioned repoへ保存する。
- 他のAT Protocolユーザー、公開Relay、Jetstream、公開AppView、Ritoの公開APIから参照できないようにする。
- 複数端末では、同じDIDで認証することでPDSから同じブックマークを取得できるようにする。
- Ritoおよびブラウザへ不要な永続コピーを作らず、PDSを唯一の永続保存先にする。

## 3. プライバシー境界

v1が提供するのはProposal 0016に基づくアクセス制御であり、E2EEではない。

プライベートブックマークを読み得る主体は次に限定する。

- ブックマーク所有者本人
- 所有者がOAuthで認可したアプリケーション
- レコードを保持するPDS
- サーバー側OAuthの中継が必要な場合に、処理中の値を一時的に扱うRitoサーバー

PDS運営者や認可済みアプリケーションからも内容を秘匿することはv1の対象外とする。その要件にはクライアント側暗号化と鍵管理を伴う別設計が必要である。

## 4. 確定した設計方針

### 4.1 PDSを唯一の永続保存先にする

- private bookmarkの正本は、所有者のPDSにあるpermissioned repoとする。
- RitoのPostgreSQL、KV、Redis等へprivate bookmarkレコードや派生検索インデックスを保存しない。
- ブラウザのIndexedDB、LocalStorage、SessionStorage、Service Worker Cacheへprivate bookmarkを保存しない。
- UIが取得したデータとページングcursorはタブ内メモリだけに保持する。
- リロード、ログアウト、セッション失効、DID切り替え時にメモリ上のデータを破棄する。
- キャッシュ導入はv1の性能を実測した後、別の設計判断として行う。

保存禁止の対象には少なくとも次を含む。

- subject URL
- タイトル、コメント
- タグ、カテゴリ
- OGP情報
- レコード値、CIDと値の対応表
- 全文検索用インデックス

OAuthセッション、CSRF情報、レート制限情報など、レコード本文を含まない既存の認証・運用データはこの禁止対象に含めない。

### 4.2 標準XRPCでPDSを操作する

permissioned repoの読み書きには、Proposal 0016の標準`com.atproto.space.*` XRPCを使用する。

- 一覧取得: `com.atproto.space.listRecords`
- 単一取得: `com.atproto.space.getRecord`
- 作成: `com.atproto.space.createRecord`
- 作成または更新: `com.atproto.space.putRecord`
- 削除: `com.atproto.space.deleteRecord`
- 複数書き込み: `com.atproto.space.applyWrites`

v1は現在のRitoと同じサーバー管理OAuth経路を使用する。ブラウザの`thisClient`はRitoの同一オリジンにある`/xrpc/com.atproto.space.*`を呼び、Next.js XRPCルートが署名済みDIDを検証してOAuthセッションを復元し、利用者のPDSへ同じ標準XRPCを中継する。中継層はセッション復元、DID検証、CSRF検証、PDS XRPCの転送、レスポンス正規化だけを担い、record値を永続化しない。独自の`blue.rito.*`保存プロトコルへ置き換えず、OAuth tokenをブラウザへ渡さない。

### 4.3 公開ブックマーク経路と完全に分離する

- private bookmarkを公開repoの`blue.rito.feed.bookmark`へ書かない。
- 公開レコードに`private`フラグを追加する方式は採用しない。
- private bookmarkを既存の`Bookmark`、`Comment`、`Tag`、`BookmarkTag`テーブルへ保存しない。
- private bookmarkをJetstream、公開ブックマークindexer、公開集計処理へ入力しない。
- 次の公開機能へprivate bookmarkを混入させない。
  - プロフィール
  - トップページ
  - 最新ブックマーク
  - タグ・カテゴリ集計
  - ステータス統計
  - `blue.rito.feed.getActorBookmarks`等の公開XRPC
  - URLやsubjectから公開ブックマークを検索するAPI
- 公開ブックマーク向けOpenAI分類・モデレーション処理へprivate bookmarkを送らない。

## 5. SpaceとLexicon

v1では所有者ごとにself-onlyの個人Spaceを使用する。

- space authority: 所有者のDID
- author DID: 所有者のDID
- skey: 固定値`self`
- policy: `member-list`
- member: 所有者のDIDのみ
- app access: `#open`

公開repoへの誤書き込みを防ぐため、private bookmark専用のspace typeとrecord collectionを定義する。

- space type: `blue.rito.space.bookmark`
- record collection: `blue.rito.private.feed.bookmark`

space type declarationとrecord collectionはLexiconのmain definitionの種類が異なるため、同じNSIDを共用しない。`appAccess: #open`はSpaceを一般公開する設定ではなく、所有者がOAuthで認可した互換アプリをRito以外にも許可する設定である。利用可能なユーザーは`policy: member-list`により所有者DIDだけに制限する。

recordは既存の`blue.rito.feed.bookmark`と同等の利用体験を提供するため、少なくとも次のフィールドを持つ。

- `subject`
- `createdAt`
- 多言語のtitle/comment
- tags
- OGP title/description/image

record collectionの`key`は`tid`とし、bookmark本体のidentityをsubjectから分離する。

### 5.1 Record keyとsubject重複の扱い

新規作成時にTIDを生成してrkeyへ使用する。同じsubjectを持つrecordの複数作成をプロトコルまたはRitoで禁止しない。subjectの重複はPDSの整合性、アクセス制御、record identityを損なわず、異なる保存時点、コメント、タグを持つ別bookmarkとして扱える。

編集ではsubjectを変更する場合も同じrkeyへの`putRecord`とし、record URIを維持する。削除はそのrecord URI/rkeyだけを対象にする。

v1では重複確認のための全件走査、subject hash、専用index record、PostgreSQL/KV索引を導入しない。取得済み一覧に同じsubjectが存在する場合の任意の警告や表示上のグルーピングは将来追加できるが、保存を拒否する一意制約にはしない。

## 6. OAuthと認可

本人のrepoだけを対象にするため、v1の読み取り権限は`read_self`を基本とする。

必要な権限:

- `read_self`
- 対象collectionへの`create`
- 対象collectionへの`update`
- 対象collectionへの`delete`
- 初回Space作成に必要な`manage=create`

v1では次を要求しない。

- 他ユーザーrepoを含むSpace全体の`read`
- `com.atproto.space.getDelegationToken`
- `com.atproto.space.getSpaceCredential`
- `com.atproto.space.listRepos`
- `com.atproto.space.registerNotify`
- 常駐syncerによるバックグラウンド同期

サーバー側BFFを使用する場合、対象DIDをクエリやbodyから信用してはならない。署名済みCookieおよび復元したOAuthセッションからDIDを確定し、space authority、repo、author DIDがそのDIDと一致することを検証する。

## 7. 機能要件

### 7.1 Capability確認と初期化

- private bookmarkを初めて有効化するときに、既存ログインとは分けて必要な`space:` OAuth scopeの追加認可を要求する。認可サーバーがscopeを拒否した場合はprivate bookmarkをそのアカウントでは利用不能として扱い、既存セッションと公開bookmark機能を維持する。
- OAuth成功後、既知のSpace URI `at://{ownerDid}/space/blue.rito.space.bookmark/self`を指定して`com.atproto.space.getSpace`を呼び、実際の操作によってcapabilityとSpaceの存在を確認する。汎用的なcapability一覧APIには依存しない。
- `getSpace`成功時は、返されたURIからowner DID、space type、skeyを検証し、configが`member-list` policyおよび`appAccess: #open`であることを確認する。さらに`com.atproto.simplespace.listMembers`で所有者以外のmemberが存在しないことを確認する。期待と異なる既存Spaceを自動変更または削除しない。
- `SpaceNotFound`は「PDSは対応しているがSpaceは未作成」と判定し、`com.atproto.simplespace.createSpace`を`type=blue.rito.space.bookmark`、`skey=self`、所有者だけの`member-list`、`appAccess=#open`で呼ぶ。
- 同時初期化による`SpaceAlreadyExists`は成功相当として`getSpace`を再実行する。
- XRPCのmethod-not-foundまたは対応する404はPDS未対応、401/403またはscopeエラーは再認可・設定不備、timeout・network error・5xxは一時的な判定不能として区別する。一時障害を「未対応」として永続記録しない。
- Space確認後に`com.atproto.space.listRecords`を所有者repoと`blue.rito.private.feed.bookmark` collectionへ実行し、permissioned repo読取APIまで利用可能であることを確認する。
- `listSpaces`は、空のSpaceや未書き込みSpaceを列挙しない実装があり得るため、Space存在判定またはcapability判定の正本にしない。
- capability判定結果はタブ内メモリにだけ保持し、PDS実装更新後にも再判定できるよう永続的なnegative cacheを作らない。
- 未対応の場合はprivate bookmark機能を利用不能として明示する。
- 初期化失敗時に公開ブックマークへ自動フォールバックしてはならない。

### 7.2 一覧取得

- `listRecords`を使用して所有者本人のprivate bookmarkだけを取得する。採用するLexicon版が値をinlineしない場合は、返されたcollection/rkey/CIDごとに`getRecord`して値を取得する。
- PDSが返すcursorをそのまま次ページ取得に利用する。
- 全件を先読みせず、画面に必要なページをオンデマンドで取得する。
- UI用の正規化はレスポンス受信後にメモリ上で行う。
- PDS取得に失敗した場合は、古い永続キャッシュを表示せず、再試行可能なエラーを表示する。

### 7.3 作成・更新・削除

- 書き込みは標準`com.atproto.space.*` XRPCでPDSへ直接適用する。
- PDSが成功を返した後にUIのタブ内状態を更新する。
- 失敗時は成功扱いせず、再試行可能なエラーを表示する。
- private bookmarkの操作に伴って公開repoやRito PostgreSQLへレコードを書かない。
- CSRF対策が必要な中継経路では、すべての書き込みでCSRFを検証する。

### 7.4 表示・編集

- private bookmarkの一覧、詳細、編集、削除は認証済み所有者だけが利用できる。
- private bookmarkのURIを知っているだけでは内容を取得できない。
- ログアウトまたはDID切り替え後、直前の所有者の内容を画面へ残さない。
- private bookmarkページを静的生成、ISR、共有サーバーキャッシュ、CDNキャッシュの対象にしない。

### 7.5 OGP取得

- OGP情報とその取得機能は公開情報として扱い、既存の公開`/api/fetchOgp`をprivate bookmarkからも再利用してよい。
- OGP取得リクエストへ所有者DID、Space URI、private record URIを含めず、対象URLと所有者をサーバー側で関連付けて保存しない。
- 取得したOGP情報は作成フォームのタブ内メモリとPDSへ保存するrecordだけに反映し、RitoのPostgreSQL、KV、公開ブックマークテーブルへ保存しない。
- OGP取得の公開・非公開にかかわらず、公開APIとして必要なSSRF対策、入力検証、応答サイズ制限を適用する。

## 8. HTTP・ログ・ブラウザ要件

- private bookmarkを含むレスポンスには`Cache-Control: private, no-store`を設定する。
- private bookmarkを含むレスポンスをNext.js Data Cache、Route Cache、CDN、Service Workerへ保存しない。
- private recordを扱うXRPCでは、subject、本文、コメント、タグ、OGPをアプリケーションログ、アクセスログ、エラー監視イベントへ出力しない。
- 公開`/api/fetchOgp`の対象URLは公開情報として扱うが、所有者DID、Space URI、private record URIと関連付けてログまたはメトリクスへ保存しない。
- URL全体をログへ出す仕組みでは、private record XRPCのquery/bodyを除外またはマスクする。
- private bookmarkのHTML/Markdown表示には既存の安全なサニタイズ処理を適用する。
- private bookmarkを含むページで意図しないprefetchを行わない。

## 9. 非機能要件

- PDSが正本であり、Ritoの再起動やデプロイでprivate bookmarkが失われたり不整合になったりしない。
- キャッシュがないことを前提に、一覧の初回表示時間、次ページ取得時間、転送量、PDSエラー率を計測できるようにする。ただし計測値へrecord内容を含めない。
- Proposal 0016の仕様変更へ追従しやすいよう、PDS XRPC呼び出しとUIロジックの境界を分離する。
- 標準XRPCの型が利用ライブラリに未収録の場合、対象Lexiconから型を生成し、`any`で恒久対応しない。

## 10. 受け入れ条件

- 所有者はprivate bookmarkを作成、一覧表示、詳細表示、編集、削除できる。
- 同じDIDで別端末から認証した場合、PDSから同じprivate bookmarkを取得できる。
- 匿名ユーザーおよび別DIDはprivate bookmarkを取得できない。
- private bookmarkが公開repo、Jetstream、公開PostgreSQLテーブル、公開API、公開ページへ現れない。
- private bookmarkの内容がPostgreSQL、KV、Redis、IndexedDB、LocalStorage、SessionStorage、Service Worker Cacheへ残らない。
- 一覧はPDS cursorでページングでき、タブを再読み込みした場合はPDSから再取得される。
- private bookmarkを含むHTTPレスポンスが`private, no-store`である。
- private record XRPCのログ、メトリクス、エラー監視にsubjectやrecord内容が含まれない。
- PDSが未対応または利用不能なとき、公開保存へ切り替えず安全に失敗する。
- private bookmarkから既存の公開`/api/fetchOgp`を利用でき、Rito側に所有者との関連付けやOGPキャッシュが作られない。

## 11. テスト計画

### Unit

- permissioned recordとUI型の相互変換
- TID rkey生成
- 同一subjectを持つ複数recordの作成・個別編集・個別削除
- cursorの受け渡し
- Space URI、repo、author DIDの所有者検証
- OAuth scope判定
- ログ用redaction
- DID切り替え時のメモリ状態破棄

### Integration

- self-only Spaceの作成
- `listRecords`、`getRecord`、`createRecord`、`putRecord`、`deleteRecord`
- 所有者OAuthでの成功
- 匿名、別DID、scope不足での拒否
- PDS未対応、タイムアウト、不正レスポンス時の安全な失敗
- `SpaceNotFound`からの作成、`SpaceAlreadyExists`競合後の再取得
- method-not-found、scope不足、一時的な5xxの状態分類
- BFF利用時のCSRF、session DID固定、`Cache-Control`

### Regression

- 公開ブックマークの作成・編集・削除が従来どおり動く。
- 公開一覧、プロフィール、タグ、カテゴリ、ステータス集計へprivate bookmarkが混入しない。
- 既存Jetstream indexerがprivate bookmarkを処理しない。

### Browser/E2E

- 作成後に一覧へ表示される。
- リロード後にPDSから再取得される。
- 次ページをcursorで取得できる。
- ログアウトおよびDID切り替え後に内容が残らない。
- IndexedDB、LocalStorage、SessionStorage、Cache APIにprivate bookmarkが保存されない。

## 12. 実装フェーズ

1. 対象PDSと利用ライブラリのProposal 0016対応状況を確認する。
2. 確定したNSIDでspace typeおよびprivate bookmark record Lexiconのschemaを定義する。
3. Lexiconを追加し、frontend/backendの型を生成する。
4. OAuth permission setへ最小scopeを追加する。
5. Space capability確認とself-only Space初期化を実装する。
6. `com.atproto.space.*`を呼ぶ型安全なクライアント層を実装する。
7. 一覧、cursorページング、作成、編集、削除UIを実装する。
8. キャッシュ禁止、ログredaction、認可境界をテストする。
9. PDS未対応時の表示と安全な失敗を検証する。
10. 実測値を取得し、v1後にキャッシュや検索索引の必要性を再評価する。

## 13. v1対象外

- PostgreSQL、KV、Redis、ブラウザ永続ストレージへのprivate bookmarkキャッシュ
- オフライン閲覧・オフライン編集
- Ritoサーバーでの全文検索・カテゴリ集計・推薦
- OpenAI等の外部サービスによる自動分類・モデレーション
- permissioned Spaceの常駐バックグラウンド同期
- private bookmarkの共有、グループ利用、他ユーザーへの公開
- E2EE
- 既存の公開ブックマークをprivate bookmarkへ移行する機能

## 14. 実装前に確定する事項

- Proposal 0016の実装版Lexiconと本文との差分
