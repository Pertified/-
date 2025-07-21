# database/models.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Category:
    """资产分类模型"""
    id: int
    name: str
    type: str  # 流动资产、投资资产、固定资产、其他资产
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class Account:
    """账户模型"""
    id: int
    name: str
    category_id: int
    balance: float
    initial_balance: float = 0.0
    currency: str = 'CNY'
    platform: Optional[str] = None  # 银行、支付宝、微信等
    account_number: Optional[str] = None  # 账号后四位
    description: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # 关联数据
    category: Optional[Category] = None


@dataclass
class Transaction:
    """交易记录模型"""
    id: int
    account_id: int
    date: str  # YYYY-MM-DD
    description: str
    type: str  # 收入、支出、转账
    amount: float  # 移到没有默认值的参数之前
    category: Optional[str] = None  # 交易分类
    balance_after: Optional[float] = None
    note: Optional[str] = None
    created_at: Optional[datetime] = None

    # 关联数据
    account: Optional[Account] = None


@dataclass
class AssetSnapshot:
    """资产快照模型"""
    id: int
    snapshot_date: str
    total_assets: float
    total_liquid: float = 0.0
    total_investment: float = 0.0
    total_fixed: float = 0.0
    details: Optional[str] = None  # JSON格式
    created_at: Optional[datetime] = None


@dataclass
class AssetSummary:
    """资产汇总信息"""
    total_assets: float
    total_liquid: float
    total_investment: float
    total_fixed: float
    total_other: float
    account_count: int
    transaction_count: int
    last_update: Optional[str] = None

    @property
    def liquid_ratio(self) -> float:
        """流动资产占比"""
        return self.total_liquid / self.total_assets * 100 if self.total_assets > 0 else 0

    @property
    def investment_ratio(self) -> float:
        """投资资产占比"""
        return self.total_investment / self.total_assets * 100 if self.total_assets > 0 else 0

    @property
    def fixed_ratio(self) -> float:
        """固定资产占比"""
        return self.total_fixed / self.total_assets * 100 if self.total_assets > 0 else 0