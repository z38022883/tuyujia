import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { TCM_BREATH_PHASES, TCM_RELAX_PACKS, getRandomWarmTip } from '@/data/tcm';
import type { TcmRelaxPack } from '@/types/tcm';
import { useTcmStore } from '@/store/useTcmStore';
import styles from './index.module.scss';

type Mode = 'list' | 'practice' | 'done';

const CATEGORY_LABELS: Record<TcmRelaxPack['category'], string> = {
  soothe: '舒缓',
  calm: '安神'
};

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
}

function MusicPage() {
  const { addCheckIn } = useTcmStore();
  const [mode, setMode] = useState<Mode>('list');
  const [pack, setPack] = useState<TcmRelaxPack | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseLeft, setPhaseLeft] = useState(0);
  const [tip] = useState(() => getRandomWarmTip());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = TCM_BREATH_PHASES[phaseIndex];

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => stopTimer, []);

  useEffect(() => {
    if (mode !== 'practice') return;
    // 每秒心跳：总倒计时 + 呼吸阶段推进
    timerRef.current = setInterval(() => {
      setRemaining((prevTotal) => {
        if (prevTotal <= 1) {
          // 完成
          stopTimer();
          setMode('done');
          const badge = addCheckIn('relax', pack?.durationSec ?? 0);
          if (badge) {
            Taro.showToast({
              title: `获得勋章：${badge.name} ${badge.emoji}`,
              icon: 'none',
              duration: 2500
            });
          }
          return 0;
        }
        return prevTotal - 1;
      });
      setPhaseLeft((prev) => {
        if (prev > 1) return prev - 1;
        setPhaseIndex((pi) => (pi + 1) % TCM_BREATH_PHASES.length);
        return TCM_BREATH_PHASES[(phaseIndex + 1) % TCM_BREATH_PHASES.length].durationSec;
      });
    }, 1000);
    return stopTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phaseIndex]);

  const startPack = (p: TcmRelaxPack) => {
    setPack(p);
    setRemaining(p.durationSec);
    setPhaseIndex(0);
    setPhaseLeft(TCM_BREATH_PHASES[0].durationSec);
    setMode('practice');
  };

  const handleStop = () => {
    stopTimer();
    setMode('list');
  };

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>音乐调息</View>
          <View className={styles.subtitle}>跟着呼吸慢慢放松，训练前做一做更轻松</View>
        </View>

        {mode === 'list' && (
          <>
            <View className={styles.section}>
              <View className={styles.sectionTitle}>放松套餐</View>
              <View className={styles.packGrid}>
                {TCM_RELAX_PACKS.map((p) => (
                  <View
                    key={p.id}
                    className={styles.packCard}
                    hoverClass={styles.packCardActive}
                    onClick={() => startPack(p)}
                  >
                    <View className={styles.packHead}>
                      <Text className={styles.packEmoji}>{p.emoji}</Text>
                      <Text
                        className={classnames(
                          styles.packTag,
                          p.category === 'calm' ? styles.packTagCalm : styles.packTagSoothe
                        )}
                      >
                        {CATEGORY_LABELS[p.category]}
                      </Text>
                    </View>
                    <View className={styles.packName}>{p.name}</View>
                    <View className={styles.packDesc}>{p.desc}</View>
                    <View className={styles.packDuration}>{formatSec(p.durationSec)}</View>
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.section}>
              <View className={styles.tipCard}>
                <Text className={styles.tipQuote}>“</Text>
                <Text className={styles.tipText}>{tip}</Text>
              </View>
            </View>
          </>
        )}

        {mode === 'practice' && pack && (
          <View className={styles.section}>
            <View className={styles.practiceCard}>
              <View className={styles.practicePack}>
                {pack.emoji} {pack.name} · 剩余 {formatSec(remaining)}
              </View>
              <View className={styles.breathWrap}>
                <View
                  className={classnames(
                    styles.breathCircle,
                    phase.key === 'inhale' && styles.breathInhale,
                    phase.key === 'hold' && styles.breathHold,
                    phase.key === 'exhale' && styles.breathExhale
                  )}
                >
                  <Text className={styles.breathPhase}>{phase.label}</Text>
                </View>
              </View>
              <Text className={styles.breathCount}>{phaseLeft}s</Text>
              <Text className={styles.breathHint}>想象圆圆的气球，跟着它一起呼吸</Text>
              <View className={styles.btnGhost} onClick={handleStop}>
                结束练习
              </View>
            </View>
          </View>
        )}

        {mode === 'done' && pack && (
          <View className={styles.section}>
            <View className={styles.doneCard}>
              <Text className={styles.doneEmoji}>🎐</Text>
              <View className={styles.doneTitle}>调息完成，打卡成功！</View>
              <Text className={styles.doneMeta}>
                完成「{pack.name}」，感觉放松一点了吗？
              </Text>
              <View className={styles.btnPrimary} onClick={() => setMode('list')}>
                返回
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default MusicPage;
