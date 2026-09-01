import { useEffect } from 'react';
import { View, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import EmptyState from '@/components/EmptyState';
import TaskRunner from '@/components/TaskRunner';
import { useRehabStore } from '@/store/useRehabStore';
import styles from './index.module.scss';

function TrainingPage() {
  const { activeSession, loadLocalData } = useRehabStore();

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  // 已完成的会话：跳转结果页
  useEffect(() => {
    if (activeSession?.finishedAt) {
      Taro.redirectTo({ url: '/pages/rehab/result/index' });
    }
  }, [activeSession]);

  if (!activeSession) {
    return (
      <View className={styles.wrap}>
        <EmptyState
          icon="🧩"
          title="还没有开始训练"
          desc="请先从康复首页选择等级并开始训练"
        />
        <Button className={styles.btn} onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </View>
    );
  }

  // 已完成的会话交给结果页，避免重复训练
  if (activeSession.finishedAt) {
    return null;
  }

  if (activeSession.tasks.length === 0) {
    return (
      <View className={styles.wrap}>
        <EmptyState
          icon="🛠️"
          title="题库建设中"
          desc="分级题库完善后，这里会自动生成训练任务"
        />
        <Button className={styles.btn} onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <TaskRunner
        session={activeSession}
        onFinish={() => Taro.redirectTo({ url: '/pages/rehab/result/index' })}
      />
    </View>
  );
}

export default TrainingPage;
