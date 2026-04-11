import { browser } from 'wxt/browser';
import { getSession, saveBookmark, getUserTags, fetchOgp, checkDomain, checkDuplicate } from '@/lib/rito';
import { stripTrackingParams } from '@/lib/stripTrackingParams';

// --- Icons (HeroIcons 20 Solid) ---
const ICONS = {
  BookmarkIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z"/></svg>',
  ArrowRightEndOnRectangleIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clip-rule="evenodd"/><path fill-rule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clip-rule="evenodd"/></svg>',
  ArrowPathIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clip-rule="evenodd"/></svg>',
  XMarkIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/></svg>',
  TagIcon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.5 2A2.5 2.5 0 0 0 2 4.5v3.879a2.5 2.5 0 0 0 .732 1.767l7.5 7.5a2.5 2.5 0 0 0 3.536 0l3.878-3.878a2.5 2.5 0 0 0 0-3.536l-7.5-7.5A2.5 2.5 0 0 0 8.38 2H4.5ZM5 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg>',
};

// --- State ---
const state = {
  loading: true,
  submitting: false,
  did: null as string | null,
  url: '',
  title: '',
  comment: '',
  tags: [] as string[],
  tagInput: '',
  isPostToBluesky: false,
  isUseOriginalLink: false,
  error: null as string | null,
  success: false,
  suggestions: [] as string[],
  displaySuggestions: [] as string[],
  ogpData: {} as { title?: string; description?: string; image?: string },
};

// --- DOM Elements ---
const elements = {
  loadingOverlay: document.getElementById('loading-overlay')!,
  loadingText: document.getElementById('loading-text')!,
  loginPrompt: document.getElementById('login-prompt')!,
  loginPromptText: document.getElementById('login-prompt-text')!,
  loginLinkText: document.getElementById('login-link-text')!,
  successOverlay: document.getElementById('success-overlay')!,
  successText: document.getElementById('success-text')!,
  mainForm: document.getElementById('main-form')!,
  labelTitle: document.getElementById('label-title')!,
  inputTitle: document.getElementById('input-title') as HTMLInputElement,
  labelComment: document.getElementById('label-comment')!,
  inputComment: document.getElementById('input-comment') as HTMLTextAreaElement,
  labelTags: document.getElementById('label-tags')!,
  inputTag: document.getElementById('input-tag') as HTMLInputElement,
  suggestionsBox: document.getElementById('suggestions-box')!,
  suggestionsList: document.getElementById('suggestions-list')!,
  refreshSuggestions: document.getElementById('refresh-suggestions')!,
  tagsList: document.getElementById('tags-list')!,
  checkPostBluesky: document.getElementById('check-post-bluesky') as HTMLInputElement,
  labelPostBluesky: document.getElementById('label-post-bluesky')!,
  labelPostBlueskyDesc: document.getElementById('label-post-bluesky-desc')!,
  labelOriginalLinkContainer: document.getElementById('label-original-link-container')!,
  checkUseOriginalLink: document.getElementById('check-use-original-link') as HTMLInputElement,
  labelUseOriginalLink: document.getElementById('label-use-original-link')!,
  labelUseOriginalLinkDesc: document.getElementById('label-use-original-link-desc')!,
  errorDisplay: document.getElementById('error-display')!,
  submitBtn: document.getElementById('submit-btn') as HTMLButtonElement,
  submitBtnText: document.getElementById('submit-btn-text')!,
  submitBtnIcon: document.getElementById('submit-btn-icon')!,
};

// --- Utilities ---
const t = (key: any) => browser.i18n.getMessage(key);

function renderIcons() {
  document.querySelectorAll('.icon-container').forEach(el => {
    const iconName = el.getAttribute('data-icon');
    if (iconName && ICONS[iconName as keyof typeof ICONS]) {
      el.innerHTML = ICONS[iconName as keyof typeof ICONS];
      const svg = el.querySelector('svg');
      if (svg && iconName === 'ArrowPathIcon' && (el.closest('#loading-overlay') || el.closest('#submit-btn'))) {
         svg.classList.add('animate-spin');
      }
    }
  });
}

