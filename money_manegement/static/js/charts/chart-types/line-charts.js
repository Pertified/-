/**
 * 折线图实现
 * 支持多数据集、趋势线、移动平均线等高级功能
 */

class LineChart extends BaseChart {
    constructor(config) {
        super(config);
        this.showArea = config.showArea !== false;
        this.showPoints = config.showPoints !== false;
        this.smooth = config.smooth !== false;
        this.showTrendLine = config.showTrendLine || false;
        this.showMovingAverage = config.showMovingAverage || false;
        this.movingAveragePeriod = config.movingAveragePeriod || 7;
    }

    // 获取图表类型
    getChartType() {
        return 'line';
    }

    // 准备数据
    prepareData(data) {
        // 如果数据已经是Chart.js格式，增强它
        if (data.labels && data.datasets) {
            return this.enhanceData(data);
        }

        // 转换数据格式
        const preparedData = DataFormatter.prepareLineData(data);

        // 添加趋势线
        if (this.showTrendLine) {
            this.addTrendLine(preparedData);
        }

        // 添加移动平均线
        if (this.showMovingAverage) {
            this.addMovingAverage(preparedData);
        }

        return preparedData;
    }

    // 增强数据
    enhanceData(data) {
        const enhancedData = { ...data };

        // 为每个数据集设置默认样式
        enhancedData.datasets = enhancedData.datasets.map((dataset, index) => {
            const color = dataset.borderColor || ColorPalette.getColor(index);

            return {
                ...dataset,
                borderColor: color,
                backgroundColor: this.showArea ? ColorPalette.getColorWithAlpha(index, 0.1) : 'transparent',
                borderWidth: dataset.borderWidth || 2,
                pointRadius: this.showPoints ? 3 : 0,
                pointHoverRadius: 5,
                pointBackgroundColor: '#fff',
                pointBorderColor: color,
                pointBorderWidth: 2,
                tension: this.smooth ? 0.3 : 0,
                fill: this.showArea
            };
        });

        return enhancedData;
    }

    // 添加趋势线
    addTrendLine(data) {
        const mainDataset = data.datasets[0];
        if (!mainDataset || !mainDataset.data) return;

        const trendData = this.calculateTrendLine(mainDataset.data);

        data.datasets.push({
            label: '趋势线',
            data: trendData,
            borderColor: '#6b7280',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0
        });
    }

    // 计算趋势线
    calculateTrendLine(values) {
        const n = values.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += values[i];
            sumXY += i * values[i];
            sumX2 += i * i;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return values.map((_, i) => intercept + slope * i);
    }

    // 添加移动平均线
    addMovingAverage(data) {
        const mainDataset = data.datasets[0];
        if (!mainDataset || !mainDataset.data) return;

        const maData = this.calculateMovingAverage(mainDataset.data, this.movingAveragePeriod);

        data.datasets.push({
            label: `${this.movingAveragePeriod}日移动平均`,
            data: maData,
            borderColor: '#f59e0b',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.3
        });
    }

    // 计算移动平均
    calculateMovingAverage(values, period) {
        const result = [];

        for (let i = 0; i < values.length; i++) {
            if (i < period - 1) {
                result.push(null);
            } else {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += values[i - j];
                }
                result.push(sum / period);
            }
        }

