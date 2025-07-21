// 主应用逻辑
let currentView = 'dashboard';
let accountsData = [];
let categoriesData = [];
let assetSummary = {};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadDashboard();
});

// 初始化应用
function initializeApp() {
    // 检查本地存储的主题设置
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);

    // 设置当前日期
    const today = new Date().toLocaleDateString('zh-CN');
    document.querySelectorAll('.current-date').forEach(el => {
        el.textContent = today;
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 导航菜单点击事件
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // 模态框关闭事件
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    // 点击模态框外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    });

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // 表单提交事件
    document.getElementById('accountForm')?.addEventListener('submit', handleAccountSubmit);
    document.getElementById('transactionForm')?.addEventListener('submit', handleTransactionSubmit);

    // 移动端菜单切换
    document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);

    // 侧边栏遮罩层点击
    document.getElementById('sidebarOverlay')?.addEventListener('click', function() {
        document.querySelector('.sidebar').classList.remove('show');
        this.classList.remove('show');
    });
}

// 导航处理
function handleNavigation(e) {
    e.preventDefault();
    const target = e.currentTarget.getAttribute('data-target');

    // 更新活动状态
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.currentTarget.classList.add('active');

    // 切换视图
    switchView(target);

    // 移动端关闭侧边栏
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('show');
        document.getElementById('sidebarOverlay').classList.remove('show');
    }
}

// 切换视图
function switchView(view) {
    currentView = view;

    // 隐藏所有视图
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.add('d-none');
    });

    // 显示当前视图
    const currentSection = document.getElementById(`${view}-view`);
    if (currentSection) {
        currentSection.classList.remove('d-none');
    }

    // 更新导航高亮
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-target') === view) {
            link.classList.add('active');
        }
    });

    // 加载对应数据
    switch(view) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'accounts':
            loadAccounts();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'analytics':
            loadAnalytics();
            break;
    }
}

// 加载仪表板数据
async function loadDashboard() {
    try {
        // 加载资产汇总
        const summaryRes = await fetch('/api/analytics/summary');
        assetSummary = await summaryRes.json();
        updateDashboardStats();

        // 加载资产分布
        const distributionRes = await fetch('/api/analytics/distribution');
        const distribution = await distributionRes.json();
        updateDistributionCharts(distribution);

        // 加载最近交易
        const transactionsRes = await fetch('/api/transactions?limit=5');
        const transactions = await transactionsRes.json();
        updateRecentTransactions(transactions);

        // 加载趋势数据
        const trendRes = await fetch('/api/analytics/trend?days=30');
        const trendData = await trendRes.json();
        updateTrendChart(trendData);

        // 初始化仪表板特有功能
        if (typeof dashboard !== 'undefined' && dashboard.init) {
            dashboard.init();
        }

    } catch (error) {
        showToast('加载数据失败', 'error');
        console.error('Error loading dashboard:', error);
    }
}

// 更新仪表板统计
function updateDashboardStats() {
    // 总资产
    document.getElementById('total-assets').textContent = formatCurrency(assetSummary.total_assets);

    // 流动资产
    const liquidCard = document.querySelector('.asset-type-card.liquid');
    if (liquidCard) {
        liquidCard.querySelector('.asset-type-value').textContent = formatCurrency(assetSummary.total_liquid);
        liquidCard.querySelector('.asset-type-count').textContent = `${assetSummary.liquid_ratio.toFixed(1)}% 占比`;
    }

    // 投资资产
    const investmentCard = document.querySelector('.asset-type-card.investment');
    if (investmentCard) {
        investmentCard.querySelector('.asset-type-value').textContent = formatCurrency(assetSummary.total_investment);
        investmentCard.querySelector('.asset-type-count').textContent = `${assetSummary.investment_ratio.toFixed(1)}% 占比`;
    }

    // 固定资产
    const fixedCard = document.querySelector('.asset-type-card.fixed');
    if (fixedCard) {
        fixedCard.querySelector('.asset-type-value').textContent = formatCurrency(assetSummary.total_fixed);
        fixedCard.querySelector('.asset-type-count').textContent = `${assetSummary.fixed_ratio.toFixed(1)}% 占比`;
    }

    // 账户和交易数量
    document.getElementById('account-count').textContent = assetSummary.account_count;
    document.getElementById('transaction-count').textContent = assetSummary.transaction_count;
    document.getElementById('accountCount').textContent = assetSummary.account_count;
}

