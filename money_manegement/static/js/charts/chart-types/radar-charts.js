/**
 * 雷达图实现
 * 用于多维度数据对比分析
 */

class RadarChart extends BaseChart {
    constructor(config) {
        super(config);
        this.dimensions = config.dimensions || [];
        this.showPoints = config.showPoints !== false;
        this.fill = config.fill !== false;
        this.animateRotation = config.animateRotation || false;
    }

    // 获取图表类型
    getChartType() {
        return 'radar';
    }

    // 准备数据
    prepareData(data) {
        // 如果数据已经是Chart.js格式，增强它
        if (data.labels && data.datasets) {
            return this.enhanceData(data);
        }

        // 转换数据格式
        return this.convertToRadarData(data);
    }

    // 转换为雷达图数据格式
    convertToRadarData(data) {
        // 处理维度标签
        const labels = data.dimensions || data.labels || this.dimensions;

        // 处理数据集
        let datasets = [];

        if (Array.isArray(data)) {
            // 单数据集
            datasets.push({
                label: '当前值',
                data: data,
                borderColor: ColorPalette.getColor(0),
                backgroundColor: ColorPalette.getColorWithAlpha(0, 0.2)
            });
        } else if (data.series) {
            // 多数据集
            datasets = data.series.map((series, index) => ({
                label: series.name,
                data: series.values,
                borderColor: ColorPalette.getColor(index),
                backgroundColor: ColorPalette.getColorWithAlpha(index, 0.2),
                borderWidth: 2,
                pointRadius: this.showPoints ? 4 : 0,
                pointHoverRadius: 6,
                pointBackgroundColor: ColorPalette.getColor(index),
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }));
        }

        return { labels, datasets };
    }

    // 增强数据
    enhanceData(data) {
        const enhancedData = { ...data };

        // 为每个数据集设置样式
        enhancedData.datasets = enhancedData.datasets.map((dataset, index) => {
            const color = dataset.borderColor || ColorPalette.getColor(index);

            return {
                ...dataset,
                borderColor: color,
                backgroundColor: this.fill ?
                    (dataset.backgroundColor || ColorPalette.getColorWithAlpha(index, 0.2)) :
                    'transparent',
                borderWidth: dataset.borderWidth || 2,
                pointRadius: this.showPoints ? 4 : 0,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            };
        });

        return enhancedData;
    }

