# 收藏/历史随账号走：康复、评估、打卡、档案接入云同步

## Context

目标：换设备（换手机/重装小程序）后，同一微信号能恢复全部收藏和历史。现状：收藏短语（`saved_phrases`）和表达历史（`expressions`）已有云同步（fire-and-forget 上云 + 进页面拉云端合并），但**康复训练记录、评估记录、中医打卡+徽章、患者程度档案**四类数据仍纯本地，换设备即丢。

用户已确认：场景=换设备恢复；范围=上述四类全部；策略=云端为准+本地缓存（与现有收藏/表达历史同一模式，弱网不阻塞操作）。

## 方案：1 个新云函数 + 1 个新集合

新增云函数 `syncUserData` + 集合 `user_data`，统一承载四类数据的账号级存取（不做 12 个云函数）。openid 由 `getWXContext()` 自动注入，与 `login` 云函数同机制。

文档结构 `{ _openid, kind, itemId, data, updatedAt }`，按体积分两类存储：
- `kind='rehab_session'`，itemId=session.id，**每条一文档**（含整份题目快照，整块存可能逼近 512KB 文档限制，拆条安全）
- `kind='assessment_list'` / `'tcm'` / `'profile'`，itemId 固定 `'main'`，各**单文档整块存**（6~10KB，远小于限制）

两个 action：
- `save`：`db.collection('user_data').doc(openid_kind_itemId).set()` —— 自定义 _id 幂等 upsert，一次调用免先查
- `get`：`where({_openid}).limit(100).get()` —— 单用户最多 53 条文档，一次拉全

## 文件改动

### 新建

**1. `cloudfunctions/syncUserData/index.js` + `package.json`**
参照 `cloudfunctions/savePhrase/` 的结构与注释风格（wx-server-sdk ~2.6.3，`{code,message,data}` 返回格式，头注释写输入输出）。

**2. `src/services/userDataSync.ts`**
- `UserDataKind` 类型 + `saveUserData(kind, itemId, data)`：封装 `callFunction('syncUserData', {action:'save',...})`，fire-and-forget（`.catch` 仅打日志，不 import store，避免循环依赖）
- 与 `src/services/cloud.ts` 的 callFunction 复用，H5 自动静默跳过

**3. `src/services/bootstrapSync.ts`**
`bootstrapCloudSync()`：启动时①静默 `useUserStore.getState().login()`（换设备顺带恢复 nickname/role/avatar；失败继续）→ ②`syncUserData get` → ③按 kind 分发到各 store 的合并回填 action。整体 try/catch 打日志，不阻塞首屏。

### 修改

**4. 四个 store：变更 action 加一行上云 + 新增合并回填 action**

| Store | 加上云的位置 | 新增合并 action |
|---|---|---|
| `useRehabStore.ts` | `finishSession`（99行）：`saveUserData('rehab_session', finished.id, finished)` | `mergeCloudSessions`：按 id 并集→finishedAt 倒序→截断50→set+持久化 |
| `useAssessmentStore.ts` | `addAssessment`（70行）、`removeAssessment`（100行）：整块存 | `mergeCloudAssessments`：按 assessmentId 并集→assessedAt 倒序→截断20 |
| `useTcmStore.ts` | `addCheckIn`（64行）：存 `{checkIns, badges}` | `mergeCloudTcm`：checkIns 按 id 并集截断200；badges 并集 |
| `useProfileStore.ts` | `setSeverity`（48行）、`applyAssessment`（66行） | `mergeCloudProfile`：updatedAt 新者胜 |

合并模式与收藏页 `pages/favorites/index.tsx:23-35` 一致（本地优先、云端补差集、列表持久化写回原 key）。本地 STORAGE_KEYS 全部不变。

**5. `src/app.tsx`**
启动流程（现有同步 load 本地之后，25-28行区域）加：weapp 下 `void bootstrapCloudSync()`（异步不 await，不阻塞首屏；与 TTS 预热同为后台任务）。

### 不同步的项（有意为之）
- `activeSession`（进行中的半途会话）：时钟依赖强，丢一次进行中训练可接受
- `rehabLevel`：等级来源已是「档案优先」，档案同步后自然跟随（见 useRehabStore.ts:129-131）
- favorites/history 页：已有云同步，不动

## 部署（需手动，写完代码后）

1. 云开发控制台创建 `user_data` 集合，权限设「仅创建者可读写」
2. 微信开发者工具右键 `cloudfunctions/syncUserData` 上传部署（云端安装依赖）
3. `TARO_APP_CLOUD_ENV=<环境ID> pnpm dev:weapp` 构建体验版

## 验证

1. 类型/编译：`pnpm dev:weapp` 编译无 TS 错误
2. 写入链路：真机完成一次训练+录一条评估+打一次卡 → 云开发控制台 `user_data` 集合出现对应文档且 `_openid` 正确
3. 换设备恢复：开发者工具「清除全部缓存」→ 重新打开小程序 → 康复历史/评估列表/打卡勋章/程度档案自动恢复，首页主卡按恢复的 role/程度展示
4. 弱网降级：断网下完成训练本地正常记录，控制台仅出现 `[UserDataSync] save failed` 日志，联网后下次变更补同步
5. H5 回归：`pnpm dev:h5` 行为与现状一致（callFunction 静默跳过）
