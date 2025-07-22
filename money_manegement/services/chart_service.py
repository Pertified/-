"""
图表数据服务
处理所有图表相关的数据获取和格式化
"""

from datetime import datetime, timedelta
from collections import defaultdict
from services.analytics_service import AnalyticsService
from services.account_service import AccountService
from services.transaction_service import TransactionService


class ChartService:
    """图表数据服务类"""

    def __init__(self):
        self.analytics = AnalyticsService()
        self.account_service = AccountService()
        self.transaction_service = TransactionService()

    def get_expense_distribution(self, user_id, period='month', category_type='all'):
        """获取支出分布数据"""
        # 计算日期范围
        end_date = datetime.now()
        if period == 'week':
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            start_date = end_date - timedelta(days=30)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=30)

        # 获取支出数据
        transactions = self.transaction_service.get_transactions_by_type(
            user_id, '支出', start_date, end_date
        )

        # 按分类聚合
        distribution = defaultdict(float)
        for trans in transactions:
            if category_type == 'all' or trans.account.category.type == category_type:
                category_name = trans.account.category.name
                distribution[category_name] += trans.amount

        # 格式化为图表数据
        data = []
        colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
                  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']

        for i, (category, amount) in enumerate(sorted(distribution.items(),
                                                      key=lambda x: x[1],
                                                      reverse=True)[:10]):
            data.append({
                'label': category,
                'value': float(amount),
                'color': colors[i % len(colors)]
            })

        return {
            'labels': [item['label'] for item in data],
            'datasets': [{
                'data': [item['value'] for item in data],
                'backgroundColor': [item['color'] for item in data]
            }]
        }

    def get_income_trend(self, user_id, days=30, include_forecast=False):
        """获取收入趋势数据"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)

        # 获取收入数据
        transactions = self.transaction_service.get_transactions_by_type(
            user_id, '收入', start_date, end_date
        )

        # 按日期聚合
        daily_income = defaultdict(float)
        for trans in transactions:
            daily_income[trans.date] += trans.amount

        # 生成日期序列
        date_list = []
        current_date = start_date
        while current_date <= end_date:
            date_list.append(current_date)
            current_date += timedelta(days=1)

        # 格式化数据
        labels = []
        values = []
        for date in date_list:
            labels.append(date.strftime('%m-%d'))
            values.append(float(daily_income.get(date, 0)))

        result = {
            'labels': labels,
            'datasets': [{
                'label': '每日收入',
                'data': values,
                'borderColor': '#10b981',
                'backgroundColor': 'rgba(16, 185, 129, 0.1)',
                'fill': True
            }]
        }

        # 添加预测数据
        if include_forecast:
            forecast_values = self._generate_forecast(values, 7)
            forecast_labels = []
            for i in range(7):
                future_date = end_date + timedelta(days=i + 1)
                forecast_labels.append(future_date.strftime('%m-%d'))

            result['datasets'].append({
                'label': '预测收入',
                'data': [None] * len(values) + forecast_values,
                'borderColor': '#60a5fa',
                'borderDash': [5, 5],
                'fill': False
            })
            result['labels'].extend(forecast_labels)

        return result

    def _generate_forecast(self, historical_data, days):
        """简单的移动平均预测"""
        if len(historical_data) < 7:
            return [0] * days

        # 计算7天移动平均
        recent_values = historical_data[-7:]
        avg = sum(recent_values) / len(recent_values)

        # 生成预测值（添加随机波动）
        import random
        forecast = []
        for _ in range(days):
            variation = avg * random.uniform(-0.1, 0.1)
            forecast.append(max(0, avg + variation))

        return forecast

    def get_asset_allocation(self, user_id):
        """获取资产配置数据"""
        summary = self.analytics.get_asset_summary(user_id)

        allocations = []
        if summary['total_liquid'] > 0:
            allocations.append({
                'label': '流动资产',
                'value': float(summary['total_liquid']),
                'color': '#10b981'
            })

        if summary['total_investment'] > 0:
            allocations.append({
                'label': '投资资产',
                'value': float(summary['total_investment']),
                'color': '#3b82f6'
            })

        if summary['total_fixed'] > 0:
            allocations.append({
                'label': '固定资产',
                'value': float(summary['total_fixed']),
                'color': '#f59e0b'
            })

        return {
            'labels': [a['label'] for a in allocations],
            'datasets': [{
                'data': [a['value'] for a in allocations],
                'backgroundColor': [a['color'] for a in allocations]
            }]
        }

    def get_monthly_comparison(self, user_id, months=6):
        """获取月度对比数据"""
        data = self.analytics.get_monthly_stats(user_id, months)

        labels = []
        income_data = []
        expense_data = []

        for month_data in data:
            labels.append(month_data['month'])
            income_data.append(float(month_data.get('income', 0)))
            expense_data.append(float(month_data.get('expense', 0)))

        return {
            'labels': labels,
            'datasets': [
                {
                    'label': '收入',
                    'data': income_data,
                    'backgroundColor': '#10b981'
                },
                {
                    'label': '支出',
                    'data': expense_data,
                    'backgroundColor': '#ef4444'
                }
            ]
        }

    def get_financial_health(self, user_id):
        """获取财务健康度数据"""
        # 这里使用模拟数据，实际应该根据用户数据计算
        return {
            'labels': ['应急储备', '负债率', '储蓄率', '投资占比', '现金流', '资产增长'],
            'datasets': [{
                'label': '财务健康度',
                'data': [80, 90, 60, 70, 85, 75],
                'backgroundColor': 'rgba(59, 130, 246, 0.2)',
                'borderColor': '#3b82f6',
                'pointBackgroundColor': '#3b82f6',
                'pointBorderColor': '#fff',
                'pointHoverBackgroundColor': '#fff',
                'pointHoverBorderColor': '#3b82f6'
            }]
        }

    def get_cash_flow(self, user_id, month):
        """获取现金流数据"""
        # 解析月份
        year, month_num = map(int, month.split('-'))

        # 获取月度数据
        monthly_data = self.analytics.get_monthly_income_expense(user_id, year, month_num)

        # 构建桑基图数据
        nodes = [
            {'name': '总收入', 'category': 'income'},
            {'name': '工资收入', 'category': 'income_source'},
            {'name': '其他收入', 'category': 'income_source'},
            {'name': '支出', 'category': 'expense'},
            {'name': '生活支出', 'category': 'expense_category'},
            {'name': '娱乐支出', 'category': 'expense_category'},
            {'name': '储蓄', 'category': 'savings'}
        ]

        # 模拟数据链接
        total_income = monthly_data.get('total_income', 10000)
        total_expense = monthly_data.get('total_expense', 7000)

        links = [
            {'source': 1, 'target': 0, 'value': total_income * 0.8},
            {'source': 2, 'target': 0, 'value': total_income * 0.2},
            {'source': 0, 'target': 3, 'value': total_expense},
            {'source': 0, 'target': 6, 'value': total_income - total_expense},
            {'source': 3, 'target': 4, 'value': total_expense * 0.6},
            {'source': 3, 'target': 5, 'value': total_expense * 0.4}
        ]

        return {
            'nodes': nodes,
            'links': links
        }

    def get_spending_heatmap(self, user_id, weeks=12):
        """获取支出热力图数据"""
        end_date = datetime.now().date()
        start_date = end_date - timedelta(weeks=weeks * 7)

        # 获取支出数据
        transactions = self.transaction_service.get_transactions_by_type(
            user_id, '支出', start_date, end_date
        )

        # 创建热力图矩阵
        matrix = [[0 for _ in range(7)] for _ in range(weeks)]

        for trans in transactions:
            days_diff = (trans.date - start_date).days
            week_index = days_diff // 7
            day_index = trans.date.weekday()

            if 0 <= week_index < weeks:
                matrix[week_index][day_index] += float(trans.amount)

        return {
            'data': matrix,
            'xLabels': ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
            'yLabels': [f'第{i + 1}周' for i in range(weeks)]
        }

    def get_savings_goal_progress(self, user_id, goal_id=None):
        """获取储蓄目标进度"""
        # 模拟数据
        return {
            'value': 65,
            'max': 100,
            'label': '储蓄目标完成度',
            'suffix': '%'
        }