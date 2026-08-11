import { useEffect } from 'react';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store/useAppStore';
import './app.scss';

function App(props) {
  useEffect(() => {
    // 初始化云开发（仅微信端）
    if (process.env.TARO_ENV === 'weapp') {
      try {
        Taro.cloud.init({ env: '', traceUser: true });
        console.info('[App] cloud init ok');
      } catch (err) {
        console.error('[App] cloud init failed:', err);
      }
    }
    // 从本地存储恢复数据（设置 / 表达 / 收藏）
    useAppStore.getState().loadLocalData();
  }, []);

  return props.children;
}

export default App;
