// 仪表板功能模块
const dashboard = {
    // 初始化
    init() {
        this.setupEventHandlers();
        this.loadWidgets();
    },

    // 设置事件处理器
    setupEventHandlers() {
        // 刷新按钮
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            this.refresh();
        });

        // 快速记账按钮
        document.getElementById('quickAddTransaction')?.addEventListener('click', () => {
            openTransactionModal();
        });
    },

    // 刷新仪表板
    refresh() {
        const refreshBtn = document.getElementById('refreshDashboard');
        const icon = refreshBtn.querySelector('i');

        // 添加旋转动画
        icon.classList.add('spinning');

        // 重新加载仪表板
        loadDashboard().then(() => {
            // 更新最后更新时间
            document.getElementById('lastUpdateTime').textContent = '刚刚';

            // 停止旋转动画
            setTimeout(() => {
                icon.classList.remove('spinning');
                showToast('数据已更新', 'success');
            }, 500);
        });
    },

    // 加载小部件
    loadWidgets() {
        this.loadFinancialRatios();
        this.loadMonthlyComparison();
        this.loadAssetAllocation();
        this.loadAdditionalCharts();
    },

    // 加载财务比率
    async loadFinancialRatios() {
        try {
            // 修正API路径
            const res = await fetch('/api/analytics/ratios');
            const ratios = await res.json();

            // 流动性比率
            const liquidityEl = document.getElementById('liquidityRatio');
            if (liquidityEl) {
                liquidityEl.textContent = `${ratios.liquidity_ratio.toFixed(1)}%`;
            }

            // 月储蓄率
            const savingsEl = document.getElementById('savingsRate');
            if (savingsEl) {
                savingsEl.textContent = `${ratios.savings_rate.toFixed(1)}%`;
                savingsEl.className = ratios.savings_rate > 0 ? 'metric-value text-success' : 'metric-value text-danger';
            }

            // 应急基金
            const emergencyEl = document.getElementById('emergencyFund');
            if (emergencyEl) {
                if (ratios.emergency_fund_months >= 999) {
                    emergencyEl.textContent = '充足';
                    emergencyEl.className = 'metric-value text-success';
                } else {
                    emergencyEl.textContent = `${ratios.emergency_fund_months.toFixed(1)}个月`;
                    emergencyEl.className = ratios.emergency_fund_months >= 6 ? 'metric-value text-success' : 'metric-value text-warning';
                }
            }

        } catch (error) {
            console.error('Error loading financial ratios:', error);
        }
    },

    // 加载月度对比
    async loadMonthlyComparison() {
        try {
            const res = await fetch('/api/analytics/monthly-stats');
            const monthlyStats = await res.json();

            // 获取本月和上月数据
            const currentMonth = new Date().toISOString().slice(0, 7);
            const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

            const currentData = monthlyStats[currentMonth] || { income: 0, expense: 0 };
            const lastData = monthlyStats[lastMonth] || { income: 0, expense: 0 };

            // 计算变化
            this.updateMonthlyChange(currentData, lastData);

        } catch (error) {
            console.error('Error loading monthly comparison:', error);
        }
    },

    // 更新月度变化显示
    updateMonthlyChange(current, last) {
        // 更新卡片上的变化指示器
        const cards = document.querySelectorAll('.asset-type-card');

        // 这里可以根据实际的收支变化更新卡片上的百分比显示
        // 示例：如果本月收入比上月增加，显示正增长
        const incomeChange = last.income > 0
            ? ((current.income - last.income) / last.income * 100).toFixed(1)
            : 0;

        const expenseChange = last.expense > 0
            ? ((current.expense - last.expense) / last.expense * 100).toFixed(1)
            : 0;

        // 更新UI（根据实际需求调整）
    },

    // 加载资产配置建议
    async loadAssetAllocation() {
        try {
            const summary = assetSummary;

            // 计算理想配置
            const idealAllocation = {
                liquid: 20,      // 20% 流动资产（应急基金）
                investment: 60,  // 60% 投资资产
                fixed: 20        // 20% 固定资产
            };

            // 比较实际与理想配置
            const suggestions = [];

            if (summary.liquid_ratio < idealAllocation.liquid - 5) {
                suggestions.push('建议增加流动资产储备，确保应急基金充足');
            }

            if (summary.investment_ratio < idealAllocation.investment - 10) {
                suggestions.push('可以考虑增加投资资产配置，提高资产增值潜力');
            }

            // 显示建议（如果有UI元素的话）
            this.displayAllocationSuggestions(suggestions);

        } catch (error) {
            console.error('Error loading asset allocation:', error);
        }
    },

    // 显示配置建议
    displayAllocationSuggestions(suggestions) {
        // 这里可以在界面上显示建议
        // 例如在一个建议卡片中
    },

    // 加载额外的图表
    async loadAdditionalCharts() {
        try {
            // 加载月度收支对比
            const monthlyRes = await fetch('/api/analytics/monthly-stats');
            const monthlyStats = await monthlyRes.json();

            if (monthlyStats && Object.keys(monthlyStats).length > 0) {
                this.createMonthlyIncomeExpenseChart(monthlyStats);
            }

            // 加载资产增长趋势
            const trendRes = await fetch('/api/analytics/trend?days=90');
            const trendData = await trendRes.json();

            if (trendData && trendData.length > 0) {
                this.createAssetGrowthChart(trendData);
            }

            // 加载收支分类明细
            const categoryRes = await fetch('/api/analytics/income-expense');
            const categoryData = await categoryRes.json();

            if (categoryData && categoryData.by_category) {
                this.createCategoryBreakdownChart(categoryData.by_category);
            }

        } catch (error) {
            console.error('Error loading additional charts:', error);
        }
    },

    // 创建月度收支对比图表
    createMonthlyIncomeExpenseChart(monthlyStats) {
        const ctx = document.getElementById('monthlyIncomeExpenseChart');
        if (!ctx) return;

        // 销毁旧图表
        if (window.charts.monthlyIncomeExpense) {
            window.charts.monthlyIncomeExpense.destroy();
        }

        const months = Object.keys(monthlyStats).slice(-6).reverse();
        const incomeData = months.map(m => monthlyStats[m]?.income || 0);
        const expenseData = months.map(m => monthlyStats[m]?.expense || 0);

        window.charts.monthlyIncomeExpense = new Chart(ctx, {
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
    },

    // 创建资产增长图表
    createAssetGrowthChart(trendData) {
        const ctx = document.getElementById('assetGrowthChart');
        if (!ctx) return;

        // 销毁旧图表
        if (window.charts.assetGrowth) {
            window.charts.assetGrowth.destroy();
        }

        // 确保使用全局定义的颜色
        const primaryColor = window.chartColors ? window.chartColors.primary : '#5b67ca';

        window.charts.assetGrowth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendData.map(item => formatDate(item.date)),
                datasets: [{
                    label: '总资产',
                    data: trendData.map(item => item.total_assets),
                    borderColor: primaryColor,
                    backgroundColor: `${primaryColor}1A`, // 使用透明度
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
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
    },

    // 创建收支分类明细图表
    createCategoryBreakdownChart(categoryData) {
        const ctx = document.getElementById('categoryBreakdownChart');
        if (!ctx) return;

        // 销毁旧图表
        if (window.charts.categoryBreakdown) {
            window.charts.categoryBreakdown.destroy();
        }

        // 分离收入和支出数据
        const incomeCategories = categoryData.filter(item => item.type === '收入');
        const expenseCategories = categoryData.filter(item => item.type === '支出');

        // 选择金额较大的类别进行展示
        const topCategories = [...incomeCategories, ...expenseCategories]
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        if (topCategories.length === 0) {
            // 如果没有数据，显示提示
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

        const colors = [
            '#5b67ca', '#2ed573', '#ff6348', '#ffa502',
            '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'
        ];

        window.charts.categoryBreakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: topCategories.map(item => `${item.category || '未分类'} (${item.type})`),
                datasets: [{
                    data: topCategories.map(item => item.total),
                    backgroundColor: colors.slice(0, topCategories.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 10,
                            usePointStyle: true,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = formatCurrency(context.parsed);
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        });
    }
};

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // dashboard.init() 会在 loadDashboard() 中被调用
});