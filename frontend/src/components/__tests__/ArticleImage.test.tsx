import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ArticleImage from '../ArticleImage';

vi.mock('@mantine/core', () => ({
  useComputedColorScheme: () => 'light',
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    sizes,
    src,
  }: {
    alt: string;
    sizes: string;
    src: string;
  }) => <img alt={alt} data-sizes={sizes} src={src} />,
}));

describe('ArticleImage', () => {
  it('カード表示ではモバイルとタブレットの実表示幅に合わせる', () => {
    render(
      <ArticleImage
        src="https://example.com/image.jpg"
        url="https://example.com/article"
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute(
      'data-sizes',
      '(max-width: 48em) 110px, (max-width: 62em) 45vw, 320px',
    );
  });

  it('呼び出し元が指定した画像幅を使用する', () => {
    render(
      <ArticleImage
        src="https://example.com/image.jpg"
        url="https://example.com/article"
        sizes="100px"
      />,
    );

    expect(screen.getByRole('img')).toHaveAttribute('data-sizes', '100px');
  });
});
