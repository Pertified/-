/**
 * 图表工具函数集合
 * 提供图表相关的通用功能
 */

const ChartUtils = {
    // 创建图表容器
    createChartContainer(parentElement, className = 'chart-container') {
        const container = document.createElement('div');
        container.className = className;
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        if (typeof parentElement === 'string') {
            document.querySelector(parentElement).appendChild(container);
        } else {
            parentElement.appendChild(container);
        }

        return canvas;
    },

    // 计算图表尺寸
    calculateChartSize(container) {
        const rect = container.getBoundingClientRect();
        const padding = 20;
        return {
            width: rect.width - padding * 2,
            height: rect.height - padding * 2
        };
    },

    // 生成图表ID
    generateChartId(prefix = 'chart') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // 下载图表为图片
    downloadChart(chart, filename = 'chart.png') {
        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        link.click();
    },

    // 全屏显示图表
    fullscreenChart(chartContainer) {
        if (!document.fullscreenElement) {
            chartContainer.requestFullscreen().catch(err => {
                console.error('无法进入全屏模式:', err);
            });
        } else {
            document.exitFullscreen();
        }
    },

    // 创建图例HTML
    createCustomLegend(chart) {
        const legendContainer = document.createElement('div');
        legendContainer.className = 'chart-legend';

        const data = chart.data;
        if (data.labels && data.datasets[0]) {
            const dataset = data.datasets[0];
            data.labels.forEach((label, index) => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';

                const colorBox = document.createElement('span');
                colorBox.className = 'legend-color';
                colorBox.style.backgroundColor = dataset.backgroundColor[index];

                const labelText = document.createElement('span');
                labelText.className = 'legend-label';
                labelText.textContent = label;

                legendItem.appendChild(colorBox);
                legendItem.appendChild(labelText);

                // 点击切换显示/隐藏
                legendItem.addEventListener('click', () => {
                    const meta = chart.getDatasetMeta(0);
                    meta.data[index].hidden = !meta.data[index].hidden;
                    chart.update();
                    legendItem.classList.toggle('disabled');
                });

                legendContainer.appendChild(legendItem);
            });
        }

        return legendContainer;
    },

    // 添加数据标签
    addDataLabels(chart, options = {}) {
        const defaultOptions = {
            display: true,
            color: '#000',
            font: {
                weight: 'bold',
                size: 12
            },
            formatter: (value) => value.toLocaleString()
        };

        const labelOptions = { ...defaultOptions, ...options };

        chart.options.plugins.datalabels = labelOptions;
        chart.update();
    },

    // 平滑动画过渡
    animateChartUpdate(chart, newData, duration = 750) {
        chart.data = newData;
        chart.update({
            duration: duration,
            easing: 'easeInOutQuart'
        });
    },

    // 创建加载状态
    createLoadingState(container) {
        const loading = document.createElement('div');
        loading.className = 'chart-loading';
        loading.innerHTML = `
            <div class="loading-spinner"></div>
            <p class="loading-text">加载中...</p>
        `;
        container.appendChild(loading);
        return loading;
    },

    // 移除加载状态
    removeLoadingState(loadingElement) {
        if (loadingElement && loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
    },

    // 创建空数据状态
    createEmptyState(container, message = '暂无数据') {
        const empty = document.createElement('div');
        empty.className = 'chart-empty';
        empty.innerHTML = `
            <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p class="empty-text">${message}</p>
        `;
        container.appendChild(empty);
        return empty;
    },

    // 格式化图表提示
    formatTooltip(context, options = {}) {
        const { showLabel = true, showValue = true, prefix = '', suffix = '' } = options;
        let tooltipText = '';

        if (showLabel && context.label) {
            tooltipText += context.label + ': ';
        }

        if (showValue) {
            const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
            tooltipText += prefix + value.toLocaleString() + suffix;
        }

        return tooltipText;
    },

    // 自适应文字大小
    getResponsiveFontSize() {
        const width = window.innerWidth;
        if (width < 640) return 10;
        if (width < 1024) return 12;
        return 14;
    },

    // 限制标签长度
    truncateLabel(label, maxLength = 10) {
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength) + '...';
    },

    // 计算数据范围
    calculateDataRange(data) {
        const values = data.flat();
        return {
            min: Math.min(...values),
            max: Math.max(...values),
            range: Math.max(...values) - Math.min(...values)
        };
    },

    // 生成时间标签
    generateTimeLabels(startDate, endDate, interval = 'day') {
        const labels = [];
        const current = new Date(startDate);
        const end = new Date(endDate);

        while (current <= end) {
            switch (interval) {
                case 'day':
                    labels.push(DataFormatter.formatDate(current, 'MM-DD'));
                    current.setDate(current.getDate() + 1);
                    break;
                case 'week':
                    labels.push(DataFormatter.formatDate(current, 'MM-DD'));
                    current.setDate(current.getDate() + 7);
                    break;
                case 'month':
                    labels.push(DataFormatter.formatDate(current, 'YYYY年MM月'));
                    current.setMonth(current.getMonth() + 1);
                    break;
                case 'year':
                    labels.push(current.getFullYear() + '年');
                    current.setFullYear(current.getFullYear() + 1);
                    break;
            }
        }

        return labels;
    },

    // 导出图表数据
    exportChartData(chart, format = 'csv') {
        const data = chart.data;
        let content = '';

        if (format === 'csv') {
            // CSV格式
            content = 'Label,Value\n';
            data.labels.forEach((label, index) => {
                const value = data.datasets[0].data[index];
                content += `"${label}",${value}\n`;
            });
        } else if (format === 'json') {
            // JSON格式
            const exportData = data.labels.map((label, index) => ({
                label: label,
                value: data.datasets[0].data[index]
            }));
            content = JSON.stringify(exportData, null, 2);
        }

        const blob = new Blob([content], { type: `text/${format}` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `chart-data.${format}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }
};

// 导出工具
window.ChartUtils = ChartUtils;