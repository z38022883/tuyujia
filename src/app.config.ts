export default defineAppConfig({
  pages: [
    'pages/express/index',
    'pages/receive/index',
    'pages/favorites/index',
    'pages/history/index',
    'pages/mine/index',
    'pages/onboarding/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '图语家',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f5f7f8'
  },
  tabBar: {
    color: '#86909c',
    selectedColor: '#2bb6c4',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/express/index',
        text: '表达',
        iconPath: 'assets/tabbar/express.png',
        selectedIconPath: 'assets/tabbar/express-selected.png'
      },
      {
        pagePath: 'pages/receive/index',
        text: '接收',
        iconPath: 'assets/tabbar/receive.png',
        selectedIconPath: 'assets/tabbar/receive-selected.png'
      },
      {
        pagePath: 'pages/favorites/index',
        text: '收藏',
        iconPath: 'assets/tabbar/favorites.png',
        selectedIconPath: 'assets/tabbar/favorites-selected.png'
      },
      {
        pagePath: 'pages/history/index',
        text: '历史',
        iconPath: 'assets/tabbar/history.png',
        selectedIconPath: 'assets/tabbar/history-selected.png'
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
