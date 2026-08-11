import { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/useAppStore';
import { speak } from '@/services/tts';
import { callFunction } from '@/services/cloud';
import EmptyState from '@/components/EmptyState';
import type { Expression } from '@/types';
import styles from './index.module.scss';

interface Group {
  label: string;
  items: Expression[];
}

function groupByDate(list: Expression[]): Group[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - 86400000);
  const groups: Group[] = [
    { label: '今天', items: [] },
    { label: '昨天', items: [] },
    { label: '更早', items: [] }
  ];
  for (const item of list) {
    const d = new Date(item.createdAt);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups[0].items.push(item);
    else if (d.getTime() === yesterday.getTime()) groups[1].items.push(item);
    else groups[2].items.push(item);
  }
  return groups.filter((g) => g.items.length > 0);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** 将云数据库文档（_id）映射为前端类型（id） */
function normalizeExpression(raw: any): Expression {
  const { _id, _openid, ...rest } = raw;
  return { id: _id || rest.id, ...rest } as Expression;
}

function HistoryPage() {
  const { expressions, settings, deleteExpression, setExpressions } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callFunction<{ expressions: Expression[] }>('getExpressions')
      .then((res) => {
        if (!res) return; // H5 预览模式跳过
        const local = useAppStore.getState().expressions;
        const cloudList = (res.expressions || []).map(normalizeExpression);
        const localIds = new Set(local.map((e) => e.id));
        const merged = [...local, ...cloudList.filter((e) => !localIds.has(e.id))];
        merged.sort((a, b) => b.createdAt - a.createdAt);
        setExpressions(merged);
      })
      .catch((err) => console.error('[History] load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => groupByDate(expressions), [expressions]);

  const handleSpeak = (item: Expression) => {
    speak(item.selectedSentence || '', settings).catch((err) =>
      console.error('[History] speak:', err)
    );
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除记录',
      content: '确定删除这条表达记录吗？',
      success: (res) => {
        if (res.confirm) deleteExpression(id);
      }
    });
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.title}>表达历史</View>
        <View className={styles.count}>{expressions.length} 条</View>
      </View>
      <ScrollView scrollY className={styles.list}>
        {loading && expressions.length === 0 ? (
          <View className={styles.loading}>加载中...</View>
        ) : expressions.length === 0 ? (
          <EmptyState icon="🕐" title="还没有表达记录" desc="在表达页朗读后会自动记录" />
        ) : (
          groups.map((g) => (
            <View key={g.label}>
              <View className={styles.groupLabel}>{g.label}</View>
              {g.items.map((item) => (
                <View key={item.id} className={styles.card}>
                  <View className={styles.cardMain} onClick={() => handleSpeak(item)}>
                    <View className={styles.row}>
                      <Text className={styles.text}>{item.selectedSentence}</Text>
                      <Text className={styles.time}>{formatTime(item.createdAt)}</Text>
                    </View>
                    <View className={styles.emojis}>
                      {(item.pictogramLabels || []).map((label, i) => (
                        <Text key={i} className={styles.emoji}>
                          {label}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <View className={styles.cardActions}>
                    <Button className={styles.btnSpeak} onClick={() => handleSpeak(item)}>
                      朗读
                    </Button>
                    <Button className={styles.btnDelete} onClick={() => handleDelete(item.id)}>
                      删除
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default HistoryPage;