        return result;
    }

    // 获取配置选项
    getOptions() {
        const baseOptions = super.getOptions();

        const lineOptions = {
            ...baseOptions,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    ...baseOptions.plugins?.legend,
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    ...baseOptions.plugins?.tooltip,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: (context) => this.formatTooltip(context)
                    }
                },
                // 添加自定义插件配置
                annotation: this.config.annotations ? {
                    annotations: this.config.annotations
                } : undefined
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        maxRotation: 45,
                        minRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    }
                },
                y: {
                    beginAtZero: this.config.beginAtZero !== false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        callback: (value) => {
                            if (this.config.yAxisFormat === 'percentage') {
                                return value + '%';
                            }
                            return DataFormatter.formatCurrency(value);
                        }
                    }
                }
            }
        };

        // 如果有双Y轴配置
        if (this.config.dualAxis) {
            lineOptions.scales.y1 = {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                    drawOnChartArea: false
                },
                ticks: {
                    callback: (value) => {
                        if (this.config.y1Format === 'percentage') {
                            return value + '%';
                        }
                        return value.toLocaleString();
                    }
                }
            };
        }

        return lineOptions;
    }

    // 格式化提示框
    formatTooltip(context) {
        const label = context.dataset.label || '';
        const value = context.parsed.y;

        if (this.config.tooltipFormat === 'detailed') {
            const date = context.label;
            return `${label}\n日期: ${date}\n金额: ${DataFormatter.formatCurrency(value)}`;
        }

        return `${label}: ${DataFormatter.formatCurrency(value)}`;
    }

    // 渲染后处理
    afterRender() {
        super.afterRender();

        // 添加数据点点击事件
        if (this.config.onPointClick) {
            this.canvas.onclick = (evt) => {
                const points = this.chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const firstPoint = points[0];
                    const datasetIndex = firstPoint.datasetIndex;
                    const index = firstPoint.index;
                    const label = this.chartInstance.data.labels[index];
                    const value = this.chartInstance.data.datasets[datasetIndex].data[index];

                    this.config.onPointClick({
                        datasetIndex,
                        index,
                        label,
                        value,
                        dataset: this.chartInstance.data.datasets[datasetIndex]
                    });
                }
            };
        }

        // 添加区间选择功能
        if (this.config.enableZoom) {
            this.enableZoomFeature();
        }
    }

    // 启用缩放功能
    enableZoomFeature() {
        // 这里可以集成Chart.js zoom插件
        // 或实现自定义的缩放逻辑
        console.log('Zoom feature would be enabled here');
    }

    // 更新数据点样式
    updatePointStyle(datasetIndex, pointIndex, style) {
        if (this.chartInstance) {
            const meta = this.chartInstance.getDatasetMeta(datasetIndex);
            const point = meta.data[pointIndex];

            Object.assign(point, style);
            this.chartInstance.update('none');
        }
    }

    // 高亮特定时间段
    highlightTimeRange(startIndex, endIndex) {
        if (this.chartInstance && this.chartInstance.options.plugins.annotation) {
            this.chartInstance.options.plugins.annotation.annotations.highlight = {
                type: 'box',
                xMin: startIndex,
                xMax: endIndex,
                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                borderColor: 'rgba(255, 193, 7, 0.5)',
                borderWidth: 1
            };
            this.chartInstance.update();
        }
    }

    // 添加标记线
    addMarkerLine(value, label, axis = 'y') {
        if (!this.chartInstance) return;

        const annotationConfig = {
            type: 'line',
            scaleID: axis,
            value: value,
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                content: label,
                enabled: true,
                position: 'end'
            }
        };

        if (!this.chartInstance.options.plugins.annotation) {
            this.chartInstance.options.plugins.annotation = { annotations: {} };
        }

        this.chartInstance.options.plugins.annotation.annotations[`marker-${Date.now()}`] = annotationConfig;
        this.chartInstance.update();
    }

    // 导出数据为CSV
    exportToCSV() {
        const data = this.chartInstance.data;
        let csv = 'Date';

        // 添加列标题
        data.datasets.forEach(dataset => {
            csv += `,${dataset.label}`;
        });
        csv += '\n';

        // 添加数据行
        data.labels.forEach((label, index) => {
            csv += label;
            data.datasets.forEach(dataset => {
                csv += `,${dataset.data[index] || ''}`;
            });
            csv += '\n';
        });

        ChartUtils.exportChartData(this.chartInstance, 'csv');
    }
}

// 注册到工厂
window.LineChart = LineChart;