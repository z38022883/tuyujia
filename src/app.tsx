// ===== 应用入口：初始化云开发；启动时从本地存储恢复程度档案、用户账号、表达/收藏、康复训练数据 =====
import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/useAppStore';
import { useRehabStore } from '@/store/useRehabStore';
import { useProfileStore } from '@/store/useProfileStore';
import { useUserStore } from '@/store/useUserStore';
import { prewarmTts } from '@/services/tts';
import { bootstrapCloudSync } from '@/services/bootstrapSync';
import { SEVERE_EXPRESS_WORDS } from '@/data/boards';
import './app.scss';

function App(props) {
  useEffect(() => {
    // 初始化云开发（仅微信端）
    // 环境 ID 在构建期注入（TARO_APP_CLOUD_ENV 环境变量，见 config/index.ts 与 types/global.d.ts）
    if (process.env.TARO_ENV === 'weapp') {
      try {
        Taro.cloud.init({ env: process.env.TARO_APP_CLOUD_ENV || '', traceUser: true });
        console.info('[App] cloud init ok');
      } catch (err) {
        console.error('[App] cloud init failed:', err);
      }
    }
    // 从本地存储恢复数据（患者程度档案 / 用户账号 / 设置 / 表达 / 收藏 / 康复训练）
    useProfileStore.getState().load();
    useUserStore.getState().load();
    useAppStore.getState().loadLocalData();
    useRehabStore.getState().loadLocalData();

    // 后台拉取云端账号数据（康复/评估/打卡/档案，换设备恢复），不阻塞首屏
    if (process.env.TARO_ENV === 'weapp') {
      void bootstrapCloudSync();
    }

    // 启动 4 秒后后台预热语音：预合成重度词板预设整句 + 预热云函数冷启动（不阻塞首屏）
    if (process.env.TARO_ENV === 'weapp') {
      setTimeout(() => {
        prewarmTts(
          SEVERE_EXPRESS_WORDS.map((w) => w.phrase).filter((p): p is string => Boolean(p)),
          useAppStore.getState().settings
        );
      }, 4000);
    }
  }, []);

  return props.children;
}

export default App;
