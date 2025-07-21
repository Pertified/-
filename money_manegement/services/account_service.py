# services/account_service.py
from database.database import get_db_connection
from datetime import datetime


def list_accounts(category_id=None, platform=None, is_active=True):
    """获取账户列表，支持筛选"""
    conn = get_db_connection()
    query = '''
        SELECT 
            a.*,
            c.name as category_name,
            c.type as category_type,
            c.icon as category_icon,
            c.color as category_color
        FROM accounts a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE 1=1
    '''
    params = []

    if category_id:
        query += ' AND a.category_id = ?'
        params.append(category_id)

    if platform:
        query += ' AND a.platform = ?'
        params.append(platform)

    if is_active is not None:
        query += ' AND a.is_active = ?'
        params.append(1 if is_active else 0)

    query += ' ORDER BY c.type, a.balance DESC'

    accounts = conn.execute(query, params).fetchall()
    conn.close()
    return accounts


def get_account(account_id):
    """获取单个账户详情"""
    conn = get_db_connection()
    account = conn.execute('''
        SELECT 
            a.*,
            c.name as category_name,
            c.type as category_type,
            c.icon as category_icon,
            c.color as category_color
        FROM accounts a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.id = ?
    ''', (account_id,)).fetchone()
    conn.close()
    return account


def add_account(name, category_id, balance, initial_balance=None,
                platform=None, account_number=None, description=None):
    """添加账户"""
    if initial_balance is None:
        initial_balance = balance

    conn = get_db_connection()
    cursor = conn.execute('''
        INSERT INTO accounts 
        (name, category_id, balance, initial_balance, platform, account_number, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (name, category_id, balance, initial_balance, platform, account_number, description))

    account_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return account_id


def update_account(account_id, name, category_id, balance,
                   platform=None, account_number=None, description=None):
    """更新账户信息"""
    conn = get_db_connection()
    conn.execute('''
        UPDATE accounts 
        SET name = ?, category_id = ?, balance = ?, platform = ?, 
            account_number = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (name, category_id, balance, platform, account_number, description, account_id))
    conn.commit()
    conn.close()


def update_account_balance(account_id, new_balance):
    """仅更新账户余额"""
    conn = get_db_connection()
    conn.execute('''
        UPDATE accounts 
        SET balance = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (new_balance, account_id))
    conn.commit()
    conn.close()


def toggle_account_status(account_id):
    """切换账户激活状态"""
    conn = get_db_connection()
    conn.execute('''
        UPDATE accounts 
        SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (account_id,))
    conn.commit()
    conn.close()


def delete_account(account_id):
    """删除账户（软删除）"""
    conn = get_db_connection()
    conn.execute('''
        UPDATE accounts 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (account_id,))
    conn.commit()
    conn.close()


def get_accounts_by_type():
    """按类型分组获取账户"""
    conn = get_db_connection()
    result = {}

    types = ['流动资产', '投资资产', '固定资产', '其他资产']
    for asset_type in types:
        accounts = conn.execute('''
            SELECT 
                a.*,
                c.name as category_name,
                c.icon as category_icon,
                c.color as category_color
            FROM accounts a
            JOIN categories c ON a.category_id = c.id
            WHERE c.type = ? AND a.is_active = 1
            ORDER BY a.balance DESC
        ''', (asset_type,)).fetchall()
        result[asset_type] = accounts

    conn.close()
    return result


def get_platform_summary():
    """获取各平台资产汇总"""
    conn = get_db_connection()
    summary = conn.execute('''
        SELECT 
            COALESCE(platform, '未分类') as platform,
            COUNT(*) as account_count,
            SUM(balance) as total_balance
        FROM accounts
        WHERE is_active = 1
        GROUP BY platform
        ORDER BY total_balance DESC
    ''').fetchall()
    conn.close()
    return summary