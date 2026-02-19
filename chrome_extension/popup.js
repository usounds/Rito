// 翻訳データ
const messages = {
  ja: {
    bookmark: "リトでブックマーク",
    langLabel: "🌐 言語:",
    path: "ja",
  },
  en: {
    bookmark: "Bookmark with Rito",
    langLabel: "🌐 Language:",
    path: "en",
  }
};

const langSelect = document.getElementById("langSelect");
const bookmarkText = document.getElementById("bookmarkText");
const langLabel = document.querySelector("label[for='langSelect']");

// 言語適用関数
function applyLanguage(lang) {
  const dict = messages[lang] || messages.ja;
  bookmarkText.textContent = dict.bookmark;
  langLabel.textContent = dict.langLabel;
  langSelect.value = lang;
}

// Cross-browser compatibility
const api = typeof chrome !== "undefined" ? chrome : browser;

// 初期化: ストレージから取得
let currentLang = "ja";
api.storage.local.get("lang", (data) => {
  currentLang = data.lang || "ja";
  applyLanguage(currentLang);
});

// 言語切り替えイベント
langSelect.addEventListener("change", () => {
  currentLang = langSelect.value;
  api.storage.local.set({ lang: currentLang });
  applyLanguage(currentLang);
});

// ブックマークボタン処理
document.addEventListener('DOMContentLoaded', function () {
  const button = document.getElementById('bookmarkButton');

  button.addEventListener('click', function () {
    api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const currentTab = tabs[0];
      const url = encodeURIComponent(currentTab.url);
      const title = encodeURIComponent(currentTab.title || '');

      // 言語ごとにパス切り替え
      const langPath = messages[currentLang]?.path || "ja";
      const target = `https://rito.blue/${langPath}/bookmark/register`;
      const params = `?subject=${url}&title=${title}`;

      api.tabs.create({
        url: target + params
      });
      window.close();
    });
  });
});
