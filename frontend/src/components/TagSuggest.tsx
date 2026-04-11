"use client";
import { useState, useCallback, useMemo } from "react";
import { Badge, Group, ActionIcon } from "@mantine/core";
import { BadgeCheck, RefreshCcw } from "lucide-react";

interface TagSuggestionProps {
    tags: string[];             // 他人のタグ（ランキング）
    selectedTags: string[];            // すでに選択済みのタグ
    setTags: (tags: string[]) => void; // 親に返す
    tagCounts?: Record<string, number>; // タグごとの件数（オプショナル）
}

export function TagSuggestion({
    tags = [],
    selectedTags,
    setTags,
    tagCounts,
}: TagSuggestionProps) {
    // ランダムに n 個取る関数をメモ化
    const pickRandom = useCallback((arr: string[], currentSelected: string[], n: number) => {
        const candidates = arr.filter((tag) => !currentSelected.includes(tag));
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
    }, []);

    // ステートの初期値を直接計算することで、初回の useEffect での setState を避ける
    const [suggested, setSuggested] = useState<string[]>(() => pickRandom(tags, selectedTags, 8));

    // 提案リスト更新
    const updateSuggestions = useCallback(() => {
        setSuggested(pickRandom(tags, selectedTags, 8));
    }, [pickRandom, tags, selectedTags]);

    const tagsKey = useMemo(() => tags.join(","), [tags]);

    // tags が外部から変更された場合のみ同期する
    const [prevTagsKey, setPrevTagsKey] = useState(tagsKey);
    if (tagsKey !== prevTagsKey) {
        setSuggested(pickRandom(tags, selectedTags, 8));
        setPrevTagsKey(tagsKey);
    }

    const selectTag = (tag: string) => {
        // selectedTags に追加
        setTags([...selectedTags, tag]);

        // suggested から削除
        setSuggested(prev => prev.filter(t => t !== tag));
    };

    return (
        <div data-testid="tag-suggestion">
            <Group mb="xs" gap={3} data-testid="group">
                {/* 再提案ボタンをタグの左に */}
                <ActionIcon
                    variant="outline"
                    color="gray"
                    size="sm"
                    aria-label="再提案"
                    onClick={updateSuggestions}
                    mr='xs'
                    data-testid="refresh-button"
                >
                    <RefreshCcw style={{ width: "70%", height: "70%" }} />
                </ActionIcon>

                {suggested.map((tag, idx) => (
                    <Badge
                        key={`${tag}-${idx}`}
                        variant="light"
                        color={tag === "Verified" ? "orange" : "blue"}
                        styles={{ root: { textTransform: "none", cursor: "pointer" } }}
                        onClick={() => selectTag(tag)}
                        data-testid="badge"
                    >
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: tag === "Verified" ? 2 : 0,
                            }}
                        >
                            {tag === "Verified" && <BadgeCheck size={12} />}
                            {tag}
                            {tagCounts && tagCounts[tag] !== undefined && (
                                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                                    ({tagCounts[tag]})
                                </span>
                            )}
                        </span>
                    </Badge>
                ))}
            </Group>
        </div>

    );
}