// 加载账户列表
async function loadAccounts() {
    try {
        // 加载分类
        const categoriesRes = await fetch('/api/categories/stats');
        categoriesData = await categoriesRes.json();

        // 加载账户
        const accountsRes = await fetch('/api/accounts');
        accountsData = await accountsRes.json();

        // 按类型分组显示
        const accountsByType = await fetch('/api/accounts/by-type');
        const groupedAccounts = await accountsByType.json();

        renderAccountsByType(groupedAccounts);

    } catch (error) {
        showToast('加载账户失败', 'error');
        console.error('Error loading accounts:', error);
    }
}

// 渲染账户列表
function renderAccountsByType(groupedAccounts) {
    const container = document.getElementById('accounts-container');
    container.innerHTML = '';

    for (const [type, accounts] of Object.entries(groupedAccounts)) {
        if (accounts.length === 0) continue;

        const section = document.createElement('div');
        section.className = 'accounts-section mb-3';

        const typeTotal = accounts.reduce((sum, acc) => sum + acc.balance, 0);

        section.innerHTML = `
            <div class="section-header">
                <div>
                    <h3 class="section-title">${type}</h3>
                    <p class="text-muted">共 ${accounts.length} 个账户，总计 ${formatCurrency(typeTotal)}</p>
                </div>
                <button class="btn btn-sm btn-primary" onclick="openAccountModal('${type}')">
                    <i class="bi bi-plus"></i> 添加账户
                </button>
            </div>
            <div class="accounts-grid">
                ${accounts.map(account => renderAccountCard(account)).join('')}
            </div>
        `;

        container.appendChild(section);
    }
}

