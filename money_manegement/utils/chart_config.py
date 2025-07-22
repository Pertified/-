"""
图表配置映射
定义图表类型与数据处理方法的映射关系
"""

class ChartConfig:
    """图表配置类，管理所有图表类型的配置信息"""

    # 图表类型常量
    CHART_TYPES = {
        'PIE': 'pie',
        'LINE': 'line',
        'BAR': 'bar',
        'DONUT': 'donut',
        'RADAR': 'radar',
        'GAUGE': 'gauge',
        'HEATMAP': 'heatmap',
        'SANKEY': 'sankey'
    }

    # 图表配置映射
    CHART_MAPPING = {
        'expense-distribution': {
            'type': 'pie',
            'service_method': 'get_expense_distribution',
            'default_params': {
                'period': 'month',
                'category_type': 'all'
            },
            'cache_duration': 300  # 5分钟缓存
        },
        'income-trend': {
            'type': 'line',
            'service_method': 'get_income_trend',
            'default_params': {
                'days': 30,
                'include_forecast': False
            },
            'cache_duration': 600
        },
        'asset-allocation': {
            'type': 'donut',
            'service_method': 'get_asset_allocation',
            'default_params': {},
            'cache_duration': 3600  # 1小时缓存
        },
        'cash-flow': {
            'type': 'sankey',
            'service_method': 'get_cash_flow',
            'default_params': {
                'month': None  # 将在运行时设置为当前月份
            },
            'cache_duration': 1800
        },
        'monthly-comparison': {
            'type': 'bar',
            'service_method': 'get_monthly_comparison',
            'default_params': {
                'months': 6
            },
            'cache_duration': 3600
        },
        'financial-health': {
            'type': 'radar',
            'service_method': 'get_financial_health',
            'default_params': {},
            'cache_duration': 3600
        },
        'spending-heatmap': {
            'type': 'heatmap',
            'service_method': 'get_spending_heatmap',
            'default_params': {
                'weeks': 12
            },
            'cache_duration': 1800
        },
        'savings-goal': {
            'type': 'gauge',
            'service_method': 'get_savings_goal_progress',
            'default_params': {
                'goal_id': None
            },
            'cache_duration': 600
        }
    }

    @classmethod
    def get_config(cls, chart_name):
        """获取图表配置"""
        return cls.CHART_MAPPING.get(chart_name)

    @classmethod
    def is_valid_chart(cls, chart_name):
        """检查是否为有效的图表类型"""
        return chart_name in cls.CHART_MAPPING

    @classmethod
    def get_all_charts(cls):
        """获取所有图表类型列表"""
        return list(cls.CHART_MAPPING.keys())

    @classmethod
    def get_chart_info(cls, chart_name):
        """获取图表详细信息"""
        config = cls.get_config(chart_name)
        if config:
            return {
                'name': chart_name,
                'type': config['type'],
                'parameters': list(config['default_params'].keys()),
                'cache_duration': config['cache_duration']
            }
        return None