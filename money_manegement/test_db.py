# test_db.py
import sqlite3
import os

# 删除旧数据库
if os.path.exists('finance.db'):
    os.remove('finance.db')
    print("已删除旧数据库")

# 创建新连接
conn = sqlite3.connect('finance.db')
c = conn.cursor()

try:
    # 1. 创建分类表
    print("创建分类表...")
    c.execute('''
        CREATE TABLE categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            type TEXT NOT NULL,
            icon TEXT,
            color TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print("分类表创建成功")

    # 2. 创建账户表
    print("创建账户表...")
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
    print("账户表创建成功")

    # 3. 验证列是否存在
    c.execute("PRAGMA table_info(accounts)")
    columns = c.fetchall()
    print("\n账户表的列：")
    for col in columns:
        print(f"  {col[1]} - {col[2]}")

    # 4. 尝试创建索引
    print("\n创建索引...")
    c.execute('CREATE INDEX idx_accounts_category ON accounts(category_id)')
    print("索引创建成功")

    conn.commit()
    print("\n数据库测试成功！")

except Exception as e:
    print(f"\n错误: {e}")
    import traceback

    traceback.print_exc()

finally:
    conn.close()