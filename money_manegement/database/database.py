# database/database.py
import sqlite3
from datetime import datetime


def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect('finance.db')
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """初始化数据库"""
    conn = sqlite3.connect('finance.db')
    c = conn.cursor()

    # 启用外键约束
    c.execute('PRAGMA foreign_keys = ON')

    # 检查表是否已存在
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = [table[0] for table in c.fetchall()]

    # 创建分类表
    if 'categories' not in existing_tables:
        c.execute('''
            CREATE TABLE categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                type TEXT NOT NULL CHECK(type IN ('流动资产', '投资资产', '固定资产', '其他资产')),
                icon TEXT,
                color TEXT,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("创建分类表成功")

    # 创建账户表
    if 'accounts' not in existing_tables:
        c.execute('''
            CREATE TABLE accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category_id INTEGER,
                balance REAL NOT NULL DEFAULT 0,
                initial_balance REAL NOT NULL DEFAULT 0,
                currency TEXT DEFAULT 'CNY',
                platform TEXT,
                account_number TEXT,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
        ''')
        print("创建账户表成功")

    # 创建交易表
    if 'transactions' not in existing_tables:
        c.execute('''
            CREATE TABLE transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                type TEXT CHECK(type IN ('收入', '支出', '转账')),
                category TEXT,
                amount REAL NOT NULL,
                balance_after REAL,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
            )
        ''')
        print("创建交易表成功")

    # 创建资产快照表
    if 'asset_snapshots' not in existing_tables:
        c.execute('''
            CREATE TABLE asset_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                snapshot_date TEXT NOT NULL,
                total_assets REAL NOT NULL,
                total_liquid REAL DEFAULT 0,
                total_investment REAL DEFAULT 0,
                total_fixed REAL DEFAULT 0,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print("创建资产快照表成功")

    # 提交表创建
    conn.commit()

    # 创建索引（检查是否存在）
    c.execute("SELECT name FROM sqlite_master WHERE type='index'")
    existing_indexes = [idx[0] for idx in c.fetchall()]

    if 'idx_transactions_date' not in existing_indexes:
        c.execute('CREATE INDEX idx_transactions_date ON transactions(date)')
        print("创建交易日期索引成功")

    if 'idx_transactions_account' not in existing_indexes:
        c.execute('CREATE INDEX idx_transactions_account ON transactions(account_id)')
        print("创建交易账户索引成功")

    if 'idx_accounts_category' not in existing_indexes:
        c.execute('CREATE INDEX idx_accounts_category ON accounts(category_id)')
        print("创建账户分类索引成功")

    # 插入默认分类
    default_categories = [
        ('现金', '流动资产', '💵', '#4CAF50', '现金及现金等价物'),
        ('银行存款', '流动资产', '🏦', '#2196F3', '各类银行账户'),
        ('电子钱包', '流动资产', '📱', '#FF9800', '支付宝、微信等'),
        ('股票', '投资资产', '📈', '#F44336', '股票投资账户'),
        ('基金', '投资资产', '💹', '#9C27B0', '基金投资账户'),
        ('债券', '投资资产', '📊', '#3F51B5', '债券投资账户'),
        ('房产', '固定资产', '🏠', '#795548', '房地产资产'),
        ('车辆', '固定资产', '🚗', '#607D8B', '汽车等交通工具'),
        ('其他', '其他资产', '📦', '#9E9E9E', '其他类型资产')
    ]

    # 检查并插入默认分类
    for cat in default_categories:
        c.execute("SELECT id FROM categories WHERE name = ?", (cat[0],))
        if not c.fetchone():
            c.execute('''
                INSERT INTO categories (name, type, icon, color, description)
                VALUES (?, ?, ?, ?, ?)
            ''', cat)
            print(f"插入分类: {cat[0]}")

    conn.commit()
    conn.close()
    print("数据库初始化完成！")


def create_snapshot():
    """创建资产快照"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 计算各类资产总额
        result = c.execute('''
            SELECT 
                c.type,
                COALESCE(SUM(a.balance), 0) as total
            FROM categories c
            LEFT JOIN accounts a ON c.id = a.category_id AND a.is_active = 1
            GROUP BY c.type
        ''').fetchall()

        totals = {row['type']: row['total'] for row in result}
        total_assets = sum(totals.values())

        if total_assets == 0:
            print("暂无资产数据，无法创建快照")
            conn.close()
            return

        # 获取详细信息
        details = c.execute('''
            SELECT 
                a.name,
                a.balance,
                c.name as category,
                c.type
            FROM accounts a
            JOIN categories c ON a.category_id = c.id
            WHERE a.is_active = 1
            ORDER BY c.type, a.balance DESC
        ''').fetchall()

        import json
        details_json = json.dumps([dict(row) for row in details], ensure_ascii=False)

        # 插入快照
        c.execute('''
            INSERT INTO asset_snapshots 
            (snapshot_date, total_assets, total_liquid, total_investment, total_fixed, details)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().strftime('%Y-%m-%d'),
            total_assets,
            totals.get('流动资产', 0),
            totals.get('投资资产', 0),
            totals.get('固定资产', 0),
            details_json
        ))

        conn.commit()
        print(f"资产快照创建成功 - 总资产: ¥{total_assets:,.2f}")

    except Exception as e:
        print(f"创建快照失败: {e}")
        conn.rollback()

    finally:
        conn.close()


# 工具函数
def execute_query(query, params=None):
    """执行查询并返回结果"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        if params:
            result = c.execute(query, params)
        else:
            result = c.execute(query)

        conn.commit()
        return result.fetchall()

    except Exception as e:
        print(f"查询执行失败: {e}")
        conn.rollback()
        return None

    finally:
        conn.close()


def table_exists(table_name):
    """检查表是否存在"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
    """, (table_name,))

    exists = c.fetchone() is not None
    conn.close()

    return exists


def get_table_info(table_name):
    """获取表结构信息"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute(f"PRAGMA table_info({table_name})")
    columns = c.fetchall()

    conn.close()

    return columns


# 测试数据库连接
if __name__ == '__main__':
    print("测试数据库模块...")
    init_db()

    # 显示所有表
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = c.fetchall()
    print("\n数据库中的表:")
    for table in tables:
        print(f"  - {table['name']}")

    # 显示分类
    c.execute("SELECT * FROM categories")
    categories = c.fetchall()
    print("\n默认分类:")
    for cat in categories:
        print(f"  - {cat['name']} ({cat['type']})")

    conn.close()