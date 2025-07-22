/**
 * 饼图和环形图实现
 */

class PieChart extends BaseChart {
    constructor(config) {
        super(config);
        this.donut = config.donut || false;
        this.showPercentage = config.showPercentage !== false;
    }

    // 获取图表类型
    getChartType() {
        return this.donut ? 'doughnut' : 'pie';
    }

    // 准备数据
    prepareData(data) {
        // 如果数据已经是Chart.js格式，直接返回
        if (data.labels && data.datasets) {
            return this.enhanceData(data);
        }

        // 转换数据格式
        return DataFormatter.preparePieData(data);
    }

    // 增强数据
    enhanceData(data) {
        const enhancedData = { ...data };

        // 确保有颜色
        if (enhancedData.datasets[0] && !enhancedData.datasets[0].backgroundColor) {
            enhancedData.datasets[0].backgroundColor = ColorPalette.getColors(data.labels.length);
        }

        // 添加边框
        enhancedData.datasets[0] = {
            ...enhancedData.datasets[0],
            borderWidth: 2,
            borderColor: '#fff',
            hoverBorderWidth: 3,
            hoverOffset: 10
        };

        return enhancedData;
    }

    // 获取配置选项
    getOptions() {
        const baseOptions = super.getOptions();

        const pieOptions = {
            ...baseOptions,
            cutout: this.donut ? '60%' : 0,
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    ...baseOptions.plugins?.legend,
                    position: 'right',
                    labels: {
                        ...baseOptions.plugins?.legend?.labels,
                        generateLabels: (chart) => this.generateLabels(chart),
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    ...baseOptions.plugins?.tooltip,
                    callbacks: {
                        label: (context) => this.formatTooltip(context)
                    }
                }
            }
        };

        // 如果是环形图，可以在中心显示总计
        if (this.donut && this.config.showCenter) {
            pieOptions.plugins.centerText = {
                display: true,
                text: this.config.centerText || '总计'
            };
        }

        return pieOptions;
    }

    // 生成图例标签
    generateLabels(chart) {
        const data = chart.data;
        if (!data.labels?.length || !data.datasets?.length) {
            return [];
        }

        const dataset = data.datasets[0];
        const total = dataset.data.reduce((a, b) => a + b, 0);

        return data.labels.map((label, i) => {
            const value = dataset.data[i];
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

            let labelText = label;
            if (this.showPercentage) {
                labelText += ` (${percentage}%)`;
            }
            if (this.config.showValue) {
                labelText += `: ${DataFormatter.formatCurrency(value)}`;
            }

            return {
                text: labelText,
                fillStyle: dataset.backgroundColor[i],
                strokeStyle: dataset.borderColor || '#fff',
                lineWidth: dataset.borderWidth || 2,
                hidden: isNaN(value),
                index: i
            };
        });
    }

    // 格式化提示框
    formatTooltip(context) {
        const label = context.label || '';
        const value = context.parsed;
        const total = context.dataset.data.reduce((a, b) => a + b, 0);
        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;

        let tooltip = label;
        if (this.config.tooltipFormat === 'detailed') {
            tooltip += `\n金额: ${DataFormatter.formatCurrency(value)}`;
            tooltip += `\n占比: ${percentage}%`;
        } else {
            tooltip += `: ${DataFormatter.formatCurrency(value)} (${percentage}%)`;
        }

        return tooltip;
    }

    // 渲染后处理
    afterRender() {
        super.afterRender();

        // 添加点击事件
        if (this.config.onClick) {
            this.canvas.onclick = (evt) => {
                const points = this.chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const firstPoint = points[0];
                    const label = this.chartInstance.data.labels[firstPoint.index];
                    const value = this.chartInstance.data.datasets[firstPoint.datasetIndex].data[firstPoint.index];
                    this.config.onClick({ label, value, index: firstPoint.index });
                }
            };
        }

        // 如果是环形图且需要显示中心文本
        if (this.donut && this.config.showCenter) {
            this.drawCenterText();
        }
    }

    // 绘制中心文本
    drawCenterText() {
        const chart = this.chartInstance;
        const ctx = chart.ctx;
        const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
        const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 主文本
        ctx.font = 'bold 24px Microsoft YaHei';
        ctx.fillStyle = window.chartConfig?.getCurrentTheme().textColor || '#374151';

        const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
        ctx.fillText(DataFormatter.formatCurrency(total), centerX, centerY - 10);

        // 副文本
        ctx.font = '14px Microsoft YaHei';
        ctx.fillText(this.config.centerText || '总计', centerX, centerY + 15);

        ctx.restore();
    }

    // 更新中心文本
    updateCenterText(text) {
        this.config.centerText = text;
        if (this.chartInstance) {
            this.chartInstance.update();
            this.drawCenterText();
        }
    }

    // 高亮特定扇区
    highlightSegment(index) {
        if (this.chartInstance) {
            const meta = this.chartInstance.getDatasetMeta(0);
            meta.data.forEach((segment, i) => {
                segment.hidden = i !== index;
            });
            this.chartInstance.update();
        }
    }

    // 显示所有扇区
    showAllSegments() {
        if (this.chartInstance) {
            const meta = this.chartInstance.getDatasetMeta(0);
            meta.data.forEach(segment => {
                segment.hidden = false;
            });
            this.chartInstance.update();
        }
    }
}

// 注册到工厂
window.PieChart = PieChart;