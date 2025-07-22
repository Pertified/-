/**
 * 柱状图实现
 * 支持单柱、分组、堆叠等多种模式
 */

class BarChart extends BaseChart {
    constructor(config) {
        super(config);
        this.horizontal = config.horizontal || false;
        this.stacked = config.stacked || false;
        this.grouped = config.grouped !== false;
        this.showValues = config.showValues || false;
        this.barThickness = config.barThickness || null;
    }

    // 获取图表类型
    getChartType() {
        return 'bar';
    }

    // 准备数据
    prepareData(data) {
        // 如果数据已经是Chart.js格式，增强它
        if (data.labels && data.datasets) {
            return this.enhanceData(data);
        }

        // 转换数据格式
        const preparedData = DataFormatter.prepareBarData(data);

        // 如果是对比数据，创建多个数据集
        if (data.comparison) {
            this.prepareComparisonData(preparedData, data.comparison);
        }

        return preparedData;
    }

    // 增强数据
    enhanceData(data) {
        const enhancedData = { ...data };

        // 为每个数据集设置样式
        enhancedData.datasets = enhancedData.datasets.map((dataset, index) => {
            const baseColor = dataset.backgroundColor || ColorPalette.getColor(index);

            return {
                ...dataset,
                backgroundColor: baseColor,
                borderColor: dataset.borderColor || baseColor,
                borderWidth: dataset.borderWidth || 1,
                borderRadius: 4,
                hoverBackgroundColor: ColorPalette.getColorWithAlpha(index, 0.8),
                barThickness: this.barThickness,
                maxBarThickness: 60,
                categoryPercentage: 0.8,
                barPercentage: this.grouped ? 0.8 : 1
            };
        });

        return enhancedData;
    }

    // 准备对比数据
    prepareComparisonData(data, comparison) {
        const colors = ColorPalette.getChartColors('comparison', comparison.series.length);

        data.datasets = comparison.series.map((series, index) => ({
            label: series.name,
            data: series.values,
            backgroundColor: colors[index],
            borderColor: colors[index],
            borderWidth: 1,
            borderRadius: 4
        }));
    }

