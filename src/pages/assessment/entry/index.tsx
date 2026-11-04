// ===== 评估录入页：照护者录入评估结果（AQ 分/档位/四维分/备注）→ 新增评估记录并写入程度档案 =====
import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Input, Textarea, Picker, Slider } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { AQ_MAX, severityFromAq } from '@/types/assessment';
import { REHAB_LEVELS } from '@/data/rehab-meta';
import type { PatientSeverity } from '@/types/profile';
import styles from './index.module.scss';

const DIM_FIELDS = [
  { key: 'listening', label: '听理解', hint: '听指令、听词指图' },
  { key: 'speaking', label: '口语表达', hint: '命名、复述、对话' },
  { key: 'reading', label: '阅读', hint: '识字、读短句短文' },
  { key: 'writing', label: '书写', hint: '临摹、听写、书写' }
] as const;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function AssessmentEntryPage() {
  const { addAssessment, load } = useAssessmentStore();

  const [date, setDate] = useState(todayStr());
  const [aqText, setAqText] = useState('');
  const [manualSeverity, setManualSeverity] = useState<PatientSeverity | null>(null);
  const [dims, setDims] = useState<Record<(typeof DIM_FIELDS)[number]['key'], number>>({
    listening: 50,
    speaking: 50,
    reading: 50,
    writing: 50
  });
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  // AQ 实时换算：非法区间提示；空值回退手动选档
  const aq = useMemo(() => {
    const t = aqText.trim();
    if (!t) return null;
    const v = Number(t);
    return Number.isFinite(v) ? v : null;
  }, [aqText]);
  const aqInvalid = aq !== null && (aq < 0 || aq > AQ_MAX);
  const converted: PatientSeverity | null = useMemo(() => {
    if (aq === null || aqInvalid) return null;
    return severityFromAq(aq);
  }, [aq, aqInvalid]);
  const severity: PatientSeverity | null = converted ?? manualSeverity;
  const canSubmit = severity !== null && !aqInvalid && !submitting;

  const handleAqInput = (v: string) => {
    // 仅允许数字与小数点
    const cleaned = v.replace(/[^\d.]/g, '');
    setAqText(cleaned);
    if (cleaned) setManualSeverity(null);
  };

  const handleSubmit = () => {
    if (!severity) return;
    setSubmitting(true);
    const [y, m, d] = date.split('-').map(Number);
    addAssessment({
      aqScore: converted !== null ? aq! : undefined,
      severity,
      dimensions: { ...dims },
      assessedAt: new Date(y, m - 1, d).getTime(),
      note: note.trim() || undefined,
      source: 'manual-entry'
    });
    Taro.showToast({ title: '评估已录入，训练等级已更新', icon: 'none', duration: 1800 });
    setTimeout(() => Taro.navigateBack(), 900);
  };

  return (
    <View className={styles.page}>
      <ScrollView scrollY className={styles.body}>
        <View className={styles.header}>
          <View className={styles.title}>评估录入</View>
          <View className={styles.subtitle}>
            录入医院评估结果（如 WAB 失语商 AQ），训练等级与出题重点自动跟随
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>评估信息</View>
          <View className={styles.card}>
            <Picker
              mode="date"
              value={date}
              end={todayStr()}
              onChange={(e) => setDate(e.detail.value)}
            >
              <View className={styles.formRow}>
                <Text className={styles.formLabel}>评估日期</Text>
                <Text className={styles.formValue}>{date}</Text>
                <Text className={styles.formArrow}>›</Text>
              </View>
            </Picker>
            <View className={styles.divider} />
            <View className={styles.aqBlock}>
              <View className={styles.aqHead}>
                <Text className={styles.formLabel}>AQ 失语商</Text>
                <Text className={styles.aqOptional}>选填</Text>
              </View>
              <View className={styles.aqInputWrap}>
                <Input
                  className={styles.aqInput}
                  type="digit"
                  placeholder={`0~${AQ_MAX}，如 45.2`}
                  placeholderClass={styles.aqPlaceholder}
                  value={aqText}
                  onInput={(e) => handleAqInput(e.detail.value)}
                />
                <Text className={styles.aqUnit}>分</Text>
              </View>
            </View>
            <Text className={styles.formHint}>
              {aqInvalid
                ? `请输入 0~${AQ_MAX} 之间的数值`
                : aqText.trim() && converted
                  ? `已换算档位：${REHAB_LEVELS.find((m) => m.key === converted)?.label}（${REHAB_LEVELS.find((m) => m.key === converted)?.aqRange}）`
                  : '不知道 AQ 分？可留空，直接在下方选档位'}
            </Text>
            <View className={styles.levelChips}>
              {REHAB_LEVELS.map((m) => {
                const locked = converted !== null && converted !== m.key;
                return (
                  <View
                    key={m.key}
                    className={classnames(
                      styles.levelChip,
                      severity === m.key && styles.levelChipActive,
                      locked && styles.levelChipLocked
                    )}
                    onClick={() => {
                      if (converted !== null) return; // 有 AQ 时档位由换算决定
                      setManualSeverity(m.key);
                    }}
                  >
                    {m.label}
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>
            四维得分（0~100，越高越好，选填）
          </View>
          <View className={styles.card}>
            {DIM_FIELDS.map((f, i) => (
              <View key={f.key}>
                {i > 0 && <View className={styles.divider} />}
                <View className={styles.dimRow}>
                  <View className={styles.dimHead}>
                    <Text className={styles.formLabel}>{f.label}</Text>
                    <Text className={styles.dimScore}>{dims[f.key]}</Text>
                  </View>
                  <Text className={styles.dimHint}>{f.hint}</Text>
                  <Slider
                    className={styles.dimSlider}
                    min={0}
                    max={100}
                    step={5}
                    value={dims[f.key]}
                    activeColor="#4a9c6e"
                    blockSize={26}
                    onChange={(e) =>
                      setDims((prev) => ({ ...prev, [f.key]: e.detail.value }))
                    }
                  />
                </View>
              </View>
            ))}
            <Text className={styles.formHint}>
              填写后康复训练将按短板加权出题（分数越低的维度练得越多）
            </Text>
          </View>
        </View>

        <View className={styles.section}>
          <View className={styles.sectionTitle}>备注（选填）</View>
          <View className={styles.card}>
            <Textarea
              className={styles.noteArea}
              placeholder="如：市一院康复科 WAB 量表；出院后第一次评估…"
              maxlength={120}
              value={note}
              onInput={(e) => setNote(e.detail.value)}
            />
          </View>
        </View>

        <View className={styles.section}>
          <View
            className={classnames(styles.btnPrimary, !canSubmit && styles.btnDisabled)}
            onClick={handleSubmit}
          >
            {submitting ? '已保存 ✓' : severity ? `保存并设为${REHAB_LEVELS.find((m) => m.key === severity)?.label}档` : '请先选择档位'}
          </View>
          <Text className={styles.saveNote}>
            保存后立即生效：康复训练等级、出题维度同步更新，可在 我的→患者程度 查看
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

export default AssessmentEntryPage;
