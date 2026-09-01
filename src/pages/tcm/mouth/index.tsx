import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { TCM_MOUTH_EXERCISES, TCM_MOUTH_NOTE } from '@/data/tcm';
import { useTcmStore } from '@/store/useTcmStore';
import styles from './index.module.scss';

type Mode = 'list' | 'done';

function MouthPage() {
  const { addCheckIn } = useTcmStore();
  const [mode, setMode] = useState<Mode>('list');
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);

  const exercise = TCM_MOUTH_EXERCISES[current];
  const isLast = current >= TCM_MOUTH_EXERCISES.length - 1;
  const progress = Math.round(((current + 1) / TCM_MOUTH_EXERCISES.length) * 100);

  const finish = (doneIds: string[]) => {
    setMode('done');
    const badge = addCheckIn('mouth', TCM_MOUTH_EXERCISES.length * 30);
    if (badge) {
      Taro.showToast({ title: `获得勋章：${badge.name} ${badge.emoji}`, icon: 'none', duration: 2500 });
    }
    setCompleted(doneIds);
  };

  const handleDone = () => {
    const nextDone = [...completed, exercise.id];
    setCompleted(nextDone);
    if (isLast) {
      finish(nextDone);
    } else {
      setCurrent(current + 1);
    }
  };

  const handleSkip = () => {
    const nextSkipped = [...skipped, exercise.id];
    setSkipped(nextSkipped);
    if (isLast) {
      finish(completed);
    } else {
      setCurrent(current + 1);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setCompleted([]);
    setSkipped([]);
    setMode('list');
  };

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>嘴巴小练习</View>
          <View className={styles.subtitle}>舌头和嘴巴做做操，说话更利索</View>
        </View>

        {mode === 'list' && exercise && (
          <>
            <View className={styles.section}>
              <View className={styles.noteCard}>
                <Text className={styles.noteText}>{TCM_MOUTH_NOTE}</Text>
              </View>
            </View>

            <View className={styles.section}>
              <View className={styles.stepsRow}>
                {TCM_MOUTH_EXERCISES.map((e, i) => (
                  <View
                    key={e.id}
                    className={classnames(
                      styles.stepDot,
                      i < current && styles.stepDone,
                      i === current && styles.stepActive,
                      skipped.includes(e.id) && styles.stepSkipped
                    )}
                  />
                ))}
                <Text className={styles.stepCount}>
                  {current + 1} / {TCM_MOUTH_EXERCISES.length}
                </Text>
              </View>

              <View className={styles.exerciseCard}>
                <View className={styles.exerciseIcon}>
                  <Text className={styles.exerciseEmoji}>{exercise.emoji}</Text>
                </View>
                <View className={styles.exerciseName}>{exercise.name}</View>
                <Text className={styles.exerciseInstruction}>{exercise.instruction}</Text>
                <Text className={styles.exerciseReps}>{exercise.reps}</Text>

                <View className={styles.btnPrimary} onClick={handleDone}>
                  {isLast ? '做完了' : '完成，下一个'}
                </View>
                <View className={styles.btnGhost} onClick={handleSkip}>
                  {isLast ? '跳过并结束' : '跳过这个'}
                </View>
              </View>
            </View>

            <View className={styles.section}>
              <View className={styles.progressCard}>
                <View className={styles.progressLabelRow}>
                  <Text className={styles.progressLabel}>整体进度</Text>
                  <Text className={styles.progressValue}>{progress}%</Text>
                </View>
                <View className={styles.progressTrack}>
                  <View className={styles.progressFill} style={{ width: `${progress}%` }} />
                </View>
              </View>
            </View>
          </>
        )}

        {mode === 'done' && (
          <View className={styles.section}>
            <View className={styles.doneCard}>
              <Text className={styles.doneEmoji}>👏</Text>
              <View className={styles.doneTitle}>练习完成，打卡成功！</View>
              <Text className={styles.doneMeta}>
                本次完成 {completed.length} 个动作
                {skipped.length > 0 ? `，跳过 ${skipped.length} 个` : ''}
                ，休息一下，下次继续
              </Text>
              <View className={styles.btnPrimary} onClick={handleRestart}>
                再来一轮
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default MouthPage;
