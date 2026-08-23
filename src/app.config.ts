export default defineAppConfig({
  pages: [
    'pages/home/index',
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
