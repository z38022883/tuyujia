import { useRef, useState } from 'react';
import { View, Text, Button, Image } from '@tarojs/components';
import type { RehabSession, RehabTaskRecord } from '@/types/rehab';
import {
  REHAB_DIMENSION_LABELS,
  REHAB_TASK_TYPE_LABELS,
  resolveRehabMaterialPictograms
} from '@/data/rehab';
import { useRehabStore } from '@/store/useRehabStore';
import styles from './index.module.scss';

interface Props {
  session: RehabSession;
  onFinish: () => void;
}

/**
 * 任务引擎（框架）：按题型分发渲染、记录作答、推进进度。
 * 题库为空时由训练页兜底展示空态；题库填充后此处自动生效。
 * 各题型的专属交互组件（听词指认/图文配对等）在分级内容阶段逐个接入。
 */
export default function TaskRunner({ session, onFinish }: Props) {
  const recordTaskResult = useRehabStore((s) => s.recordTaskResult);
  const finishSession = useRehabStore((s) => s.finishSession);
  const [index, setIndex] = useState(0);
  const taskStartedAt = useRef(Date.now());

  const current = session.tasks[index];
  const progress =
    session.totalTasks > 0
      ? Math.round(((index + 1) / session.totalTasks) * 100)
      : 0;

  if (!current) {
    // 理论上训练页已兜底空态；此处防御
    return (
      <View className={styles.empty}>
        <Text className={styles.emptyText}>当前没有可执行的训练任务</Text>
      </View>
    );
  }

  const handleTaskDone = (partial?: Partial<RehabTaskRecord>) => {
    const record: RehabTaskRecord = {
      taskId: current.id,
      taskType: current.taskType,
      dimension: current.dimension,
      correct: true,
      rating: 5,
      durationSec: Math.max(1, Math.round((Date.now() - taskStartedAt.current) / 1000)),
      ...partial
    };
    recordTaskResult(record);

    if (index + 1 >= session.totalTasks) {
      finishSession();
      onFinish();
    } else {
      setIndex(index + 1);
      taskStartedAt.current = Date.now();
    }
  };

  const pictograms = resolveRehabMaterialPictograms(
    current.materials.flatMap((m) => m.pictogramIds ?? [])
  );

  return (
    <View className={styles.wrap}>
      <View className={styles.header}>
        <View className={styles.progressBar}>
          <View className={styles.progressInner} style={{ width: `${progress}%` }} />
        </View>
        <Text className={styles.progressText}>
          {index + 1} / {session.totalTasks}
        </Text>
      </View>

      <View className={styles.taskCard}>
        <View className={styles.taskMeta}>
          <Text className={styles.chipType}>
            {REHAB_TASK_TYPE_LABELS[current.taskType]}
          </Text>
          <Text className={styles.chipDim}>
            {REHAB_DIMENSION_LABELS[current.dimension]}
          </Text>
        </View>
        <Text className={styles.taskTitle}>{current.title}</Text>
        <Text className={styles.taskPrompt}>{current.prompt}</Text>

        {current.materials.length > 0 && (
          <View className={styles.materials}>
            {current.materials
              .filter((m) => m.text)
              .map((m, i) => (
                <Text key={`t-${i}`} className={styles.materialText}>
                  {m.text}
                </Text>
              ))}
          </View>
        )}

        {pictograms.length > 0 && (
          <View className={styles.pictoGrid}>
            {pictograms.map((p) => (
              <View key={p.id} className={styles.pictoCell}>
                <Image className={styles.pictoImg} src={p.imageUrl} mode="aspectFit" />
                <Text className={styles.pictoLabel}>{p.labels.zh[0]}</Text>
              </View>
            ))}
          </View>
        )}

        <View className={styles.placeholderNote}>
          本题型组件建设中，当前为框架占位（题库为空时不会出现）
        </View>
      </View>

      <Button
        className={styles.doneBtn}
        onClick={() => handleTaskDone()}
      >
        完成本题（占位）
      </Button>
    </View>
  );
}