    // 获取配置选项
    getOptions() {
        const baseOptions = super.getOptions();

        const barOptions = {
            ...baseOptions,
            indexAxis: this.horizontal ? 'y' : 'x',
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    ...baseOptions.plugins?.legend,
                    display: this.config.datasets?.length > 1 || this.config.showLegend
                },
                tooltip: {
                    ...baseOptions.plugins?.tooltip,
                    callbacks: {
                        label: (context) => this.formatTooltip(context),
                        afterLabel: (context) => this.getAdditionalTooltipInfo(context)
                    }
                },
                // 数据标签插件配置
                datalabels: this.showValues ? {
                    anchor: 'end',
                    align: 'end',
                    offset: 4,
                    font: {
                        size: 10,
                        weight: 'bold'
                    },
                    formatter: (value) => {
                        if (this.config.valueFormat === 'percentage') {
                            return value + '%';
                        }
                        return DataFormatter.formatLargeNumber(value);
                    }
                } : false
            },
            scales: {
                x: {
                    stacked: this.stacked,
                    grid: {
                        display: this.horizontal
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 0,
                        callback: function(value, index) {
                            const label = this.getLabelForValue(value);
                            return ChartUtils.truncateLabel(label, 15);
                        }
                    }
                },
                y: {
                    stacked: this.stacked,
                    beginAtZero: true,
                    grid: {
                        display: !this.horizontal,
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
                            return DataFormatter.formatLargeNumber(value);
                        }
                    }
                }
            }
        };

        // 如果是水平柱状图，交换x和y轴的某些配置
        if (this.horizontal) {
            const xConfig = barOptions.scales.x;
            const yConfig = barOptions.scales.y;

            barOptions.scales.x = {
                ...xConfig,
                ticks: {
                    ...xConfig.ticks,
                    callback: yConfig.ticks.callback
                }
            };

            barOptions.scales.y = {
                ...yConfig,
                ticks: {
                    ...yConfig.ticks,
                    callback: xConfig.ticks.callback
                }
            };
        }

        return barOptions;
    }

    // 格式化提示框
    formatTooltip(context) {
        const label = context.dataset.label || context.label || '';
        const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed.x;

        if (this.stacked && context.dataset._meta) {
            // 对于堆叠图，显示占比
            const total = context.dataset._meta[context.datasetIndex].total;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${DataFormatter.formatCurrency(value)} (${percentage}%)`;
        }

        return `${label}: ${DataFormatter.formatCurrency(value)}`;
    }

    // 获取额外的提示信息
    getAdditionalTooltipInfo(context) {
        if (this.config.showGrowthRate && context.dataIndex > 0) {
            const currentValue = context.parsed.y || context.parsed.x;
            const previousValue = context.dataset.data[context.dataIndex - 1];

            if (previousValue && previousValue !== 0) {
                const growthRate = ((currentValue - previousValue) / previousValue * 100).toFixed(1);
                const symbol = growthRate > 0 ? '↑' : '↓';
                return `增长率: ${symbol} ${Math.abs(growthRate)}%`;
            }
        }
        return '';
    }

    // 渲染后处理
    afterRender() {
        super.afterRender();

        // 添加柱子点击事件
        if (this.config.onBarClick) {
            this.canvas.onclick = (evt) => {
                const bars = this.chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                if (bars.length) {
                    const firstBar = bars[0];
                    const datasetIndex = firstBar.datasetIndex;
                    const index = firstBar.index;
                    const label = this.chartInstance.data.labels[index];
                    const value = this.chartInstance.data.datasets[datasetIndex].data[index];

                    this.config.onBarClick({
                        datasetIndex,
                        index,
                        label,
                        value,
                        dataset: this.chartInstance.data.datasets[datasetIndex]
                    });
                }
            };
        }

        // 添加动画效果
        if (this.config.animateOnScroll) {
            this.setupScrollAnimation();
        }
    }

    // 设置滚动动画
    setupScrollAnimation() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.hasAnimated) {
                    this.animateBars();
                    this.hasAnimated = true;
                }
            });
        }, {
            threshold: 0.5
        });

        observer.observe(this.container);
    }

    // 动画效果
    animateBars() {
        if (!this.chartInstance) return;

        const datasets = this.chartInstance.data.datasets;
        const originalData = datasets.map(ds => [...ds.data]);

        // 先将所有数据设为0
        datasets.forEach(ds => {
            ds.data = ds.data.map(() => 0);
        });
        this.chartInstance.update('none');

        // 逐步恢复数据
        const steps = 20;
        let currentStep = 0;

        const animate = () => {
            currentStep++;
            const progress = currentStep / steps;

            datasets.forEach((ds, i) => {
                ds.data = originalData[i].map(value => value * progress);
            });

            this.chartInstance.update('none');

            if (currentStep < steps) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // 切换数据集显示
    toggleDataset(datasetIndex) {
        if (this.chartInstance) {
            const meta = this.chartInstance.getDatasetMeta(datasetIndex);
            meta.hidden = !meta.hidden;
            this.chartInstance.update();
        }
    }

    // 排序柱子
    sortBars(order = 'desc') {
        if (!this.chartInstance) return;

        const data = this.chartInstance.data;
        const dataset = data.datasets[0];

        // 创建索引数组并排序
        const indices = Array.from({ length: data.labels.length }, (_, i) => i);
        indices.sort((a, b) => {
            const diff = dataset.data[a] - dataset.data[b];
            return order === 'desc' ? -diff : diff;
        });

        // 重新排列数据
        data.labels = indices.map(i => data.labels[i]);
        data.datasets.forEach(ds => {
            ds.data = indices.map(i => ds.data[i]);
        });

        this.chartInstance.update();
    }

    // 高亮特定柱子
    highlightBar(index, datasetIndex = 0) {
        if (this.chartInstance) {
            const meta = this.chartInstance.getDatasetMeta(datasetIndex);
            const bar = meta.data[index];

            // 保存原始颜色
            if (!bar._originalColor) {
                bar._originalColor = bar.options.backgroundColor;
            }

            // 设置高亮颜色
            bar.options.backgroundColor = ColorPalette.getColorWithAlpha(datasetIndex, 0.5);
            this.chartInstance.update('none');
        }
    }

    // 重置高亮
    resetHighlight() {
        if (this.chartInstance) {
            this.chartInstance.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = this.chartInstance.getDatasetMeta(datasetIndex);
                meta.data.forEach(bar => {
                    if (bar._originalColor) {
                        bar.options.backgroundColor = bar._originalColor;
                    }
                });
            });
            this.chartInstance.update('none');
        }
    }

    // 添加参考线
    addReferenceLine(value, label = '平均值') {
        if (!this.chartInstance) return;

        const axis = this.horizontal ? 'x' : 'y';
        this.addMarkerLine(value, label, axis);
    }

    // 添加标记线（继承自LineChart的方法）
    addMarkerLine(value, label, axis = 'y') {
        if (!this.chartInstance) return;

        if (!this.chartInstance.options.plugins.annotation) {
            this.chartInstance.options.plugins.annotation = { annotations: {} };
        }

        this.chartInstance.options.plugins.annotation.annotations[`ref-line-${Date.now()}`] = {
            type: 'line',
            scaleID: axis,
            value: value,
            borderColor: '#6b7280',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                content: label,
                enabled: true,
                position: 'end',
                font: {
                    size: 11
                }
            }
        };

        this.chartInstance.update();
    }
}

// 注册到工厂
window.BarChart = BarChart;