# services/analytics_service.py
from database.database import get_db_connection
from database.models import AssetSummary
from datetime import datetime, timedelta
import json


def get_asset_summary():
    """获取资产汇总信息"""
    conn = get_db_connection()

    # 获取各类资产总额
    type_totals = conn.execute('''
        SELECT 
            c.type,
            COALESCE(SUM(a.balance), 0) as total
        FROM categories c
        LEFT JOIN accounts a ON c.id = a.category_id AND a.is_active = 1
        GROUP BY c.type
    ''').fetchall()

    totals = {row['type']: row['total'] for row in type_totals}

    # 获取账户和交易数量
    counts = conn.execute('''
        SELECT 
            (SELECT COUNT(*) FROM accounts WHERE is_active = 1) as account_count,
            (SELECT COUNT(*) FROM transactions) as transaction_count,
            (SELECT MAX(updated_at) FROM accounts) as last_update
    ''').fetchone()

    conn.close()

    return AssetSummary(
        total_assets=sum(totals.values()),
        total_liquid=totals.get('流动资产', 0),
        total_investment=totals.get('投资资产', 0),
        total_fixed=totals.get('固定资产', 0),
        total_other=totals.get('其他资产', 0),
        account_count=counts['account_count'],
        transaction_count=counts['transaction_count'],
        last_update=counts['last_update']
    )


def get_asset_distribution():
    """获取资产分布数据"""
    conn = get_db_connection()

    # 按类型分布
    by_type = conn.execute('''
        SELECT 
            c.type,
            SUM(a.balance) as total,
            COUNT(a.id) as count
        FROM accounts a
        JOIN categories c ON a.category_id = c.id
        WHERE a.is_active = 1
        GROUP BY c.type
        ORDER BY total DESC
    ''').fetchall()

    # 按分类分布
    by_category = conn.execute('''
        SELECT 
            c.name,
            c.type,
            c.icon,
            c.color,
            SUM(a.balance) as total,
            COUNT(a.id) as count
        FROM accounts a
        JOIN categories c ON a.category_id = c.id
        WHERE a.is_active = 1
        GROUP BY c.id
        ORDER BY total DESC
    ''').fetchall()

    # 按平台分布
    by_platform = conn.execute('''
        SELECT 
            COALESCE(platform, '未分类') as platform,
            SUM(balance) as total,
            COUNT(*) as count
        FROM accounts
        WHERE is_active = 1
        GROUP BY platform
        ORDER BY total DESC
    ''').fetchall()

    conn.close()

    return {
        'by_type': [dict(row) for row in by_type],
        'by_category': [dict(row) for row in by_category],
        'by_platform': [dict(row) for row in by_platform]
    }


def get_income_expense_summary(start_date=None, end_date=None):
    """获取收支汇总"""
    conn = get_db_connection()

    # 默认获取最近30天
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

    # 总收支
    summary = conn.execute('''
        SELECT 
            type,
            SUM(amount) as total,
            COUNT(*) as count
        FROM transactions
        WHERE date BETWEEN ? AND ?
        GROUP BY type
    ''', (start_date, end_date)).fetchall()

    # 按日期分组的收支
    daily = conn.execute('''
        SELECT 
            date,
            type,
            SUM(amount) as total
        FROM transactions
        WHERE date BETWEEN ? AND ?
        GROUP BY date, type
        ORDER BY date
    ''', (start_date, end_date)).fetchall()

    # 按分类分组的收支
    by_category = conn.execute('''
        SELECT 
            category,
            type,
            SUM(amount) as total,
            COUNT(*) as count
        FROM transactions
        WHERE date BETWEEN ? AND ? AND category IS NOT NULL
        GROUP BY category, type
        ORDER BY total DESC
    ''', (start_date, end_date)).fetchall()

    conn.close()

    return {
        'summary': {row['type']: {'total': row['total'], 'count': row['count']}
                    for row in summary},
        'daily': [dict(row) for row in daily],
        'by_category': [dict(row) for row in by_category]
    }