// 渲染单个账户卡片
function renderAccountCard(account) {
    const changeClass = account.balance > account.initial_balance ? 'positive' : 'negative';
    const changeAmount = Math.abs(account.balance - account.initial_balance);
    const changePercent = account.initial_balance > 0
        ? ((account.balance - account.initial_balance) / account.initial_balance * 100).toFixed(1)
        : 0;

    return `
        <div class="account-card" data-account-id="${account.id}" data-category-type="${account.category_type}">
            <div class="account-header">
                <div class="account-info">
                    <h4 class="account-name">${account.name}</h4>
                    <p class="account-platform">${account.platform || '未设置平台'}</p>
                </div>
                <div class="account-category-badge" style="background-color: ${account.category_color}20; color: ${account.category_color}">
                    <span>${account.category_icon || '📦'}</span>
                    <span>${account.category_name}</span>
                </div>
            </div>
            <div class="account-balance">${formatCurrency(account.balance)}</div>
            <div class="account-footer">
                <div class="account-number">${account.account_number ? `****${account.account_number}` : ''}</div>
                <div class="account-actions">
                    <button class="btn btn-sm btn-icon btn-secondary" onclick="editAccount(${account.id})" title="编辑">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-icon btn-secondary" onclick="showAccountDetails(${account.id})" title="详情">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 加载交易列表
async function loadTransactions() {
    try {
        const res = await fetch('/api/transactions');
        const transactions = await res.json();

        const container = document.getElementById('transactions-container');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💸</div>
                    <div class="empty-state-title">暂无交易记录</div>
                    <div class="empty-state-description">开始记录您的第一笔交易吧</div>
                    <button class="btn btn-primary" onclick="openTransactionModal()">
                        <i class="bi bi-plus"></i> 添加交易
                    </button>
                </div>
            `;
            return;
        }

        // 创建交易表格
        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>日期</th>
                            <th>账户</th>
                            <th>类型</th>
                            <th>金额</th>
                            <th>说明</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactions.map(tx => `
                            <tr>
                                <td>${formatDate(tx.date)}</td>
                                <td>${tx.account_name || '-'}</td>
                                <td><span class="type-badge ${tx.type === '收入' ? 'income' : 'expense'}">${tx.type}</span></td>
                                <td class="amount ${tx.type === '收入' ? 'income' : 'expense'}">
                                    ${tx.type === '收入' ? '+' : '-'}${formatCurrency(tx.amount)}
                                </td>
                                <td>${tx.description || '-'}</td>
                                <td class="actions">
                                    <button class="btn btn-sm btn-icon btn-secondary" onclick="editTransaction(${tx.id})">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm btn-icon btn-danger" onclick="deleteTransaction(${tx.id})">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

    } catch (error) {
        console.error('Error loading transactions:', error);
        showToast('加载交易记录失败', 'error');
    }
}

// 加载数据分析
// 加载数据分析
async function loadAnalytics() {
    try {
        const container = document.getElementById('analytics-container');
        if (!container) return;

        // 加载月度统计
        const monthlyRes = await fetch('/api/analytics/monthly-stats');
        const monthlyStats = await monthlyRes.json();

        // 加载收支汇总
        const incomeExpenseRes = await fetch('/api/analytics/income-expense');
        const incomeExpense = await incomeExpenseRes.json();

        // 加载资产趋势数据
        const trendRes = await fetch('/api/analytics/trend?days=90');
        const trendData = await trendRes.json();

        container.innerHTML = `
            <div class="analytics-content">
                <div class="chart-card">
                    <h3 class="chart-title">月度收支对比</h3>
                    <div class="chart-wrapper">
                        <canvas id="monthlyChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3 class="chart-title">分类支出分析</h3>
                    <div class="chart-wrapper">
                        <canvas id="categoryChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3 class="chart-title">资产增长趋势</h3>
                    <div class="chart-wrapper">
                        <canvas id="growthChart"></canvas>
                    </div>
                </div>

                <div class="chart-card">
                    <h3 class="chart-title">收支分类明细</h3>
                    <div class="chart-wrapper">
                        <canvas id="categoryDoughnutChart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // 创建图表
        setTimeout(() => {
            // 1. 月度收支对比
            createMonthlyChart(monthlyStats);

            // 2. 分类支出分析
            if (incomeExpense.by_category) {
                createCategoryAnalysisChart(incomeExpense.by_category);
            }

            // 3. 资产增长趋势
            if (trendData && trendData.length > 0) {
                createAssetGrowthChartForAnalytics(trendData);
            }

            // 4. 收支分类明细
            if (incomeExpense.by_category) {
                createCategoryDoughnutChart(incomeExpense.by_category);
            }
        }, 100);

    } catch (error) {
        console.error('Error loading analytics:', error);
        showToast('加载分析数据失败', 'error');
    }
}

// 打开账户模态框
function openAccountModal(defaultType = null) {
    const modal = document.getElementById('accountModal');
    modal.classList.add('show');

    // 加载分类选项
    loadCategoryOptions();

    // 设置默认类型
    if (defaultType) {
        setTimeout(() => {
            const defaultCategory = categoriesData.find(cat => cat.type === defaultType);
            if (defaultCategory) {
                document.getElementById('accountCategory').value = defaultCategory.id;
            }
        }, 100);
    }

    // 清空表单
    document.getElementById('accountForm').reset();
    document.getElementById('accountId').value = '';
    document.getElementById('modalTitle').textContent = '新增账户';
}

