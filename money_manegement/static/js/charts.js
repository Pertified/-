// 图表配置和管理
window.charts = window.charts || {};

// 确保 chartColors 是全局可访问的
window.chartColors = {
    primary: '#5b67ca',
    success: '#2ed573',
    danger: '#ff6348',
    warning: '#ffa502',
    info: '#5f27cd',
    liquid: '#2ed573',
    investment: '#5b67ca',
    fixed: '#fdb94e',
    other: '#9e9e9e'
};

// Chart.js 默认配置
Chart.defaults.font.family = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
Chart.defaults.color = '#6b6e7c';

// 颜色配置
const chartColors = {
    primary: '#5b67ca',
    success: '#2ed573',
    danger: '#ff6348',
    warning: '#ffa502',
    info: '#5f27cd',
    liquid: '#2ed573',
    investment: '#5b67ca',
    fixed: '#fdb94e',
    other: '#9e9e9e'
};

// 渐变色生成
function createGradient(ctx, color1, color2) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
}

// 更新资产分布图表
function updateDistributionCharts(distribution) {
    // 按类型分布饼图
    if (distribution.by_type && distribution.by_type.length > 0) {
        createAssetTypePieChart(distribution.by_type);
    }

    // 按分类分布条形图
    if (distribution.by_category && distribution.by_category.length > 0) {
        createCategoryBarChart(distribution.by_category);
    }

    // 按平台分布甜甜圈图
    if (distribution.by_platform && distribution.by_platform.length > 0) {
        // 这个会在用户点击"按平台"按钮时调用
        window.platformDistribution = distribution.by_platform;
    }
}

// 创建资产类型饼图
function createAssetTypePieChart(data) {
    const ctx = document.getElementById('assetTypePieChart');
    if (!ctx) return;

    // 销毁已存在的图表
    if (window.charts.assetTypePie) {
        window.charts.assetTypePie.destroy();
    }

    const chartData = {
        labels: data.map(item => item.type),
        datasets: [{
            data: data.map(item => item.total),
            backgroundColor: [
                chartColors.liquid,
                chartColors.investment,
                chartColors.fixed,
                chartColors.other
            ],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };

    window.charts.assetTypePie = new Chart(ctx, {
        type: 'pie',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: { size: 13 }
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

// 创建分类条形图
function createCategoryBarChart(data) {
    const ctx = document.getElementById('categoryBarChart');
    if (!ctx) return;

    if (window.charts.categoryBar) {
        window.charts.categoryBar.destroy();
    }

    // 按金额排序并取前10
    const sortedData = data.sort((a, b) => b.total - a.total).slice(0, 10);

    const chartData = {
        labels: sortedData.map(item => item.name),
        datasets: [{
            label: '余额',
            data: sortedData.map(item => item.total),
            backgroundColor: sortedData.map(item => item.color || chartColors.primary),
            borderRadius: 6
        }]
    };

    window.charts.categoryBar = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.parsed.x);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                },
                y: {
                    grid: { display: false }
                }
            }
        }
    });
}

// 创建平台分布甜甜圈图
function createPlatformDoughnutChart(data) {
    const ctx = document.getElementById('assetTypePieChart');
    if (!ctx) return;

    if (window.charts.assetTypePie) {
        window.charts.assetTypePie.destroy();
    }

    // 如果没有数据，使用存储的数据
    if (!data && window.platformDistribution) {
        data = window.platformDistribution;
    }

    if (!data || data.length === 0) return;

    const colors = [
        '#5b67ca', '#2ed573', '#ff6348', '#ffa502',
        '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'
    ];

    const chartData = {
        labels: data.map(item => item.platform || '未设置'),
        datasets: [{
            data: data.map(item => item.total),
            backgroundColor: colors.slice(0, data.length),
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };

    window.charts.assetTypePie = new Chart(ctx, {
        type: 'doughnut',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
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

// 更新趋势图表
function updateTrendChart(trendData) {
    const ctx = document.getElementById('assetTrendChart');
    if (!ctx) return;

    if (window.charts.assetTrend) {
        window.charts.assetTrend.destroy();
    }

    const chartData = {
        labels: trendData.map(item => formatDate(item.date)),
        datasets: [{
            label: '总资产',
            data: trendData.map(item => item.total_assets),
            borderColor: chartColors.primary,
            backgroundColor: createGradient(ctx.getContext('2d'),
                chartColors.primary + '20',
                chartColors.primary + '00'
            ),
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6
        }]
    };

    // 如果有分类数据，添加更多数据集
    if (trendData[0] && trendData[0].liquid !== undefined) {
        chartData.datasets.push(
            {
                label: '流动资产',
                data: trendData.map(item => item.liquid || 0),
                borderColor: chartColors.liquid,
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            },
            {
                label: '投资资产',
                data: trendData.map(item => item.investment || 0),
                borderColor: chartColors.investment,
                borderWidth: 2,
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4
            }
        );
    }

    window.charts.assetTrend = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: chartData.datasets.length > 1,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        font: { size: 13 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = formatCurrency(context.parsed.y);
                            return `${label}: ${value}`;
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
                    grid: {
                        color: '#f0f0f0'
                    },
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

// 创建收支对比图表
function createIncomeExpenseChart(incomeData, expenseData) {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;

    if (window.charts.incomeExpense) {
        window.charts.incomeExpense.destroy();
    }

    const labels = getLast12Months();

    const chartData = {
        labels: labels,
        datasets: [
            {
                label: '收入',
                data: incomeData,
                backgroundColor: chartColors.success,
                borderRadius: 4
            },
            {
                label: '支出',
                data: expenseData,
                backgroundColor: chartColors.danger,
                borderRadius: 4
            }
        ]
    };

    window.charts.incomeExpense = new Chart(ctx, {
        type: 'bar',
        data: chartData,
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
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = formatCurrency(context.parsed.y);
                            return `${label}: ${value}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }
                },
                y: {
                    grid: {
                        color: '#f0f0f0'
                    },
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

// 获取最近12个月
function getLast12Months() {
    const months = [];
    const date = new Date();

    for (let i = 11; i >= 0; i--) {
        const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
        months.push(d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short' }));
    }

    return months;
}

// 更新最近交易显示
function updateRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    if (!container) return;

    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <div class="empty-state-title">暂无交易记录</div>
                <div class="empty-state-description">开始记录您的第一笔交易吧</div>
                <button class="btn btn-primary btn-sm" onclick="openTransactionModal()">
                    <i class="bi bi-plus"></i> 添加交易
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = transactions.map(tx => {
        const icon = tx.type === '收入' ? '📈' : '📉';
        const amountClass = tx.type === '收入' ? 'income' : 'expense';
        const amountPrefix = tx.type === '收入' ? '+' : '-';

        return `
            <div class="transaction-item">
                <div class="transaction-icon ${tx.type === '收入' ? 'income' : 'expense'}">
                    ${icon}
                </div>
                <div class="transaction-info">
                    <div class="transaction-description">${tx.description || '未命名交易'}</div>
                    <div class="transaction-meta">
                        ${tx.account_name || '未知账户'} · ${formatDate(tx.date)}
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountPrefix}${formatCurrency(tx.amount)}
                </div>
            </div>
        `;
    }).join('');
}

// 格式化货币（如果还没定义）
if (typeof formatCurrency === 'undefined') {
    window.formatCurrency = function(amount) {
        return new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };
}

// 格式化日期（如果还没定义）
if (typeof formatDate === 'undefined') {
    window.formatDate = function(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN');
    };
}