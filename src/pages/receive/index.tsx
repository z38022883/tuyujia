import { useRef, useState } from 'react';
import { View, Text, Textarea, Button, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/useAppStore';
import { useProfileStore } from '@/store/useProfileStore';
import { speak } from '@/services/tts';
import { matchTextToImages, type MatchedToken } from '@/utils/text-to-image-matcher';
import { pickCoreItem } from '@/utils/severity-display';
import { getPictogramsByCategory, getAllPictograms } from '@/data';
import type { PictogramEntry } from '@/types';
import styles from './index.module.scss';

const EXAMPLE_PHRASES = [
  '今天吃什么',
  '需要喝水吗',
  '需要去厕所吗',
  '你感觉怎么样',
  '你头晕吗',
  '你发烧了吗',
  '感觉恶心吗',
  '需要吃药吗',
  '医生来看你了',
  '我们要去医院'
];

const MATCH_TYPE_LABEL: Record<MatchedToken['matchType'], string> = {
  exact: '精确',
  synonym: '同义词',
  'lexicon-synonym': '词库',
  partial: '包含',
  none: '未匹配'
};

type Phase = 'input' | 'matching' | 'review';

interface EditableItem {
  uid: number;
  token: string;
  pictogram: PictogramEntry | null;
  matchType: MatchedToken['matchType'];
}

type MatchedItem = EditableItem & { pictogram: PictogramEntry };

function ReceivePage() {
  const { settings, recordReceiveExpression } = useAppStore();
  const severity = useProfileStore((s) => s.profile?.severity ?? null);
  const [phase, setPhase] = useState<Phase>('input');
  const [inputText, setInputText] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [showDisplay, setShowDisplay] = useState(false);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const uidRef = useRef(0);

  const level = severity ?? 'mild';

  async function doMatch(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      Taro.showToast({ title: '请输入文字', icon: 'none' });
      return;
    }
    setInputText(trimmed);
    setPhase('matching');
    try {
      const result = await matchTextToImages(trimmed);
      setItems(
        result.matches.map((m) => ({
          uid: uidRef.current++,
          token: m.token,
          pictogram: m.pictogram,
          matchType: m.matchType
        }))
      );
      setPhase('review');
    } catch (err) {
      console.error('[Receive] match failed:', err);
      Taro.showToast({ title: '转换失败，请重试', icon: 'none' });
      setPhase('input');
    }
  }

  function deleteItem(index: number) {
    setItems((list) => list.filter((_, i) => i !== index));
  }

  function moveItem(index: number, dir: -1 | 1) {
    setItems((list) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function openDisplay() {
    setShowDisplay(true);
    speak(inputText, settings).catch((err) => console.error('[Receive] auto speak:', err));
  }

  function handleDone() {
    const matched = items.filter((i): i is MatchedItem => i.pictogram !== null);
    recordReceiveExpression(inputText, matched.map((i) => i.pictogram));
    Taro.showToast({ title: '已记录', icon: 'success' });
    setShowDisplay(false);
    setPhase('input');
    setInputText('');
    setItems([]);
  }

  // 换图候选：同分类优先，不足时用其它图符补齐（上限 24）
  const swapCandidates: PictogramEntry[] = (() => {
    const target = swapIndex !== null ? items[swapIndex] : null;
    if (!target) return [];
    const base = target.pictogram
      ? getPictogramsByCategory(target.pictogram.categoryId)
      : [];
    const token = target.token;
    const tokenMatch = getAllPictograms().filter(
      (p) => p.labels.zh.some((l) => l.includes(token)) || p.synonyms.includes(token)
    );
    const seen = new Set<string>();
    const result: PictogramEntry[] = [];
    for (const p of [...tokenMatch, ...base]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      result.push(p);
      if (result.length >= 24) break;
    }
    return result;
  })();

  function handleSwap(index: number, pictogram: PictogramEntry) {
    setItems((list) =>
      list.map((item, i) =>
        i === index ? { ...item, pictogram, matchType: 'exact' } : item
      )
    );
    setSwapIndex(null);
  }

  // ===== 展示给患者的画面（按程度裁剪）=====
  const matchedItems = items.filter((i): i is MatchedItem => i.pictogram !== null);
  const coreItem = level === 'severe' ? pickCoreItem(matchedItems) : null;
  const otherItems = coreItem
    ? matchedItems.filter((i) => i.uid !== coreItem.uid)
    : matchedItems;

  const speakWord = (word: string) => {
    speak(word, settings).catch((err) => console.error('[Receive] speak word:', err));
  };

  if (phase === 'input') {
    return (
      <View className={styles.page}>
        <View className={styles.header}>
          <View className={styles.title}>接收</View>
          <View className={styles.subtitle}>把想说的话变成图片，展示给患者看</View>
        </View>
        <ScrollView scrollY className={styles.body}>
          <View className={styles.card}>
            <Textarea
              className={styles.input}
              placeholder="输入一句话，例如：今天吃什么"
              value={inputText}
              maxlength={60}
              onInput={(e) => setInputText(e.detail.value)}
            />
            <Button className={styles.btnPrimary} onClick={() => doMatch(inputText)}>
              转换为图片
            </Button>
          </View>
          <View className={styles.sectionTitle}>试试这些</View>
          <View className={styles.chips}>
            {EXAMPLE_PHRASES.map((p) => (
              <View key={p} className={styles.chip} onClick={() => doMatch(p)}>
                <Text>{p}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (phase === 'matching') {
    return (
      <View className={styles.center}>
        <View className={styles.loading} />
        <Text className={styles.loadingText}>正在匹配图符…</Text>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.titleWrap}>
          <View className={styles.title}>图片序列</View>
          <View className={styles.subtitle}>{inputText}</View>
        </View>
        <Button className={styles.btnGhost} onClick={() => setPhase('input')}>
          重输
        </Button>
      </View>

      <ScrollView scrollY className={styles.body}>
        {items.length === 0 ? (
          <View className={styles.empty}>没有匹配到图符，试试其它说法</View>
        ) : (
          items.map((item, index) => (
            <View key={item.uid} className={styles.itemCard}>
              <View className={styles.itemMain}>
                {item.pictogram ? (
                  <>
                    <Image className={styles.itemImg} src={item.pictogram.imageUrl} mode="aspectFit" />
                    <View className={styles.itemInfo}>
                      <View className={styles.itemLabel}>{item.pictogram.labels.zh[0]}</View>
                      <View className={styles.itemToken}>{item.token}</View>
                    </View>
                  </>
                ) : (
                  <View className={styles.itemMissing}>
                    <Text className={styles.itemMissingLabel}>未匹配</Text>
                    <Text className={styles.itemToken}>{item.token}</Text>
                  </View>
                )}
                <Text className={`${styles.badge} ${styles['badge-' + item.matchType]}`}>
                  {MATCH_TYPE_LABEL[item.matchType]}
                </Text>
              </View>
              <View className={styles.itemActions}>
                <Button className={styles.btnMini} onClick={() => moveItem(index, -1)} disabled={index === 0}>
                  ‹
                </Button>
                <Button className={styles.btnMini} onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}>
                  ›
                </Button>
                <Button className={styles.btnMini} onClick={() => setSwapIndex(index)}>
                  换图
                </Button>
                <Button className={`${styles.btnMini} ${styles.btnDanger}`} onClick={() => deleteItem(index)}>
                  删
                </Button>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View className={styles.footer}>
        <Button
          className={styles.btnPrimary}
          disabled={items.filter((i) => i.pictogram).length === 0}
          onClick={openDisplay}
        >
          展示给患者
        </Button>
      </View>

      {swapIndex !== null && (
        <View className={styles.mask} onClick={() => setSwapIndex(null)}>
          <View className={styles.picker} onClick={(e) => e.stopPropagation()}>
            <View className={styles.pickerTitle}>选择图片</View>
            <ScrollView scrollY className={styles.pickerGrid}>
              {swapCandidates.length === 0 && (
                <View className={styles.empty}>没有可选的图符</View>
              )}
              {swapCandidates.map((p) => (
                <View key={p.id} className={styles.pickerCell} onClick={() => handleSwap(swapIndex, p)}>
                  <Image className={styles.pickerImg} src={p.imageUrl} mode="aspectFit" />
                  <Text className={styles.pickerLabel}>{p.labels.zh[0]}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {showDisplay && (
        <View className={styles.displayOverlay}>
          <ScrollView scrollY className={styles.displayScroll}>
            {/* 轻/中度：显示原文（重度不显示文字，仅图片+回答钮） */}
            {level !== 'severe' && (
              <View
                className={
                  level === 'moderate'
                    ? `${styles.displayText} ${styles.displayTextSm}`
                    : styles.displayText
                }
              >
                {inputText}
              </View>
            )}

            {level === 'severe' ? (
              <View className={styles.severeWrap}>
                {coreItem ? (
                  <View
                    className={styles.coreCard}
                    onClick={() => speakWord(coreItem.pictogram.labels.zh[0])}
                  >
                    <Image className={styles.coreImg} src={coreItem.pictogram.imageUrl} mode="aspectFit" />
                    <Text className={styles.coreLabel}>{coreItem.pictogram.labels.zh[0]}</Text>
                  </View>
                ) : (
                  <View className={styles.empty}>没有匹配到图符，试试其它说法</View>
                )}

                {otherItems.length > 0 && (
                  <View className={styles.thumbRow}>
                    {otherItems.map((item) => (
                      <View
                        key={item.uid}
                        className={styles.thumb}
                        onClick={() => speakWord(item.pictogram.labels.zh[0])}
                      >
                        <Image className={styles.thumbImg} src={item.pictogram.imageUrl} mode="aspectFit" />
                      </View>
                    ))}
                  </View>
                )}

                <View className={styles.answerRow}>
                  <View
                    className={`${styles.btnAnswer} ${styles.btnAnswerYes}`}
                    onClick={() => speakWord('是')}
                  >
                    是
                  </View>
                  <View
                    className={`${styles.btnAnswer} ${styles.btnAnswerNo}`}
                    onClick={() => speakWord('不是')}
                  >
                    不是
                  </View>
                </View>
              </View>
            ) : (
              <View className={styles.displaySequence}>
                {matchedItems.map((item) => (
                  <View
                    key={item.uid}
                    className={styles.displayCard}
                    onClick={
                      level === 'moderate'
                        ? () => speakWord(item.pictogram.labels.zh[0])
                        : undefined
                    }
                  >
                    <Image
                      className={level === 'moderate' ? styles.displayImgLg : styles.displayImg}
                      src={item.pictogram.imageUrl}
                      mode="aspectFit"
                    />
                    <Text className={styles.displayLabel}>{item.pictogram.labels.zh[0]}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
          <View className={styles.displayActions}>
            <Button
              className={`${styles.btnPrimary} ${styles.displayBtn}`}
              onClick={() => speak(inputText, settings).catch(() => {})}
            >
              重播
            </Button>
            <Button className={`${styles.btnPrimary} ${styles.displayBtn}`} onClick={handleDone}>
              完成
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

export default ReceivePage;
