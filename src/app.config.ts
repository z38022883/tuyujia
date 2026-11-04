export default defineAppConfig({
  // 主包只留高频/首屏页面；康复训练、评估、中医按需分包（缩小主包，真机启动更快）
  pages: [
    'pages/home/index',
    'pages/express/index',
    'pages/receive/index',
    'pages/favorites/index',
    'pages/history/index',
    'pages/mine/index',
    'pages/onboarding/index',
    'pages/level/index',
    'pages/role/index',
    'pages/dev/index'
  ],
  subPackages: [
    {
      root: 'pages/rehab',
      pages: [
        'index',
        'training/index',
        'result/index',
        'history/index',
        'family/index'
      ]
    },
    {
      root: 'pages/assessment',
      pages: ['entry/index']
    },
    {
      root: 'pages/tcm',
      pages: ['index', 'acupoint/index', 'music/index', 'mouth/index']
    }
  ],
  // 进入首页后（wifi 下）预下载康复分包，点进康复训练免等待
  preloadRule: {
    'pages/home/index': {
      network: 'wifi',
      packages: ['pages/rehab']
    }
  },
  // 按需注入：仅注入当前页用到的自定义组件代码，真机启动提速（官方推荐）
  lazyCodeLoading: 'requiredComponents',
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#f2f7f4',
    navigationBarTitleText: '图语家',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f2f7f4'
  },
  tabBar: {
    color: '#9aa8a3',
    selectedColor: '#2d6a4f',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-selected.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-selected.png'
      }
    ]
  }
});
