export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/express/index',
    'pages/receive/index',
    'pages/favorites/index',
    'pages/history/index',
    'pages/mine/index',
    'pages/onboarding/index',
    'pages/level/index',
    'pages/rehab/index',
    'pages/rehab/training/index',
    'pages/rehab/result/index',
    'pages/rehab/history/index',
    'pages/rehab/family/index',
    'pages/tcm/index',
    'pages/tcm/acupoint/index',
    'pages/tcm/music/index',
    'pages/tcm/mouth/index'
  ],
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
