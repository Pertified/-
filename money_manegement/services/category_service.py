# services/category_service.py
from database.database import get_db_connection
from database.models import Category


def list_categories():
    """获取所有资产分类"""
    conn = get_db_connection()
    categories = conn.execute('''
        SELECT * FROM categories 
        ORDER BY 
            CASE type 
                WHEN '流动资产' THEN 1 
                WHEN '投资资产' THEN 2 
                WHEN '固定资产' THEN 3 
                ELSE 4 
            END, 
            name
    ''').fetchall()
    conn.close()
    return categories


def get_category(category_id):
    """获取单个分类信息"""
    conn = get_db_connection()
    category = conn.execute('SELECT * FROM categories WHERE id = ?', (category_id,)).fetchone()
    conn.close()
    return category


def add_category(name, type, icon=None, color=None, description=None):
    """添加新分类"""
    conn = get_db_connection()
    cursor = conn.execute('''
        INSERT INTO categories (name, type, icon, color, description)
        VALUES (?, ?, ?, ?, ?)
    ''', (name, type, icon, color, description))
    category_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return category_id


def update_category(category_id, name, type, icon=None, color=None, description=None):
    """更新分类信息"""
    conn = get_db_connection()
    conn.execute('''
        UPDATE categories 
        SET name = ?, type = ?, icon = ?, color = ?, description = ?
        WHERE id = ?
    ''', (name, type, icon, color, description, category_id))
    conn.commit()
    conn.close()


def delete_category(category_id):
    """删除分类（需要先检查是否有关联账户）"""
    conn = get_db_connection()

    # 检查是否有关联账户
    count = conn.execute('SELECT COUNT(*) FROM accounts WHERE category_id = ?', (category_id,)).fetchone()[0]
    if count > 0:
        conn.close()
        raise ValueError(f"无法删除分类，还有 {count} 个账户使用此分类")

    conn.execute('DELETE FROM categories WHERE id = ?', (category_id,))
    conn.commit()
    conn.close()


def get_categories_with_stats():
    """获取分类及其统计信息"""
    conn = get_db_connection()
    categories = conn.execute('''
        SELECT 
            c.*,
            COUNT(DISTINCT a.id) as account_count,
            COALESCE(SUM(a.balance), 0) as total_balance
        FROM categories c
        LEFT JOIN accounts a ON c.id = a.category_id AND a.is_active = 1
        GROUP BY c.id
        ORDER BY 
            CASE c.type 
                WHEN '流动资产' THEN 1 
                WHEN '投资资产' THEN 2 
                WHEN '固定资产' THEN 3 
                ELSE 4 
            END, 
            c.name
    ''').fetchall()
    conn.close()
    return categories