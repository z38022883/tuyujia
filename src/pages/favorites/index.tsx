import { useEffect, useState } from 'react';
import { View, ScrollView, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/useAppStore';
import { speak } from '@/services/tts';
import { callFunction } from '@/services/cloud';
import { getPictogramsByIds } from '@/data';
import EmptyState from '@/components/EmptyState';
import type { SavedPhrase } from '@/types';
import styles from './index.module.scss';

/** 将云数据库文档（_id）映射为前端类型（id） */
function normalizePhrase(raw: any): SavedPhrase {
  const { _id, _openid, ...rest } = raw;
  return { id: _id || rest.id, ...rest } as SavedPhrase;
}

function FavoritesPage() {
  const { savedPhrases, settings, deletePhrase, setSavedPhrases } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callFunction<{ phrases: SavedPhrase[] }>('getSavedPhrases')
      .then((res) => {
        if (!res) return; // H5 预览模式跳过
        const local = useAppStore.getState().savedPhrases;
        const cloudList = (res.phrases || []).map(normalizePhrase);
        const localIds = new Set(local.map((p) => p.id));
        const merged = [...local, ...cloudList.filter((p) => !localIds.has(p.id))];
        setSavedPhrases(merged);
      })
      .catch((err) => console.error('[Favorites] load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSpeak = (phrase: SavedPhrase) => {
    speak(phrase.sentence, settings).catch((err) =>
      console.error('[Favorites] speak:', err)
    );
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除收藏',
      content: '确定删除这条收藏吗？',
      success: (res) => {
        if (res.confirm) {
          // store 内 deletePhrase 已负责同步云端，这里只做本地删除
          deletePhrase(id);
        }
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.title}>收藏短语</View>
        <View className={styles.count}>{savedPhrases.length} 条</View>
      </View>
      <ScrollView scrollY className={styles.list}>
        {loading && savedPhrases.length === 0 ? (
          <View className={styles.loading}>加载中...</View>
        ) : savedPhrases.length === 0 ? (
          <EmptyState icon="⭐" title="还没有收藏" desc="在表达页组句后点击「收藏」" />
        ) : (
          savedPhrases.map((p) => (
            <View key={p.id} className={styles.card}>
              <View className={styles.cardMain} onClick={() => handleSpeak(p)}>
                <View className={styles.emojis}>
                  {getPictogramsByIds(p.pictogramIds).map((pic, i) => (
                    <Text key={i} className={styles.emoji}>
                      {pic.labels.zh[0]}
                    </Text>
                  ))}
                </View>
                <View className={styles.text}>{p.sentence}</View>
              </View>
              <View className={styles.cardActions}>
                <Button className={styles.btnSpeak} onClick={() => handleSpeak(p)}>
                  朗读
                </Button>
                <Button className={styles.btnDelete} onClick={() => handleDelete(p.id)}>
                  删除
                </Button>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default FavoritesPage;