function updateUI() {
  // Overlays
  elements.loadingOverlay.classList.toggle('hidden', !state.loading);
  elements.loginPrompt.classList.toggle('hidden', state.loading || !!state.did || state.success);
  elements.successOverlay.classList.toggle('hidden', !state.success);
  elements.mainForm.classList.toggle('hidden', state.loading || !state.did || state.success);

  if (state.loading) {
    elements.loadingText.textContent = t('msgCheckingSession');
    return;
  }

  if (!state.did) {
    elements.loginPromptText.textContent = t('loginPrompt');
    elements.loginLinkText.textContent = t('loginLink');
    return;
  }

  if (state.success) {
    elements.successText.textContent = t('msgAdded');
    return;
  }

  // Form Labels
  elements.labelTitle.textContent = t('fieldTitle');
  elements.inputTitle.placeholder = t('placeholderTitle');
  elements.labelComment.textContent = t('fieldComment');
  elements.inputComment.placeholder = t('placeholderComment');
  elements.labelTags.textContent = t('fieldTags');
  elements.inputTag.placeholder = t('placeholderTags');
  elements.labelPostBluesky.textContent = t('fieldPostToBluesky');
  elements.labelPostBlueskyDesc.textContent = t('fieldPostToBlueskyDesc');
  elements.labelUseOriginalLink.textContent = t('fieldUseOriginalLink');
  elements.labelUseOriginalLinkDesc.textContent = t('fieldUseOriginalLinkDesc');

  // Form Values
  elements.inputTitle.value = state.title;
  elements.inputComment.value = state.comment;
  elements.inputTag.value = state.tagInput;
  elements.checkPostBluesky.checked = state.isPostToBluesky;
  elements.checkUseOriginalLink.checked = state.isUseOriginalLink;
  elements.labelOriginalLinkContainer.style.opacity = state.isPostToBluesky ? '1' : '0.5';
  elements.checkUseOriginalLink.disabled = !state.isPostToBluesky;

  // Error
  if (state.error) {
    elements.errorDisplay.textContent = state.error;
    elements.errorDisplay.classList.remove('hidden');
  } else {
    elements.errorDisplay.classList.add('hidden');
  }

  // Submit Button
  elements.submitBtn.disabled = state.submitting;
  elements.submitBtnText.textContent = state.submitting ? t('buttonSaving') : t('buttonSave');
  elements.submitBtnIcon.setAttribute('data-icon', state.submitting ? 'ArrowPathIcon' : 'BookmarkIcon');
  renderIcons();

  // Tags List
  elements.tagsList.innerHTML = '';
  state.tags.forEach((tag, i) => {
    const span = document.createElement('span');
    span.className = 'tag-badge';
    span.textContent = tag;
    const xIcon = document.createElement('span');
    xIcon.className = 'icon-container ml-1 w-3 h-3 cursor-pointer opacity-60 hover:opacity-100';
    xIcon.setAttribute('data-icon', 'XMarkIcon');
    xIcon.addEventListener('click', () => {
      state.tags.splice(i, 1);
      updateUI();
    });
    span.appendChild(xIcon);
    elements.tagsList.appendChild(span);
  });

  // Suggestions
  elements.suggestionsBox.classList.toggle('hidden', state.displaySuggestions.length === 0);
  elements.suggestionsList.innerHTML = '';
  state.displaySuggestions.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'suggestion-tag';
    btn.textContent = tag;
    btn.addEventListener('click', () => addTag(tag));
    elements.suggestionsList.appendChild(btn);
  });

  renderIcons();
}

// --- Logic ---
function pickRandomSuggestions(allTags: string[], currentSelected: string[]) {
  const candidates = allTags.filter((tag) => !currentSelected.includes(tag));
  return [...candidates].sort(() => Math.random() - 0.5).slice(0, 8);
}

function refreshSuggestions() {
  state.displaySuggestions = pickRandomSuggestions(state.suggestions, state.tags);
  updateUI();
}

