import { useEffect, useRef, useState, type ComponentType } from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { RehabSession, RehabTaskRecord, RehabTaskType } from '@/types/rehab';
import {
  REHAB_DIMENSION_LABELS,
  REHAB_TASK_TYPE_LABELS
} from '@/data/rehab';
import { useRehabStore } from '@/store/useRehabStore';
import PickTask from '@/components/rehab/PickTask';
import MatchPairTask from '@/components/rehab/MatchPairTask';
import InstructionTask from '@/components/rehab/InstructionTask';
import StarRatedTask from '@/components/rehab/StarRatedTask';
import CategorizeTask from '@/components/rehab/CategorizeTask';
import ReadingTask from '@/components/rehab/ReadingTask';
import TraceCharTask from '@/components/rehab/TraceCharTask';
import ScriptTask from '@/components/rehab/ScriptTask';
import type { TaskBodyProps } from '@/components/rehab/types';
import styles from './index.module.scss';

/** 题型 → 交互组件分发表（星级题共用 StarRatedTask 泛型骨架） */
const TASK_COMPONENTS: Record<RehabTaskType, ComponentType<TaskBodyProps>> = {
  'pick-from-pictograms': PickTask,
  'match-pair': MatchPairTask,
  'instruction-check': InstructionTask,
  'follow-read': StarRatedTask,
  'describe-picture': StarRatedTask,
  'listen-recall': StarRatedTask,
  'idiom-read': StarRatedTask,
  'melody-hum': StarRatedTask,
  categorize: CategorizeTask,
  'reading-comprehension': ReadingTask,
  'trace-char': TraceCharTask,
  'script-dialogue': ScriptTask
};

interface Props {
  session: RehabSession;
  onFinish: () => void;
}

/**
 * 任务引擎：按题型分发渲染、记录作答、推进进度。
 * - 任务级断点续训：初始 index = session.completedTasks（作答记录数），
 *   中途退出的会话恢复后从第一道未作答题继续。
 * - 等级展示适配：重度加大题干字号（组件内另有各自的 lg 样式）。
 */
export default function TaskRunner({ session, onFinish }: Props) {
  const recordTaskResult = useRehabStore((s) => s.recordTaskResult);
  const finishSession = useRehabStore((s) => s.finishSession);
  // 任务级断点续训：已完成几题就从第几题继续
  const [index, setIndex] = useState(session.completedTasks);
  const taskStartedAt = useRef(Date.now());

  useEffect(() => {
    taskStartedAt.current = Date.now();
  }, [index]);

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
      durationSec: Math.max(1, Math.round((Date.now() - taskStartedAt.current) / 1000)),
      ...partial
    };
    recordTaskResult(record);

    if (index + 1 >= session.totalTasks) {
      finishSession();
      onFinish();
    } else {
      setIndex(index + 1);
    }
  };

  const Body = TASK_COMPONENTS[current.taskType];

  return (
    <View
      className={classnames(
        styles.wrap,
        session.level === 'severe' && styles.wrapSevere
      )}
    >
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

        <Body
          key={current.id}
          task={current}
          level={session.level}
          onDone={handleTaskDone}
        />
      </View>
    </View>
  );
}
