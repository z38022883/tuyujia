import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/useAppStore';
import { useRehabStore } from '@/store/useRehabStore';
import { useProfileStore } from '@/store/useProfileStore';
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
    // 从本地存储恢复数据（患者程度档案 / 设置 / 表达 / 收藏 / 康复训练）
    useProfileStore.getState().load();
    useAppStore.getState().loadLocalData();
    useRehabStore.getState().loadLocalData();
  }, []);

  return props.children;
}

export default App;
