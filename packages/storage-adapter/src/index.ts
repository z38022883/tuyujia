// 图语家跨端存储抽象层
// 各端在 apps/*/src/storage/ 下提供具体实现：
//   - apps/web/src/storage/dexie-storage.ts    (基于 Dexie/IndexedDB)
//   - apps/miniapp/src/storage/wx-storage.ts   (基于 wx.setStorage + 云数据库)

/**
 * 同步存储接口（小数据、偏好、当前会话等）。
 * 对应 Web 端的 localStorage / 小程序的 wx.setStorageSync。
 */
export interface SyncStorage {
  get<T = unknown>(key: string): T | null;
  set<T = unknown>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
}

/**
 * 异步存储接口（结构化数据、表达式、收藏等）。
 * 对应 Web 端的 Dexie / 小程序的云数据库。
 */
export interface AsyncStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  /**
   * 批量获取。小程序单 key 限制 1MB，需要分片时使用。
   */
  bulkGet<T = unknown>(keys: string[]): Promise<(T | null)[]>;
  bulkSet<T = unknown>(entries: Array<[string, T]>): Promise<void>;
}

/**
 * 存储适配器组合。
 * 通过依赖注入在应用启动时注入具体实现。
 */
export interface StorageAdapter {
  sync: SyncStorage;
  async: AsyncStorage;
}

/**
 * 各端注入的全局存储实例（在 App 入口设置）。
 */
let _adapter: StorageAdapter | null = null;

export function setStorageAdapter(adapter: StorageAdapter): void {
  _adapter = adapter;
}

export function getStorageAdapter(): StorageAdapter {
  if (!_adapter) {
    throw new Error(
      'StorageAdapter not initialized. Call setStorageAdapter() at app startup.',
    );
  }
  return _adapter;
}