// 加载分类选项
async function loadCategoryOptions() {
    const select = document.getElementById('accountCategory');
    select.innerHTML = '<option value="">请选择分类</option>';

    if (categoriesData.length === 0) {
        const res = await fetch('/api/categories/stats');
        categoriesData = await res.json();
    }

    categoriesData.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = `${category.icon || ''} ${category.name} (${category.type})`;
        select.appendChild(option);
    });
}

// 编辑账户
async function editAccount(accountId) {
    try {
        const res = await fetch(`/api/accounts/${accountId}`);
        const account = await res.json();

        // 填充表单
        document.getElementById('accountId').value = account.id;
        document.getElementById('accountName').value = account.name;
        document.getElementById('accountCategory').value = account.category_id;
        document.getElementById('accountBalance').value = account.balance;
        document.getElementById('accountPlatform').value = account.platform || '';
        document.getElementById('accountNumber').value = account.account_number || '';
        document.getElementById('accountDescription').value = account.description || '';

        // 打开模态框
        document.getElementById('modalTitle').textContent = '编辑账户';
        document.getElementById('accountModal').classList.add('show');

        // 加载分类选项
        await loadCategoryOptions();
        document.getElementById('accountCategory').value = account.category_id;

    } catch (error) {
        showToast('获取账户信息失败', 'error');
        console.error('Error loading account:', error);
    }
}

// 处理账户表单提交
async function handleAccountSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const accountId = formData.get('accountId');

    const data = {
        name: formData.get('name'),
        category_id: parseInt(formData.get('category_id')),
        balance: parseFloat(formData.get('balance')),
        platform: formData.get('platform'),
        account_number: formData.get('account_number'),
        description: formData.get('description')
    };

    if (!accountId) {
        data.initial_balance = data.balance;
    }

    try {
        const url = accountId ? `/api/accounts/${accountId}` : '/api/accounts';
        const method = accountId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showToast(accountId ? '账户更新成功' : '账户创建成功', 'success');
            closeModal();
            loadAccounts();
            loadDashboard();
        } else {
            throw new Error('操作失败');
        }

    } catch (error) {
        showToast('操作失败，请重试', 'error');
        console.error('Error saving account:', error);
    }
}

// 显示账户详情
async function showAccountDetails(accountId) {
    try {
        // 获取账户信息
        const accountRes = await fetch(`/api/accounts/${accountId}`);
        const account = await accountRes.json();

        // 获取账户交易记录
        const transactionsRes = await fetch(`/api/transactions?account_id=${accountId}&limit=20`);
        const transactions = await transactionsRes.json();

        // 显示详情模态框
        showAccountDetailModal(account, transactions);

    } catch (error) {
        showToast('获取账户详情失败', 'error');
        console.error('Error loading account details:', error);
    }
}

// 打开交易模态框
function openTransactionModal() {
    const modal = document.getElementById('transactionModal');
    modal.classList.add('show');

    // 加载账户列表
    loadAccountsForTransaction();

    // 清空表单
    document.getElementById('transactionForm').reset();
    document.getElementById('transactionId').value = '';

    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;
}

// 加载账户到交易表单
async function loadAccountsForTransaction() {
    try {
        const res = await fetch('/api/accounts');
        const accounts = await res.json();
        const select = document.getElementById('transactionAccount');

        select.innerHTML = '<option value="">请选择账户</option>';
        accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = `${acc.name} (${formatCurrency(acc.balance)})`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error loading accounts:', error);
    }
}

// 处理交易表单提交
async function handleTransactionSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const transactionId = formData.get('transactionId');

    const data = {
        account_id: parseInt(formData.get('account_id')),
        date: formData.get('date') || new Date().toISOString().split('T')[0],
        description: formData.get('description'),
        type: formData.get('type'),
        amount: parseFloat(formData.get('amount')),
        note: formData.get('note')
    };

    try {
        const url = transactionId ? `/api/transactions/${transactionId}` : '/api/transactions';
        const method = transactionId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            showToast(transactionId ? '交易更新成功' : '交易创建成功', 'success');
            closeModal();
            loadTransactions();
            loadDashboard();
            loadAccounts();
        } else {
            throw new Error('操作失败');
        }

    } catch (error) {
        showToast('操作失败，请重试', 'error');
        console.error('Error saving transaction:', error);
    }
}

