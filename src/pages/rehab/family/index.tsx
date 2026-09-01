import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { REHAB_FAMILY_GUIDES, REHAB_LEVELS } from '@/data/rehab';
import type { RehabLevel } from '@/types/rehab';
import styles from './index.module.scss';

function FamilyPage() {
  const [level, setLevel] = useState<RehabLevel>('severe');
  const guide = REHAB_FAMILY_GUIDES[level];

  return (
    <View className={styles.page}>
      <View className={styles.tabs}>
        {REHAB_LEVELS.map((m) => (
          <View
            key={m.key}
            className={classnames(
              styles.tab,
              level === m.key && styles.tabActive
            )}
            onClick={() => setLevel(m.key)}
          >
            {m.label}失语
          </View>
        ))}
      </View>

      <ScrollView scrollY className={styles.body}>
        <View className={styles.card}>
          <Text className={styles.title}>{guide.title}</Text>
          {guide.points.map((p, i) => (
            <View key={i} className={styles.point}>
              <Text className={styles.pointDot}>•</Text>
              <Text className={styles.pointText}>{p}</Text>
            </View>
          ))}
        </View>
        <Text className={styles.disclaimer}>
          以上内容整理自 docs/2.txt 分级康复方案，供家庭参考，不构成医疗建议。
        </Text>
      </ScrollView>
    </View>
  );
}

export default FamilyPage;
