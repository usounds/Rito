/**
 * URLからトラッキング系クエリパラメータを除去する
 * DBデータには手を加えず、入力URLの正規化に使用する
 */

const TRACKING_PARAMS = [
    // UTM パラメータ
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    // 広告プラットフォーム
    "gclid",        // Google Ads
    "fbclid",       // Facebook
    "msclkid",      // Microsoft Ads
    // メールマーケティング
    "mc_cid",       // Mailchimp
    "mc_eid",       // Mailchimp
    // Matomo / Piwik
    "pk_campaign",
    "pk_kwd",
    // リファラル
    "ref",
    "affiliate_id",
    // SNSシェア系
    "sub_rt",       // note.com
    "si",           // Spotify
    "igshid",       // Instagram
    "twclid",       // Twitter Ads
    "yclid",        // Yahoo Ads
    "ttclid",       // TikTok Ads
    // その他
    "li_fat_id",    // LinkedIn
    "srsltid",      // Google SERP
    "_hsenc",       // HubSpot
    "_hsmi",        // HubSpot
];

export function stripTrackingParams(url: string): string {
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") return url;
        for (const key of TRACKING_PARAMS) {
            urlObj.searchParams.delete(key);
        }
        return urlObj.toString();
    } catch {
        return url;
    }
}