// 编辑交易
async function editTransaction(transactionId) {
    try {
        const res = await fetch(`/api/transactions/${transactionId}`);
        const transaction = await res.json();

        // 打开模态框
        openTransactionModal();

        // 填充表单
        setTimeout(() => {
            document.getElementById('transactionId').value = transaction.id;
            document.getElementById('transactionAccount').value = transaction.account_id;
            document.getElementById('transactionAmount').value = transaction.amount;
            document.getElementById('transactionDescription').value = transaction.description || '';
            document.getElementById('transactionNote').value = transaction.note || '';
            document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
            document.getElementById('transactionDate').value = transaction.date;
        }, 100);

    } catch (error) {
        showToast('获取交易信息失败', 'error');
        console.error('Error loading transaction:', error);
    }
}

// 删除交易
async function deleteTransaction(transactionId) {
    if (!confirm('确定要删除这条交易记录吗？')) return;

    try {
        const res = await fetch(`/api/transactions/${transactionId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            showToast('交易删除成功', 'success');
            loadTransactions();
            loadDashboard();
            loadAccounts();
        } else {
            throw new Error('删除失败');
        }

    } catch (error) {
        showToast('删除失败，请重试', 'error');
        console.error('Error deleting transaction:', error);
    }
}

// 按类型筛选 - 修复导航高亮问题
function filterByType(type) {
    // 先更新导航栏高亮
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // 高亮账户管理菜单项
    const accountsNavLink = document.querySelector('.nav-link[data-target="accounts"]');
    if (accountsNavLink) {
        accountsNavLink.classList.add('active');
    }

    // 切换到账户视图
    switchView('accounts');

    // 高亮对应的账户卡片
    setTimeout(() => {
        const cards = document.querySelectorAll('.account-card');
        cards.forEach(card => {
            const categoryType = card.getAttribute('data-category-type');
            if (categoryType === type) {
                card.style.border = '2px solid var(--primary-color)';
                // 滚动到第一个匹配的卡片
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                card.style.border = '1px solid transparent';
            }
        });

        // 可选：显示筛选提示
        showToast(`正在显示${type}账户`, 'info');
    }, 300);
}

// 切换分布视图
function switchDistributionView(view) {
    const chartCanvas = document.getElementById('assetTypePieChart');
    if (!chartCanvas) return;

    // 更新按钮状态
    const buttons = event.target.parentElement.querySelectorAll('.chart-option');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // 根据视图类型重新加载图表
    if (view === 'type') {
        // 显示类型分布图
        loadDashboard();
    } else if (view === 'platform') {
        // 显示平台分布图
        loadPlatformDistribution();
    }
}

// 加载平台分布
async function loadPlatformDistribution() {
    try {
        const res = await fetch('/api/analytics/distribution');
        const distribution = await res.json();

        if (distribution.by_platform) {
            // 销毁旧图表
            if (window.charts && window.charts.assetTypePie) {
                window.charts.assetTypePie.destroy();
            }

            // 创建平台分布图
            createPlatformDoughnutChart(distribution.by_platform);
        }
    } catch (error) {
        console.error('Error loading platform distribution:', error);
    }
}

// 切换图表周期
function switchChartPeriod(chartId, period) {
    // 更新按钮状态
    const buttons = event.target.parentElement.querySelectorAll('.chart-option');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // 重新加载数据
    loadChartData(chartId, period);
}

// 加载图表数据
async function loadChartData(chartId, period) {
    try {
        const res = await fetch(`/api/analytics/trend?period=${period}`);
        const data = await res.json();

        switch(chartId) {
            case 'trend':
                updateTrendChart(data);
                break;
            case 'income-expense':
                // 处理收支数据
                break;
        }
    } catch (error) {
        console.error('Error loading chart data:', error);
    }
}

// 创建月度图表
function createMonthlyChart(monthlyStats) {
    const ctx = document.getElementById('monthlyChart');
    if (!ctx) return;

    const months = Object.keys(monthlyStats).slice(0, 12).reverse();
    const incomeData = months.map(m => monthlyStats[m]?.income || 0);
    const expenseData = months.map(m => monthlyStats[m]?.expense || 0);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => {
                const [year, month] = m.split('-');
                return `${parseInt(month)}月`;
            }),
            datasets: [
                {
                    label: '收入',
                    data: incomeData,
                    backgroundColor: 'rgba(46, 213, 115, 0.8)',
                    borderRadius: 4
                },
                {
                    label: '支出',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 72, 0.8)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 13 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 创建分类分析图表
function createCategoryAnalysisChart(categoryData) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const categories = categoryData.map(item => item.category || '未分类');
    const amounts = categoryData.map(item => item.total);

    new Chart(ctx, {
        type: 'bar',  // 修改为 'bar' 而不是 'horizontalBar'
        data: {
            labels: categories,
            datasets: [{
                label: '金额',
                data: amounts,
                backgroundColor: 'rgba(91, 103, 202, 0.8)',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',  // 保持水平条形图
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 显示账户详情模态框
function showAccountDetailModal(account, transactions) {
    // 创建详情模态框HTML
    const modalHtml = `
        <div id="accountDetailModal" class="modal show">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h2 class="modal-title">${account.name} - 账户详情</h2>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="account-detail-info">
                        <div class="detail-item">
                            <span class="detail-label">账户类型：</span>
                            <span>${account.category_name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">所属平台：</span>
                            <span>${account.platform || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">当前余额：</span>
                            <span class="text-primary">${formatCurrency(account.balance)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">初始余额：</span>
                            <span>${formatCurrency(account.initial_balance)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">备注：</span>
                            <span>${account.description || '-'}</span>
                        </div>
                    </div>

                    <h3 class="mt-3">最近交易记录</h3>
                    <div class="transaction-list">
                        ${transactions.length > 0 ? transactions.map(tx => `
                            <div class="transaction-item">
                                <div class="transaction-info">
                                    <div class="transaction-description">${tx.description || '未命名交易'}</div>
                                    <div class="transaction-meta">${formatDate(tx.date)}</div>
                                </div>
                                <div class="transaction-amount ${tx.type === '收入' ? 'income' : 'expense'}">
                                    ${tx.type === '收入' ? '+' : '-'}${formatCurrency(tx.amount)}
                                </div>
                            </div>
                        `).join('') : '<p class="text-muted text-center">暂无交易记录</p>'}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
                    <button class="btn btn-primary" onclick="editAccount(${account.id})">编辑账户</button>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
}

// 格式化货币
function formatCurrency(amount) {
    return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

// 显示提示消息
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 动画显示
    setTimeout(() => toast.classList.add('show'), 10);

    // 3秒后移除
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 关闭模态框
function closeModal() {
    document.querySelectorAll('.modal.show').forEach(modal => {
        modal.classList.remove('show');
    });
    // 移除动态创建的模态框
    document.getElementById('accountDetailModal')?.remove();
}

// 切换侧边栏
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 添加必要的样式
if (!document.getElementById('additional-styles')) {
    const styles = document.createElement('style');
    styles.id = 'additional-styles';
    styles.innerHTML = `
        .table-container {
            background: white;
            border-radius: var(--radius-lg);
            padding: 24px;
            overflow-x: auto;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
        }

        .data-table th,
        .data-table td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--gray-200);
        }

        .data-table th {
            background-color: var(--gray-50);
            font-weight: 600;
            color: var(--gray-700);
            font-size: 14px;
        }

        .data-table tbody tr:hover {
            background-color: var(--gray-50);
        }

        .data-table .amount {
            font-weight: 600;
        }

        .data-table .amount.income {
            color: var(--success-color);
        }

        .data-table .amount.expense {
            color: var(--danger-color);
        }

        .type-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: var(--radius-sm);
            font-size: 12px;
            font-weight: 500;
        }

        .type-badge.income {
            background-color: rgba(46, 213, 115, 0.1);
            color: var(--success-color);
        }

        .type-badge.expense {
            background-color: rgba(255, 99, 72, 0.1);
            color: var(--danger-color);
        }

        .analytics-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 24px;
        }

        .account-detail-info {
            background-color: var(--gray-50);
            padding: 20px;
            border-radius: var(--radius-md);
            margin-bottom: 20px;
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--gray-200);
        }

        .detail-item:last-child {
            border-bottom: none;
        }

        .detail-label {
            font-weight: 600;
            color: var(--gray-600);
        }

        @media (max-width: 768px) {
            .analytics-content {
                grid-template-columns: 1fr;
            }

            .sidebar.show {
                box-shadow: var(--shadow-xl);
            }

            .sidebar-overlay.show {
                display: block;
            }
        }
    `;
    document.head.appendChild(styles);
}

// 为数据分析页面创建资产增长图表
function createAssetGrowthChartForAnalytics(trendData) {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;

    // 销毁旧图表
    if (window.charts.analyticsGrowth) {
        window.charts.analyticsGrowth.destroy();
    }

    window.charts.analyticsGrowth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.map(item => formatDate(item.date)),
            datasets: [{
                label: '总资产',
                data: trendData.map(item => item.total_assets),
                borderColor: '#5b67ca',
                backgroundColor: 'rgba(91, 103, 202, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `总资产: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        maxTicksLimit: 8
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// 创建收支分类明细甜甜圈图
function createCategoryDoughnutChart(categoryData) {
    const ctx = document.getElementById('categoryDoughnutChart');
    if (!ctx) return;

    // 销毁旧图表
    if (window.charts.categoryDoughnut) {
        window.charts.categoryDoughnut.destroy();
    }

    // 分离收入和支出数据，并排序
    const incomeCategories = categoryData
        .filter(item => item.type === '收入')
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    const expenseCategories = categoryData
        .filter(item => item.type === '支出')
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    // 合并数据用于显示
    const allCategories = [...incomeCategories, ...expenseCategories];

    if (allCategories.length === 0) {
        // 如果没有数据，显示空状态
        ctx.parentElement.innerHTML = `
            <div class="empty-state" style="height: 100%; display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center;">
                    <div style="font-size: 48px; color: #e0e0e0; margin-bottom: 16px;">📊</div>
                    <div style="color: #999;">暂无收支分类数据</div>
                    <div style="color: #999; font-size: 12px; margin-top: 8px;">请先添加一些交易记录</div>
                </div>
            </div>
        `;
        return;
    }

    // 配色方案：收入用绿色系，支出用红色系
    const colors = allCategories.map((item, index) => {
        if (item.type === '收入') {
            // 绿色系
            return ['#2ed573', '#26d765', '#1ed957', '#16db49', '#0edd3b'][index % 5];
        } else {
            // 红色系
            return ['#ff6348', '#ff5a3a', '#ff512c', '#ff481e', '#ff3f10'][index % 5];
        }
    });

    window.charts.categoryDoughnut = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: allCategories.map(item => `${item.category || '未分类'} (${item.type})`),
            datasets: [{
                data: allCategories.map(item => item.total),
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 10,
                        usePointStyle: true,
                        font: { size: 12 },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                const dataset = data.datasets[0];
                                const total = dataset.data.reduce((a, b) => a + b, 0);

                                return data.labels.map((label, i) => {
                                    const value = dataset.data[i];
                                    const percentage = ((value / total) * 100).toFixed(1);

                                    return {
                                        text: `${label}: ${percentage}%`,
                                        fillStyle: dataset.backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}