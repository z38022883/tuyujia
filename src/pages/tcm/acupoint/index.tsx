import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { TCM_ACUPOINTS, TCM_ACUPOINT_DISCLAIMER } from '@/data/tcm';
import { useTcmStore } from '@/store/useTcmStore';
import styles from './index.module.scss';

type Mode = 'list' | 'guide' | 'done';

function AcupointPage() {
  const { addCheckIn } = useTcmStore();
  const [mode, setMode] = useState<Mode>('list');
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = TCM_ACUPOINTS[index];

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => stopTimer, []);

  const finishAll = (count: number) => {
    stopTimer();
    setDoneCount(count);
    setMode('done');
    const totalSec = TCM_ACUPOINTS.reduce((n, a) => n + a.durationSec, 0);
    const badge = addCheckIn('acupoint', totalSec);
    if (badge) {
      Taro.showToast({ title: `获得勋章：${badge.name} ${badge.emoji}`, icon: 'none', duration: 2500 });
    }
  };

  const startGuide = () => {
    setIndex(0);
    setRemaining(TCM_ACUPOINTS[0].durationSec);
    setMode('guide');
  };

  useEffect(() => {
    if (mode !== 'guide') return;
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev > 1) return prev - 1;
        // 当前穴位结束
        if (index < TCM_ACUPOINTS.length - 1) {
          const nextIndex = index + 1;
          setIndex(nextIndex);
          return TCM_ACUPOINTS[nextIndex].durationSec;
        }
        finishAll(TCM_ACUPOINTS.length);
        return 0;
      });
    }, 1000);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, index]);

  const handleGuideStop = () => {
    const finished = index;
    stopTimer();
    if (finished > 0) {
      finishAll(finished);
    } else {
      setMode('list');
    }
  };

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>穴位按揉</View>
          <View className={styles.subtitle}>按一按，嘴巴说话更轻松</View>
        </View>

        {mode === 'list' && (
          <>
            <View className={styles.section}>
              <View className={styles.noticeCard}>
                <Text className={styles.noticeText}>{TCM_ACUPOINT_DISCLAIMER}</Text>
              </View>
            </View>

            <View className={styles.section}>
              <View className={styles.sectionTitle}>安全穴位</View>
              {TCM_ACUPOINTS.map((a) => (
                <View key={a.id} className={styles.acuCard}>
                  <View className={styles.acuHead}>
                    <View className={styles.acuIcon}>
                      <Text className={styles.acuEmoji}>{a.emoji}</Text>
                    </View>
                    <View className={styles.acuNameWrap}>
                      <Text className={styles.acuName}>{a.name}</Text>
                      <Text className={styles.acuDuration}>约 {a.durationSec} 秒</Text>
                    </View>
                  </View>
                  <View className={styles.acuRows}>
                    <View className={styles.acuRow}>
                      <Text className={styles.acuLabel}>在哪里</Text>
                      <Text className={styles.acuValue}>{a.location}</Text>
                    </View>
                    <View className={styles.acuRow}>
                      <Text className={styles.acuLabel}>怎么按</Text>
                      <Text className={styles.acuValue}>{a.method}</Text>
                    </View>
                    <View className={styles.acuRow}>
                      <Text className={styles.acuLabel}>多大力</Text>
                      <Text className={styles.acuValue}>{a.pressure}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View className={styles.section}>
              <View className={styles.btnPrimary} onClick={startGuide}>
                跟着节奏按一按
              </View>
              <Text className={styles.btnHint}>跟着动画节奏点按，完成可领小勋章</Text>
            </View>
          </>
        )}

        {mode === 'guide' && current && (
          <View className={styles.section}>
            <View className={styles.guideCard}>
              <View className={styles.guideStep}>
                第 {index + 1} / {TCM_ACUPOINTS.length} 个 · {current.name}
              </View>
              <View className={styles.guideCircleWrap}>
                <View className={styles.guidePulse}>
                  <Text className={styles.guideEmoji}>{current.emoji}</Text>
                </View>
              </View>
              <Text className={styles.guideCountdown}>{remaining}s</Text>
              <Text className={styles.guideMethod}>{current.method}</Text>
              <Text className={styles.guidePressure}>{current.pressure}</Text>
              <View className={styles.btnGhost} onClick={handleGuideStop}>
                结束本次按揉
              </View>
            </View>
          </View>
        )}

        {mode === 'done' && (
          <View className={styles.section}>
            <View className={styles.doneCard}>
              <Text className={styles.doneEmoji}>🎉</Text>
              <View className={styles.doneTitle}>完成按揉，打卡成功！</View>
              <Text className={styles.doneMeta}>
                本次完成 {doneCount} 个穴位，坚持每天按一按
              </Text>
              <View
                className={classnames(styles.btnPrimary, styles.doneBtn)}
                onClick={() => setMode('list')}
              >
                返回
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default AcupointPage;
