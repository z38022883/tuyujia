import { View, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAppStore } from '@/store/useAppStore'
import PictogramGrid from '@/components/PictogramGrid'
import SelectionTray from '@/components/SelectionTray'
import CandidatePanel from '@/components/CandidatePanel'
import PlaybackOverlay from '@/components/PlaybackOverlay'
import styles from './index.module.scss'

function ExpressPage() {
  const selectedPictograms = useAppStore((s) => s.selectedPictograms)
  const saveCurrentAsPhrase = useAppStore((s) => s.saveCurrentAsPhrase)

  const handleSavePhrase = () => {
    if (!selectedPictograms.length) {
      Taro.showToast({ title: '请先组句', icon: 'none' })
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
          <View className={styles.subtitle}>点选图符，说出你想说的话</View>
        </View>
        <Button className={styles.btnSave} onClick={handleSavePhrase}>
          ⭐ 收藏
        </Button>
      </View>

      <View className={styles.trayWrap}>
        <SelectionTray />
      </View>

      <PictogramGrid />

      <CandidatePanel />
      <PlaybackOverlay />
    </View>
  )
}

export default ExpressPage
