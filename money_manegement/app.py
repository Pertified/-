from flask import Flask, render_template, jsonify, request, send_file
from datetime import datetime, timedelta
import json
import io
import csv
import os

from database.database import init_db, create_snapshot
from services.account_service import *
from services.transaction_service import *
from services.category_service import *
from services.analytics_service import *

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

# 初始化数据库
print("正在初始化数据库...")
init_db()


@app.route('/')
def index():
    return render_template('index.html')


# ===== 账户相关API =====
@app.route('/api/accounts', methods=['GET'])
def api_list_accounts():
    category_id = request.args.get('category_id', type=int)
    platform = request.args.get('platform')
    is_active = request.args.get('is_active', 'true').lower() == 'true'

    accounts = list_accounts(category_id, platform, is_active)
    return jsonify([dict(a) for a in accounts])


@app.route('/api/accounts/<int:account_id>', methods=['GET'])
def api_get_account(account_id):
    account = get_account(account_id)
    if account:
        return jsonify(dict(account))
    return jsonify({'error': '账户不存在'}), 404


@app.route('/api/accounts', methods=['POST'])
def api_add_account():
    data = request.get_json()
    account_id = add_account(
        name=data['name'],
        category_id=data['category_id'],
        balance=data['balance'],
        initial_balance=data.get('initial_balance'),
        platform=data.get('platform'),
        account_number=data.get('account_number'),
        description=data.get('description')
    )
    return jsonify({'id': account_id}), 201


@app.route('/api/accounts/<int:account_id>', methods=['PUT'])
def api_update_account(account_id):
    data = request.get_json()
    update_account(
        account_id=account_id,
        name=data['name'],
        category_id=data['category_id'],
        balance=data['balance'],
        platform=data.get('platform'),
        account_number=data.get('account_number'),
        description=data.get('description')
    )
    return jsonify({'success': True})


@app.route('/api/accounts/<int:account_id>', methods=['DELETE'])
def api_delete_account(account_id):
    delete_account(account_id)
    return jsonify({'success': True})


@app.route('/api/accounts/by-type', methods=['GET'])
def api_accounts_by_type():
    accounts = get_accounts_by_type()
    # 转换为可序列化格式
    result = {}
    for asset_type, account_list in accounts.items():
        result[asset_type] = [dict(a) for a in account_list]
    return jsonify(result)


