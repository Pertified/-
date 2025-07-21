# services/transaction_service.py
from database.database import get_db_connection
from datetime import datetime


def list_transactions(account_id=None, start_date=None, end_date=None,
                      transaction_type=None, limit=None):
    """获取交易列表，支持多种筛选条件"""
    conn = get_db_connection()

    query = '''
        SELECT 
            t.*,
            a.name as account_name,
            a.platform,
            c.name as account_category,
            c.icon as category_icon,
            c.color as category_color
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        JOIN categories c ON a.category_id = c.id
        WHERE 1=1
    '''
    params = []

    if account_id:
        query += ' AND t.account_id = ?'
        params.append(account_id)

    if start_date:
        query += ' AND t.date >= ?'
        params.append(start_date)

    if end_date:
        query += ' AND t.date <= ?'
        params.append(end_date)

    if transaction_type:
        query += ' AND t.type = ?'
        params.append(transaction_type)

    query += ' ORDER BY t.date DESC, t.id DESC'

    if limit:
        query += ' LIMIT ?'
        params.append(limit)

    transactions = conn.execute(query, params).fetchall()
    conn.close()
    return transactions


def add_transaction(account_id, date, description, ttype, amount,
                    category=None, note=None):
    """添加交易记录"""
    conn = get_db_connection()

    # 获取当前账户余额
    current_balance = conn.execute(
        'SELECT balance FROM accounts WHERE id = ?',
        (account_id,)
    ).fetchone()['balance']

    # 计算交易后余额
    if ttype == '收入':
        new_balance = current_balance + amount
    elif ttype == '支出':
        new_balance = current_balance - amount
    else:  # 转账等其他类型
        new_balance = current_balance

    # 插入交易记录
    cursor = conn.execute('''
        INSERT INTO transactions 
        (account_id, date, description, type, amount, category, balance_after, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (account_id, date, description, ttype, amount, category, new_balance, note))

    transaction_id = cursor.lastrowid

    # 更新账户余额
    if ttype in ['收入', '支出']:
        conn.execute(
            'UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            (new_balance, account_id)
        )

    conn.commit()
    conn.close()

    return transaction_id


def update_transaction(tx_id, account_id, date, description, ttype, amount,
                       category=None, note=None):
    """更新交易记录"""
    conn = get_db_connection()

    # 获取原交易信息
    old_tx = conn.execute(
        'SELECT * FROM transactions WHERE id = ?',
        (tx_id,)
    ).fetchone()

    if old_tx:
        # 恢复原账户余额
        if old_tx['type'] == '收入':
            conn.execute(
                'UPDATE accounts SET balance = balance - ? WHERE id = ?',
                (old_tx['amount'], old_tx['account_id'])
            )
        elif old_tx['type'] == '支出':
            conn.execute(
                'UPDATE accounts SET balance = balance + ? WHERE id = ?',
                (old_tx['amount'], old_tx['account_id'])
            )

        # 更新交易记录
        conn.execute('''
            UPDATE transactions 
            SET account_id = ?, date = ?, description = ?, type = ?, 
                amount = ?, category = ?, note = ?
            WHERE id = ?
        ''', (account_id, date, description, ttype, amount, category, note, tx_id))

        # 更新新账户余额
        if ttype == '收入':
            conn.execute(
                'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (amount, account_id)
            )
        elif ttype == '支出':
            conn.execute(
                'UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (amount, account_id)
            )

    conn.commit()
    conn.close()


def delete_transaction(tx_id):
    """删除交易记录"""
    conn = get_db_connection()

    # 获取交易信息
    tx = conn.execute(
        'SELECT * FROM transactions WHERE id = ?',
        (tx_id,)
    ).fetchone()

    if tx:
        # 恢复账户余额
        if tx['type'] == '收入':
            conn.execute(
                'UPDATE accounts SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (tx['amount'], tx['account_id'])
            )
        elif tx['type'] == '支出':
            conn.execute(
                'UPDATE accounts SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                (tx['amount'], tx['account_id'])
            )

        # 删除交易记录
        conn.execute('DELETE FROM transactions WHERE id = ?', (tx_id,))

    conn.commit()
    conn.close()


def get_transaction_categories():
    """获取所有交易分类"""
    conn = get_db_connection()
    categories = conn.execute('''
        SELECT DISTINCT category, type, COUNT(*) as count
        FROM transactions
        WHERE category IS NOT NULL
        GROUP BY category, type
        ORDER BY count DESC
    ''').fetchall()
    conn.close()
    return categories


def batch_import_transactions(transactions_data):
    """批量导入交易记录"""
    conn = get_db_connection()
    success_count = 0
    error_records = []

    for idx, tx in enumerate(transactions_data):
        try:
            # 验证必要字段
            required_fields = ['account_id', 'date', 'type', 'amount']
            if not all(field in tx for field in required_fields):
                raise ValueError("缺少必要字段")

            # 添加交易
            add_transaction(
                account_id=tx['account_id'],
                date=tx['date'],
                description=tx.get('description', ''),
                ttype=tx['type'],
                amount=float(tx['amount']),
                category=tx.get('category'),
                note=tx.get('note')
            )
            success_count += 1

        except Exception as e:
            error_records.append({
                'index': idx,
                'data': tx,
                'error': str(e)
            })

    conn.close()

    return {
        'success_count': success_count,
        'error_count': len(error_records),
        'errors': error_records
    }


def transfer_between_accounts(from_account_id, to_account_id, amount,
                              date=None, description=None):
    """账户间转账"""
    if date is None:
        date = datetime.now().strftime('%Y-%m-%d')

    conn = get_db_connection()

    try:
        # 创建转出交易
        add_transaction(
            account_id=from_account_id,
            date=date,
            description=description or f'转账到账户{to_account_id}',
            ttype='支出',
            amount=amount,
            category='转账'
        )

        # 创建转入交易
        add_transaction(
            account_id=to_account_id,
            date=date,
            description=description or f'从账户{from_account_id}转入',
            ttype='收入',
            amount=amount,
            category='转账'
        )

        conn.commit()
        return True

    except Exception as e:
        conn.rollback()
        raise e

    finally:
        conn.close()