def get_asset_trend(days=30):
    """获取资产趋势数据"""
    conn = get_db_connection()

    # 获取最近的快照数据
    snapshots = conn.execute('''
        SELECT * FROM asset_snapshots
        WHERE snapshot_date >= date('now', '-' || ? || ' days')
        ORDER BY snapshot_date
    ''', (days,)).fetchall()

    # 如果快照数据不足，通过交易记录推算
    if len(snapshots) < days / 7:  # 假设每周至少一个快照
        trend_data = calculate_trend_from_transactions(conn, days)
    else:
        trend_data = [
            {
                'date': s['snapshot_date'],
                'total_assets': s['total_assets'],
                'liquid': s['total_liquid'],
                'investment': s['total_investment'],
                'fixed': s['total_fixed']
            }
            for s in snapshots
        ]

    # 如果还是没有数据，生成模拟数据
    if not trend_data:
        current_total = get_asset_summary().total_assets
        trend_data = []
        for i in range(days):
            date = (datetime.now() - timedelta(days=days - i - 1)).strftime('%Y-%m-%d')
            trend_data.append({
                'date': date,
                'total_assets': current_total
            })

    conn.close()
    return trend_data


def calculate_trend_from_transactions(conn, days):
    """通过交易记录计算资产趋势"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # 获取当前余额
    current_balances = conn.execute('''
        SELECT 
            a.id,
            a.balance,
            c.type
        FROM accounts a
        JOIN categories c ON a.category_id = c.id
        WHERE a.is_active = 1
    ''').fetchall()

    # 获取期间内的所有交易
    transactions = conn.execute('''
        SELECT 
            t.*,
            c.type as category_type
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        JOIN categories c ON a.category_id = c.id
        WHERE t.date >= ?
        ORDER BY t.date DESC
    ''', (start_date.strftime('%Y-%m-%d'),)).fetchall()

    # 反向计算每日余额
    trend_data = []
    current_date = end_date

    while current_date >= start_date:
        date_str = current_date.strftime('%Y-%m-%d')
        # 简化处理，使用当前余额
        total = sum(b['balance'] for b in current_balances)
        trend_data.append({
            'date': date_str,
            'total_assets': total
        })
        current_date -= timedelta(days=1)

    return list(reversed(trend_data))


def get_monthly_statistics():
    """获取月度统计数据"""
    conn = get_db_connection()

    # 最近12个月的收支统计
    monthly_stats = conn.execute('''
        SELECT 
            strftime('%Y-%m', date) as month,
            type,
            SUM(amount) as total,
            COUNT(*) as count,
            AVG(amount) as average
        FROM transactions
        WHERE date >= date('now', '-12 months')
        GROUP BY strftime('%Y-%m', date), type
        ORDER BY month DESC
    ''').fetchall()

    # 按月份整理数据
    result = {}
    for row in monthly_stats:
        month = row['month']
        if month not in result:
            result[month] = {'income': 0, 'expense': 0, 'count': 0}

        if row['type'] == '收入':
            result[month]['income'] = row['total']
        elif row['type'] == '支出':
            result[month]['expense'] = row['total']

        result[month]['count'] += row['count']
        result[month]['net'] = result[month]['income'] - result[month]['expense']

    conn.close()

    return result


def calculate_financial_ratios():
    """计算财务比率"""
    summary = get_asset_summary()

    # 月度收支
    last_month = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    income_expense = get_income_expense_summary(last_month)

    monthly_income = income_expense['summary'].get('收入', {}).get('total', 0)
    monthly_expense = income_expense['summary'].get('支出', {}).get('total', 0)

    # 处理可能的除零错误和无穷大值
    liquidity_ratio = summary.liquid_ratio if hasattr(summary, 'liquid_ratio') else 0
    investment_ratio = summary.investment_ratio if hasattr(summary, 'investment_ratio') else 0
    fixed_ratio = summary.fixed_ratio if hasattr(summary, 'fixed_ratio') else 0

    # 计算储蓄率
    if monthly_income > 0:
        savings_rate = (monthly_income - monthly_expense) / monthly_income * 100
    else:
        savings_rate = 0

    # 计算支出比率
    if summary.total_assets > 0:
        expense_ratio = monthly_expense / summary.total_assets * 100
    else:
        expense_ratio = 0

    # 计算应急基金月数（避免无穷大）
    if monthly_expense > 0:
        emergency_fund_months = summary.total_liquid / monthly_expense
        # 限制最大值为999
        emergency_fund_months = min(emergency_fund_months, 999)
    else:
        emergency_fund_months = 999

    return {
        'liquidity_ratio': round(liquidity_ratio, 2),
        'investment_ratio': round(investment_ratio, 2),
        'fixed_ratio': round(fixed_ratio, 2),
        'savings_rate': round(savings_rate, 2),
        'expense_ratio': round(expense_ratio, 2),
        'emergency_fund_months': round(emergency_fund_months, 1)
    }