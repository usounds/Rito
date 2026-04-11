import React, { useEffect, useState, useCallback } from 'react';
import { browser } from 'wxt/browser';
import { getSession, saveBookmark, getUserTags, fetchOgp } from '@/lib/rito';
import { BookmarkIcon, ArrowRightEndOnRectangleIcon, ArrowPathIcon, XMarkIcon, TagIcon } from '@heroicons/react/20/solid';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [did, setDid] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isPostToBluesky, setIsPostToBluesky] = useState(true);
  const [isUseOriginalLink, setIsUseOriginalLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [displaySuggestions, setDisplaySuggestions] = useState<string[]>([]);

  // OGP States (Maintained in state but not displayed as image card)
  const [ogpData, setOgpData] = useState<{
    title?: string;
    description?: string;
    image?: string;
  }>({});

  const t = (key: string) => browser.i18n.getMessage(key as any);

  const pickRandomSuggestions = useCallback((allTags: string[], currentSelected: string[]) => {
    const candidates = allTags.filter((tag) => !currentSelected.includes(tag));
    return [...candidates].sort(() => Math.random() - 0.5).slice(0, 8);
  }, []);

  const refreshSuggestions = () => {
    setDisplaySuggestions(pickRandomSuggestions(suggestions, tags));
  };

  const loadOgp = useCallback(async (targetUrl: string) => {
    if (!targetUrl.startsWith('http')) return;
    try {
      const data = await fetchOgp(targetUrl);
      if (data?.result) {
        const oTitle = data.result.ogTitle || '';
        const oDesc = data.result.ogDescription || '';
        const oImg = data.result.ogImage?.[0]?.url || '';

        setOgpData({ title: oTitle, description: oDesc, image: oImg });
        // Update title if it's currently generic or empty
        setTitle(prev => {
          if (!prev || prev === 'New Tab' || prev === 'Loading...') return oTitle;
          return prev;
        });
      }
    } catch (e) {
      console.error('Failed to fetch OGP:', e);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const sessionDid = await getSession();
        setDid(sessionDid);

        if (sessionDid) {
          const [tabs, userTags] = await Promise.all([
            browser.tabs.query({ active: true, currentWindow: true }),
            getUserTags(sessionDid)
          ]);

          if (tabs[0]) {
            const currentUrl = tabs[0].url || '';
            const currentTitle = tabs[0].title || '';
            setUrl(currentUrl);
            setTitle(currentTitle);

            // Fetch OGP metadata in background for Lexicon registration
            loadOgp(currentUrl);
          }

          // Load preferences from storage
          const prefs = await browser.storage.local.get(['isPostToBluesky', 'isUseOriginalLink']);
          if (prefs.isPostToBluesky !== undefined) setIsPostToBluesky(!!prefs.isPostToBluesky);
          if (prefs.isUseOriginalLink !== undefined) setIsUseOriginalLink(!!prefs.isUseOriginalLink);

          setSuggestions(userTags);
          setDisplaySuggestions(pickRandomSuggestions(userTags, []));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [pickRandomSuggestions, loadOgp]);

  const handleAddTag = (e?: React.KeyboardEvent, suggestedTag?: string) => {
    if (e) {
      if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        const cleanTag = tagInput.trim().replace(/^#+/, '');
        if (cleanTag && !tags.includes(cleanTag)) {
          setTags([...tags, cleanTag]);
        }
        setTagInput('');
      }
    } else if (suggestedTag) {
      if (!tags.includes(suggestedTag)) {
        setTags([...tags, suggestedTag]);
        setDisplaySuggestions(prev => prev.filter(t => t !== suggestedTag));
      }
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!url || !title) return;
    setSubmitting(true);
    setError(null);
    try {
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
      setSuccess(true);
      setTimeout(() => window.close(), 1500);
    } catch (e: any) {
      let msg = t('errorSave');
      try {
        const parsed = JSON.parse(e.message);
        msg = parsed.error || parsed.message || JSON.stringify(parsed);
      } catch {
        msg = e.message || msg;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ArrowPathIcon className="animate-spin text-blue-500 w-8 h-8" />
      </div>
    );
  }

  if (!did) {
    return (
      <div className="login-prompt">
        <p>{t('loginPrompt')}</p>
        <p>
          <a
            href="https://rito.blue/"
            target="_blank"
            rel="noreferrer"
            className="login-link"
          >
            <ArrowRightEndOnRectangleIcon className="inline mr-1 w-4 h-4" />
            {t('loginLink')}
          </a>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-prompt">
        <p style={{ fontSize: '14px' }}>{t('msgAdded')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="field">
        <label className="label">{t('fieldTitle')}</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('placeholderTitle')}
        />
      </div>

      <div className="field">
        <label className="label">{t('fieldComment')}</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('placeholderComment')}
          rows={3}
        />
      </div>

      <div className="field">
        <label className="label">{t('fieldTags')}</label>
        <div style={{ position: 'relative' }}>
          <TagIcon className="absolute left-2 top-2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder={t('placeholderTags')}
            style={{ paddingLeft: '32px' }}
          />
        </div>

        {displaySuggestions.length > 0 && (
          <div className="suggestions-box">
            <button className="refresh-btn" onClick={refreshSuggestions} title="Refresh">
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <div className="suggestions-list">
              {displaySuggestions.map((tag, i) => (
                <button
                  key={i}
                  className="suggestion-tag"
                  onClick={() => handleAddTag(undefined, tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="tags-list">
          {tags.map((tag, i) => (
            <span key={i} className="tag-badge">
              {tag}
              <XMarkIcon
                className="ml-1 w-3 h-3 cursor-pointer opacity-60 hover:opacity-100"
                onClick={() => removeTag(i)}
              />
            </span>
          ))}
        </div>
      </div>

      <div className="options-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={isPostToBluesky}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsPostToBluesky(checked);
              browser.storage.local.set({ isPostToBluesky: checked });
            }}
          />
          <div className="label-content">
            <span className="label-title">{t('fieldPostToBluesky')}</span>
            <span className="label-desc">{t('fieldPostToBlueskyDesc')}</span>
          </div>
        </label>

        <label className="checkbox-label" style={{ opacity: isPostToBluesky ? 1 : 0.5 }}>
          <input
            type="checkbox"
            checked={isUseOriginalLink}
            disabled={!isPostToBluesky}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsUseOriginalLink(checked);
              browser.storage.local.set({ isUseOriginalLink: checked });
            }}
          />
          <div className="label-content">
            <span className="label-title">{t('fieldUseOriginalLink')}</span>
            <span className="label-desc">{t('fieldUseOriginalLinkDesc')}</span>
          </div>
        </label>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="buttons">
        <button
          className="primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ArrowPathIcon className="animate-spin inline mr-2 w-4 h-4" />
          ) : (
            <BookmarkIcon className="inline mr-2 w-4 h-4" />
          )}
          {submitting ? t('buttonSaving') : t('buttonSave')}
        </button>
      </div>
    </div>
  );
}