    // 获取配置选项
    getOptions() {
        const baseOptions = super.getOptions();

        return {
            ...baseOptions,
            scales: {
                r: {
                    beginAtZero: true,
                    min: 0,
                    max: this.config.maxValue || 100,
                    ticks: {
                        stepSize: this.config.stepSize || 20,
                        callback: function(value) {
                            if (this.config?.valueFormat === 'percentage') {
                                return value + '%';
                            }
                            return value;
                        }.bind(this),
                        font: {
                            size: 10
                        },
                        backdropColor: 'transparent'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        circular: true
                    },
                    pointLabels: {
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        callback: function(label) {
                            // 处理长标签
                            if (label.length > 10) {
                                return label.substring(0, 10) + '...';
                            }
                            return label;
                        }
                    },
                    angleLines: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    ...baseOptions.plugins?.legend,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    ...baseOptions.plugins?.tooltip,
                    callbacks: {
                        label: (context) => this.formatTooltip(context)
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2
                },
                point: {
                    radius: this.showPoints ? 4 : 0,
                    hoverRadius: 6
                }
            }
        };
    }

    // 格式化提示框
    formatTooltip(context) {
        const label = context.dataset.label || '';
        const dimension = context.label;
        const value = context.parsed.r;

        let tooltip = `${label}\n${dimension}: ${value}`;

        if (this.config.valueFormat === 'percentage') {
            tooltip += '%';
        }

        // 添加评级
        if (this.config.showRating) {
            const rating = this.getRating(value);
            tooltip += `\n评级: ${rating}`;
        }

        return tooltip;
    }

    // 获取评级
    getRating(value) {
        const max = this.config.maxValue || 100;
        const percentage = value / max;

        if (percentage >= 0.9) return '优秀';
        if (percentage >= 0.8) return '良好';
        if (percentage >= 0.6) return '中等';
        if (percentage >= 0.4) return '一般';
        return '较差';
    }

    // 渲染后处理
    afterRender() {
        super.afterRender();

        // 添加维度点击事件
        if (this.config.onDimensionClick) {
            this.setupDimensionClickHandler();
        }

        // 添加旋转动画
        if (this.animateRotation) {
            this.startRotationAnimation();
        }

        // 绘制平均线
        if (this.config.showAverage) {
            this.drawAverageLine();
        }
    }

    // 设置维度点击处理
    setupDimensionClickHandler() {
        const chart = this.chartInstance;

        // 监听点击事件
        this.canvas.addEventListener('click', (e) => {
            const canvasPosition = Chart.helpers.getRelativePosition(e, chart);
            const dataX = chart.scales.r.getValueForPixel(canvasPosition.x);
            const dataY = chart.scales.r.getValueForPixel(canvasPosition.y);

            // 计算点击的维度
            const angleStep = (Math.PI * 2) / chart.data.labels.length;
            let clickAngle = Math.atan2(dataY, dataX);
            if (clickAngle < 0) clickAngle += Math.PI * 2;

            const dimensionIndex = Math.round(clickAngle / angleStep) % chart.data.labels.length;
            const dimension = chart.data.labels[dimensionIndex];

            this.config.onDimensionClick({ dimension, index: dimensionIndex });
        });
    }

    // 开始旋转动画
    startRotationAnimation() {
        let rotation = 0;

        const animate = () => {
            rotation += 0.5;
            if (rotation >= 360) rotation = 0;

            if (this.chartInstance) {
                this.chartInstance.options.scales.r.startAngle = rotation;
                this.chartInstance.update('none');

                if (this.animateRotation) {
                    requestAnimationFrame(animate);
                }
            }
        };

        requestAnimationFrame(animate);
    }

    // 停止旋转动画
    stopRotationAnimation() {
        this.animateRotation = false;
    }

    // 绘制平均线
    drawAverageLine() {
        const chart = this.chartInstance;
        const dataset = chart.data.datasets[0];
        if (!dataset) return;

        const average = dataset.data.reduce((a, b) => a + b, 0) / dataset.data.length;
        const averageData = new Array(chart.data.labels.length).fill(average);

        // 添加平均线数据集
        chart.data.datasets.push({
            label: '平均值',
            data: averageData,
            borderColor: '#6b7280',
            borderWidth: 2,
            borderDash: [5, 5],
            backgroundColor: 'transparent',
            pointRadius: 0,
            pointHoverRadius: 0
        });

        chart.update();
    }

    // 比较多个数据集
    compareDatasets(datasets) {
        const data = {
            labels: this.dimensions,
            series: datasets
        };

        this.update(data);
    }

    // 高亮特定维度
    highlightDimension(dimensionIndex) {
        if (!this.chartInstance) return;

        const chart = this.chartInstance;
        const ctx = chart.ctx;

        // 获取维度的角度
        const angleStep = (Math.PI * 2) / chart.data.labels.length;
        const angle = angleStep * dimensionIndex - Math.PI / 2;

        // 绘制高亮扇形
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = '#fbbf24';

        const centerX = chart.scales.r.xCenter;
        const centerY = chart.scales.r.yCenter;
        const radius = chart.scales.r.drawingArea;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle - angleStep / 2, angle + angleStep / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // 设置维度权重
    setDimensionWeights(weights) {
        this.config.dimensionWeights = weights;

        if (this.chartInstance) {
            // 重新计算加权数据
            const datasets = this.chartInstance.data.datasets;
            datasets.forEach(dataset => {
                if (dataset.originalData) {
                    dataset.data = dataset.originalData.map((value, index) =>
                        value * (weights[index] || 1)
                    );
                }
            });

            this.chartInstance.update();
        }
    }

    // 导出雷达图数据
    exportData() {
        const chart = this.chartInstance;
        const data = {
            dimensions: chart.data.labels,
            datasets: chart.data.datasets.map(dataset => ({
                name: dataset.label,
                values: dataset.data,
                color: dataset.borderColor
            }))
        };

        return data;
    }
}

// 注册到工厂
window.RadarChart = RadarChart;