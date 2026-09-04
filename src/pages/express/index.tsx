import { useEffect, useState } from 'react';
import { View, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/useAppStore';
import { useProfileStore } from '@/store/useProfileStore';
import PictogramGrid from '@/components/PictogramGrid';
import SelectionTray from '@/components/SelectionTray';
import CandidatePanel from '@/components/CandidatePanel';
import PlaybackOverlay from '@/components/PlaybackOverlay';
import styles from './index.module.scss';

function ExpressPage() {
  const selectedPictograms = useAppStore((s) => s.selectedPictograms);
  const saveCurrentAsPhrase = useAppStore((s) => s.saveCurrentAsPhrase);
  const severity = useProfileStore((s) => s.profile?.severity ?? null);
  const [fullMode, setFullMode] = useState(false);

  // 程度变化时退出完整图库模式（避免档位错乱）
  useEffect(() => {
    setFullMode(false);
  }, [severity]);

  const level = severity ?? 'mild';
  const severeAdaptive = level === 'severe' && !fullMode;
  const moderateAdaptive = level === 'moderate' && !fullMode;

  const subtitle = severeAdaptive
    ? '点一下，说出整句'
    : moderateAdaptive
      ? '点常用词，连成句子'
      : '点选图符，说出你想说的话';

  const handleSavePhrase = () => {
    if (!selectedPictograms.length) {
      Taro.showToast({ title: '请先组句', icon: 'none' });
      return
    }
    // store 内 saveCurrentAsPhrase 已负责同步云端，这里只保留本地保存与提示
    if (saveCurrentAsPhrase()) {
      Taro.showToast({ title: '已收藏', icon: 'success' })
    }
  }

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.titleWrap}>
          <View className={styles.title}>图语家</View>
          <View className={styles.subtitle}>{subtitle}</View>
        </View>
        <View className={styles.headerActions}>
          {/* 中度/重度的「更多词」门：进入/退出完整图库 */}
          {level !== 'mild' && (
            <Button className={styles.btnGhost} onClick={() => setFullMode(!fullMode)}>
              {fullMode ? '返回词板' : '更多词'}
            </Button>
          )}
          {!severeAdaptive && (
            <Button className={styles.btnSave} onClick={handleSavePhrase}>
              ⭐ 收藏
            </Button>
          )}
        </View>
      </View>

      {/* 重度简易词板无句条（点词直接朗读整句）；完整图库模式恢复句条 */}
      {!severeAdaptive && (
        <View className={styles.trayWrap}>
          <SelectionTray simple={moderateAdaptive} />
        </View>
      )}

      <PictogramGrid full={fullMode} />

      <CandidatePanel />
      <PlaybackOverlay />
    </View>
  )
}

export default ExpressPage