function addTag(tag: string) {
  const cleanTag = tag.trim().replace(/^#+/, '');
  if (cleanTag && !state.tags.includes(cleanTag)) {
    state.tags.push(cleanTag);
    state.displaySuggestions = state.displaySuggestions.filter(t => t !== cleanTag);
    updateUI();
  }
}

async function loadOgp(targetUrl: string) {
  if (!targetUrl.startsWith('http')) return;
  try {
    const data = await fetchOgp(targetUrl);
    if (data?.result) {
      state.ogpData = {
        title: data.result.ogTitle || '',
        description: data.result.ogDescription || '',
        image: data.result.ogImage?.[0]?.url || '',
      };
      if (!state.title || state.title === 'New Tab' || state.title === 'Loading...') {
        state.title = state.ogpData.title || '';
        updateUI();
      }
    }
  } catch (e) {
    console.error('Failed to fetch OGP:', e);
  }
}

async function handleSubmit() {
  const { url, title, comment, tags, isPostToBluesky, isUseOriginalLink, did, ogpData } = state;
  if (!url || !title) return;

  state.submitting = true;
  state.error = null;
  updateUI();

  try {
    // Domain Check
    const domain = new URL(url).hostname;
    const isBlocked = await checkDomain(domain);
    if (isBlocked) {
      state.error = t('errorBlockUrl');
      state.submitting = false;
      updateUI();
      return;
    }

    // Duplicate Check
    if (did) {
      const isDuplicate = await checkDuplicate(url, did);
      if (isDuplicate) {
        state.error = t('errorDuplicate');
        state.submitting = false;
        updateUI();
        return;
      }
    }

    const uiLang = browser.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en';

    await saveBookmark({
      url,
      title,
      comment,
      tags,
      lang: uiLang,
      ogpTitle: ogpData.title,
      ogpDescription: ogpData.description,
      ogpImage: ogpData.image,
      isPostToBluesky,
      isUseOriginalLink,
    });
    
    state.success = true;
    updateUI();
    setTimeout(() => window.close(), 1500);
  } catch (e: any) {
    let msg = t('errorSave');
    try {
      const parsed = JSON.parse(e.message);
      msg = parsed.error || parsed.message || JSON.stringify(parsed);
    } catch {
      msg = e.message || msg;
    }
    state.error = msg;
    state.submitting = false;
    updateUI();
  }
}

// --- Init ---
async function init() {
  renderIcons();
  updateUI();

  try {
    const sessionDid = await getSession();
    state.did = sessionDid;

    if (sessionDid) {
      const [tabs, userTags] = await Promise.all([
        browser.tabs.query({ active: true, currentWindow: true }),
        getUserTags(sessionDid)
      ]);

      if (tabs[0]) {
        const rawUrl = tabs[0].url || '';
        const normalizedUrl = stripTrackingParams(rawUrl);
        state.url = normalizedUrl;
        state.title = tabs[0].title || '';
        loadOgp(normalizedUrl);
      }

      const prefs = await browser.storage.local.get(['isPostToBluesky', 'isUseOriginalLink']);
      if (prefs.isPostToBluesky !== undefined) state.isPostToBluesky = !!prefs.isPostToBluesky;
      if (prefs.isUseOriginalLink !== undefined) state.isUseOriginalLink = !!prefs.isUseOriginalLink;

      state.suggestions = userTags;
      state.displaySuggestions = pickRandomSuggestions(userTags, []);
    }
  } catch (e) {
    console.error(e);
  } finally {
    state.loading = false;
    updateUI();
  }
}

// --- Events ---
elements.inputTitle.addEventListener('input', (e) => {
  state.title = (e.target as HTMLInputElement).value;
});
elements.inputComment.addEventListener('input', (e) => {
  state.comment = (e.target as HTMLTextAreaElement).value;
});
elements.inputTag.addEventListener('input', (e) => {
  state.tagInput = (e.target as HTMLInputElement).value;
});
elements.inputTag.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state.tagInput.trim()) {
    e.preventDefault();
    addTag(state.tagInput);
    state.tagInput = '';
    updateUI();
  }
});
elements.refreshSuggestions.addEventListener('click', refreshSuggestions);
elements.checkPostBluesky.addEventListener('change', (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  state.isPostToBluesky = checked;
  browser.storage.local.set({ isPostToBluesky: checked });
  updateUI();
});
elements.checkUseOriginalLink.addEventListener('change', (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  state.isUseOriginalLink = checked;
  browser.storage.local.set({ isUseOriginalLink: checked });
  updateUI();
});
elements.submitBtn.addEventListener('click', handleSubmit);

init();
