
/**
 * 画像を圧縮して指定されたサイズ以下にする
 * 
 * 仕様:
 * 1. 元のBlobが最大サイズ以下なら、圧縮・変換せずそのまま返す。
 * 2. 最大サイズを超える場合、または幅が最大幅を超える場合、リサイズとJPEG圧縮を行う。
 * 3. 圧縮品質を段階的に下げてリトライする。
 * 
 * @param blob 元の画像Blob
 * @param maxSizeBytes 最大ファイルサイズ（バイト）
 * @param maxWidth 最大幅（ピクセル）
 * @returns 圧縮されたBlob
 */
export async function compressImage(blob: Blob, maxSizeBytes: number = 950000, maxWidth: number = 1200): Promise<Blob> {
    // 1. サイズチェック: 既に制限内なら何もしない
    if (blob.size <= maxSizeBytes) {
        return blob;
    }

    try {
        // Bitmapとして読み込み
        const img = await createImageBitmap(blob);

        let width = img.width;
        let height = img.height;

        // 2. リサイズ計算
        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas context not available');
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 3. 圧縮ループ
        // 初回は品質0.9からスタートし、サイズが満たされるまで0.1刻みで下げる
        let quality = 0.9;

        while (quality >= 0.1) {
            const compressedBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, 'image/jpeg', quality);
            });

            if (compressedBlob && compressedBlob.size <= maxSizeBytes) {
                return compressedBlob;
            }

            quality -= 0.1;
        }

        // 圧縮限界（quality < 0.1）でもサイズオーバーの場合:
        // ベストエフォートで最後の結果を返すか、エラーにするか。
        // ここでは、一番最後に生成された（最も品質が低い）Blobを再生成して返すこととする。
        // もし最後のループでnullだった場合はエラー。
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Compression failed')), 'image/jpeg', 0.1);
        });

    } catch (error) {
        console.error('Image compression error:', error);
        // 圧縮に失敗した場合でも、元のBlobを返すとアップロードでエラーになるだけなので、
        // ここではエラーを再スローして呼び出し元に任せる（呼び出し元で元のBlobを使うか判断する）。
        throw error;
    }
}
