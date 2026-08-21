import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { PdsCapabilityBanner } from '../privateBookmark/PdsCapabilityBanner';

describe('PdsCapabilityBanner', () => {
  it('renders nothing when status is ready or idle', () => {
    const { container: c1 } = render(<PdsCapabilityBanner status="ready" />);
    expect(c1.querySelector('.mantine-Alert-root')).toBeNull();

    const { container: c2 } = render(<PdsCapabilityBanner status="idle" />);
    expect(c2.querySelector('.mantine-Alert-root')).toBeNull();
  });

  it('renders loader when checking', () => {
    render(<PdsCapabilityBanner status="checking" />);
    expect(screen.getByText(/PDSの対応状況を確認中/)).toBeInTheDocument();
  });

  it('renders alert when unsupported', () => {
    render(
      <PdsCapabilityBanner
        status="unsupported"
        statusMessage="Endpoint not found"
      />
    );
    expect(screen.getByText(/PDSが現在非公開機能に未対応です/)).toBeInTheDocument();
    expect(screen.getByText(/Endpoint not found/)).toBeInTheDocument();
  });

  it('renders auth button when needs_auth', async () => {
    const onAuthorize = vi.fn();
    render(
      <PdsCapabilityBanner
        status="needs_auth"
        onAuthorize={onAuthorize}
      />
    );
    expect(screen.getByText(/追加のOAuth認可が必要です/)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /非公開機能を認可する/ });
    await userEvent.click(btn);
    expect(onAuthorize).toHaveBeenCalledTimes(1);
  });

  it('renders space creation button when needs_space', async () => {
    const onInitializeSpace = vi.fn();
    render(
      <PdsCapabilityBanner
        status="needs_space"
        onInitializeSpace={onInitializeSpace}
      />
    );
    expect(screen.getByText(/非公開Spaceの初期化/)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Spaceを作成して有効化/ });
    await userEvent.click(btn);
    expect(onInitializeSpace).toHaveBeenCalledTimes(1);
  });
});
