import publicSuffixList from '../data/publicSuffixList.json';

/**
 * NSIDを「アプリ（登録可能ドメイン）」単位で集約するロジック
 * 
 * publicSuffixList を参照し、パブリックサフィックス（例: "app", "co.jp"）
 * に1セグメント加えたものを「アプリのルート」として集約します。
 */
export function aggregateNsids(nsids: string[]): string[] {
    const aggregated = new Set<string>();
    const psl = publicSuffixList as string[];

    for (const nsid of nsids) {
        const segments = nsid.split('.');
        if (segments.length < 2) {
            aggregated.add(nsid);
            continue;
        }

        // 左から順にセグメントをチェックし、PSLに含まれる最長の一致を確認
        // 例: "jp.co.example" -> segments[0]は"jp"、segments[0..1]は"jp.co"
        // それぞれを反転させて "jp", "co.jp" として PSL と照合
        let suffixLength = 0;
        for (let i = 1; i < segments.length; i++) {
            const currentPrefix = segments.slice(0, i);
            const domainStyle = [...currentPrefix].reverse().join('.');
            if (psl.includes(domainStyle)) {
                suffixLength = i;
            } else {
                // PSLは階層構造なので、一度不一致になればそれ以上長くはならない
                break;
            }
        }

        // PSL部分に「所有者」セグメントを1つ加えたものを集約単位とする
        // app.bsky.feed -> app (PSL:1) -> app.bsky (2)
        // jp.co.example.post -> jp.co (PSL:2) -> jp.co.example (3)
        // PSLに含まれない未知のトップセグメントの場合はLv2とする
        const aggregateLength = suffixLength > 0 ? suffixLength + 1 : 2;
        aggregated.add(segments.slice(0, Math.min(aggregateLength, segments.length)).join('.'));
    }

    return Array.from(aggregated).sort();
}

/**
 * NSIDからドメインを推測するロジック (Fallback用)
 * 全セグメントを反転させる (app.bsky -> bsky.app, jp.co.example -> example.co.jp)
 */
export function nsidToDomain(nsid: string): string {
    return nsid.split('.').reverse().join('.');
}