# ===== 交易相关API =====
@app.route('/api/transactions', methods=['GET'])
def api_list_transactions():
    account_id = request.args.get('account_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    transaction_type = request.args.get('type')
    limit = request.args.get('limit', type=int)

    transactions = list_transactions(
        account_id=account_id,
        start_date=start_date,
        end_date=end_date,
        transaction_type=transaction_type,
        limit=limit
    )
    return jsonify([dict(t) for t in transactions])


@app.route('/api/transactions/<int:tx_id>', methods=['GET'])
def api_get_transaction(tx_id):
    transactions = list_transactions()
    transaction = next((dict(t) for t in transactions if t['id'] == tx_id), None)
    if transaction:
        return jsonify(transaction)
    return jsonify({'error': '交易不存在'}), 404


@app.route('/api/transactions', methods=['POST'])
def api_add_transaction():
    data = request.get_json()
    tx_id = add_transaction(
        account_id=data['account_id'],
        date=data['date'],
        description=data['description'],
        ttype=data['type'],
        amount=data['amount'],
        category=data.get('category'),
        note=data.get('note')
    )
    return jsonify({'id': tx_id}), 201


@app.route('/api/transactions/<int:tx_id>', methods=['PUT'])
def api_update_transaction(tx_id):
    data = request.get_json()
    update_transaction(
        tx_id=tx_id,
        account_id=data['account_id'],
        date=data['date'],
        description=data['description'],
        ttype=data['type'],
        amount=data['amount'],
        category=data.get('category'),
        note=data.get('note')
    )
    return jsonify({'success': True})


@app.route('/api/transactions/<int:tx_id>', methods=['DELETE'])
def api_delete_transaction(tx_id):
    delete_transaction(tx_id)
    return jsonify({'success': True})


# ===== 分类相关API =====
@app.route('/api/categories', methods=['GET'])
def api_list_categories():
    categories = list_categories()
    return jsonify([dict(c) for c in categories])


@app.route('/api/categories/stats', methods=['GET'])
def api_categories_with_stats():
    categories = get_categories_with_stats()
    return jsonify([dict(c) for c in categories])


@app.route('/api/categories', methods=['POST'])
def api_add_category():
    data = request.get_json()
    category_id = add_category(
        name=data['name'],
        type=data['type'],
        icon=data.get('icon'),
        color=data.get('color'),
        description=data.get('description')
    )
    return jsonify({'id': category_id}), 201


# ===== 分析相关API =====
@app.route('/api/analytics/summary', methods=['GET'])
def api_asset_summary():
    summary = get_asset_summary()
    return jsonify({
        'total_assets': summary.total_assets,
        'total_liquid': summary.total_liquid,
        'total_investment': summary.total_investment,
        'total_fixed': summary.total_fixed,
        'total_other': summary.total_other,
        'account_count': summary.account_count,
        'transaction_count': summary.transaction_count,
        'last_update': summary.last_update,
        'liquid_ratio': summary.liquid_ratio,
        'investment_ratio': summary.investment_ratio,
        'fixed_ratio': summary.fixed_ratio
    })


@app.route('/api/analytics/distribution', methods=['GET'])
def api_asset_distribution():
    distribution = get_asset_distribution()
    return jsonify(distribution)


@app.route('/api/analytics/income-expense', methods=['GET'])
def api_income_expense():
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    data = get_income_expense_summary(start_date, end_date)
    return jsonify(data)


@app.route('/api/analytics/trend', methods=['GET'])
def api_asset_trend():
    days = request.args.get('days', 30, type=int)
    period = request.args.get('period')

    if period == '7d':
        days = 7
    elif period == '30d':
        days = 30
    elif period == '90d':
        days = 90

    trend = get_asset_trend(days)
    return jsonify(trend)


@app.route('/api/analytics/monthly-stats', methods=['GET'])
def api_monthly_stats():
    stats = get_monthly_statistics()
    return jsonify(stats)


@app.route('/api/analytics/ratios', methods=['GET'])
def api_financial_ratios():
    ratios = calculate_financial_ratios()
    return jsonify(ratios)


@app.route('/api/analytics/snapshot', methods=['POST'])
def api_create_snapshot():
    create_snapshot()
    return jsonify({'success': True}), 201


@app.route('/api/analytics/export-report', methods=['GET'])
def api_export_report():
    # 这里简化处理，实际应该生成PDF报告
    # 暂时导出CSV格式的数据
    summary = get_asset_summary()
    accounts = list_accounts()

    output = io.StringIO()
    writer = csv.writer(output)

    # 写入汇总信息
    writer.writerow(['财务报告', datetime.now().strftime('%Y-%m-%d')])
    writer.writerow([])
    writer.writerow(['总资产', f'¥{summary.total_assets:.2f}'])
    writer.writerow(['流动资产', f'¥{summary.total_liquid:.2f}'])
    writer.writerow(['投资资产', f'¥{summary.total_investment:.2f}'])
    writer.writerow(['固定资产', f'¥{summary.total_fixed:.2f}'])
    writer.writerow([])

    # 写入账户明细
    writer.writerow(['账户名称', '分类', '余额', '平台'])
    for account in accounts:
        writer.writerow([
            account['name'],
            account.get('category_name', ''),
            f'¥{account["balance"]:.2f}',
            account.get('platform', '')
        ])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'财务报告_{datetime.now().strftime("%Y%m%d")}.csv'
    )


if __name__ == '__main__':
    app.run(debug=True)