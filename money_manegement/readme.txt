wealth_tracker/
├── README.md                  # 项目说明
├── requirements.txt           # 依赖
├── finance_data.json          # 本地数据存储
├── app.py                     # 应用入口，初始化 Flask 和蓝图注册
├── config.py                  # 配置（JSON 路径、时区、图表选项等）
├── models.py                  # 数据模型定义（Account, Transaction）
├── storage.py                 # 持久化层，封装 JSON 读写接口
├── services/                  # 业务逻辑层
│   ├── account_service.py     # 账户相关操作（增删改查、余额计算）
│   └── transaction_service.py # 交易相关操作（增删改查、报表数据）
├── views/                     # 路由和视图层
│   ├── dashboard.py           # 仪表盘路由（首页、图表数据）
│   ├── account_views.py       # 账户管理路由
│   └── transaction_views.py   # 交易管理路由
├── templates/                 # Jinja2 模板
│   ├── base.html              # 基本布局（导航、公共引入）
│   ├── dashboard.html         # 仪表盘页面
│   ├── account_list.html      # 账户列表页面
│   ├── account_form.html      # 添加/编辑账户页面
│   ├── transaction_list.html  # 交易列表页面
│   └── transaction_form.html  # 添加/编辑交易页面
└── static/                    # 静态资源
    ├── css/
    │   └── style.css          # 页面样式
    └── js/
        └── chart.js           # Chart.js 配置脚本