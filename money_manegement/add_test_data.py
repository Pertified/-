# add_test_data.py
from app import app
from services.account_service import add_account, list_accounts
from services.transaction_service import add_transaction
from services.category_service import list_categories
from database.database import create_snapshot
from datetime import datetime, timedelta
import random

with app.app_context():
    # 获取现有账户
    accounts = list_accounts()

    if not accounts:
        # 如果没有账户，创建一些测试账户
        print("创建测试账户...")

        # 获取分类
        categories = list_categories()
        category_map = {cat['name']: cat['id'] for cat in categories}

        # 创建银行账户
        account1_id = add_account(
            name="工商银行储蓄卡",
            category_id=category_map.get('银行存款', 2),
            balance=50000.00,
            initial_balance=45000.00,
            platform="工商银行",
            account_number="1234",
            description="主要储蓄账户"
        )

        # 创建支付宝账户
        account2_id = add_account(
            name="支付宝余额",
            category_id=category_map.get('电子钱包', 3),
            balance=8500.00,
            initial_balance=5000.00,
            platform="支付宝",
            account_number="",
            description="日常消费账户"
        )

        # 创建股票账户
        account3_id = add_account(
            name="证券账户",
            category_id=category_map.get('股票', 4),
            balance=120000.00,
            initial_balance=100000.00,
            platform="华泰证券",
            account_number="5678",
            description="股票投资账户"
        )

        # 创建基金账户
        account4_id = add_account(
            name="天天基金",
            category_id=category_map.get('基金', 5),
            balance=30000.00,
            initial_balance=25000.00,
            platform="天天基金",
            account_number="",
            description="基金定投账户"
        )

        accounts = [
            {'id': account1_id, 'name': '工商银行储蓄卡'},
            {'id': account2_id, 'name': '支付宝余额'},
            {'id': account3_id, 'name': '证券账户'},
            {'id': account4_id, 'name': '天天基金'}
        ]

        print(f"创建了 {len(accounts)} 个账户")

    # 添加交易记录
    print("\n添加交易记录...")

    # 定义一些交易类别
    income_categories = ['工资', '奖金', '理财收益', '其他收入']
    expense_categories = ['餐饮', '购物', '交通', '生活缴费', '娱乐', '医疗', '教育']

    transaction_count = 0

    # 为每个账户添加一些交易
    for account in accounts[:2]:  # 只为前两个账户添加交易
        account_id = account['id']

        # 添加过去30天的交易
        for days_ago in range(30, 0, -1):
            # 随机决定这天是否有交易
            if random.random() > 0.6:  # 40%的概率有交易
                continue

            date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')

            # 每月1号添加工资收入
            if days_ago % 30 == 1 and account['name'] == '工商银行储蓄卡':
                add_transaction(
                    account_id=account_id,
                    date=date,
                    description="月度工资",
                    ttype="收入",
                    amount=15000.00,
                    category="工资"
                )
                transaction_count += 1

            # 随机添加支出
            if random.random() > 0.3:  # 70%概率是支出
                category = random.choice(expense_categories)
                amount = random.uniform(20, 500)

                descriptions = {
                    '餐饮': ['午餐', '晚餐', '外卖', '咖啡'],
                    '购物': ['超市购物', '网购', '日用品', '服装'],
                    '交通': ['地铁', '打车', '加油', '停车费'],
                    '生活缴费': ['水电费', '物业费', '话费', '网费'],
                    '娱乐': ['电影', '健身', '游戏', 'KTV'],
                    '医疗': ['药品', '体检', '门诊', '保健品'],
                    '教育': ['书籍', '课程', '培训', '学习资料']
                }

                description = random.choice(descriptions.get(category, [category]))

                add_transaction(
                    account_id=account_id,
                    date=date,
                    description=description,
                    ttype="支出",
                    amount=round(amount, 2),
                    category=category
                )
                transaction_count += 1

            # 偶尔添加其他收入
            elif random.random() > 0.8:  # 20%概率是其他收入
                category = random.choice(income_categories[1:])  # 排除工资
                amount = random.uniform(100, 2000)

                descriptions = {
                    '奖金': ['项目奖金', '年终奖', '绩效奖金'],
                    '理财收益': ['基金收益', '股票分红', '理财产品到期'],
                    '其他收入': ['兼职收入', '报销款', '退款']
                }

                description = random.choice(descriptions.get(category, [category]))

                add_transaction(
                    account_id=account_id,
                    date=date,
                    description=description,
                    ttype="收入",
                    amount=round(amount, 2),
                    category=category
                )
                transaction_count += 1

    print(f"添加了 {transaction_count} 条交易记录")

    # 创建资产快照
    print("\n创建资产快照...")
    create_snapshot()

    print("\n测试数据添加完成！")
    print("现在可以刷新页面查看完整的数据展示了。")