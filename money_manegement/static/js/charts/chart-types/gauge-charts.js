/**
 * 仪表盘图实现
 * 用于显示进度、目标达成率等指标
 */

class GaugeChart extends BaseChart {
    constructor(config) {
        super(config);
        this.value = config.value || 0;
        this.max = config.max || 100;
        this.min = config.min || 0;
        this.label = config.label || '';
        this.suffix = config.suffix || '%';
        this.thresholds = config.thresholds || this.getDefaultThresholds();
        this.showNeedle = config.showNeedle !== false;
    }

    // 获取图表类型
    getChartType() {
        return 'doughnut';
    }

    // 获取默认阈值
    getDefaultThresholds() {
        return [
            { value: 0.3, color: '#ef4444' },      // 红色：0-30%
            { value: 0.7, color: '#f59e0b' },      // 橙色：30-70%
            { value: 1, color: '#10b981' }         // 绿色：70-100%
        ];
    }

    // 准备数据
    prepareData(data) {
        const percentage = ((this.value - this.min) / (this.max - this.min));
        const displayValue = Math.round(percentage * 100);

        // 创建分段数据
        const segments = this.createSegments();

        return {
            datasets: [{
                data: segments.values,
                backgroundColor: segments.colors,
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        };
    }

    // 创建分段
    createSegments() {
        const values = [];
        const colors = [];
        const percentage = (this.value - this.min) / (this.max - this.min);

        // 根据阈值创建分段
        this.thresholds.forEach((threshold, index) => {
            const prevThreshold = index > 0 ? this.thresholds[index - 1].value : 0;
            const segmentSize = threshold.value - prevThreshold;

            if (percentage >= threshold.value) {
                values.push(segmentSize * 100);
                colors.push(threshold.color);
            } else if (percentage > prevThreshold) {
                const fillAmount = percentage - prevThreshold;
                values.push(fillAmount * 100);
                colors.push(threshold.color);

                // 添加空白部分
                const emptyAmount = threshold.value - percentage;
                values.push(emptyAmount * 100);
                colors.push('#e5e7eb');

                // 添加剩余的空白分段
                for (let i = index + 1; i < this.thresholds.length; i++) {
                    const nextPrev = this.thresholds[i - 1].value;
                    const nextSize = this.thresholds[i].value - nextPrev;
                    values.push(nextSize * 100);
                    colors.push('#e5e7eb');
                }
                return { values, colors };
            } else {
                values.push(segmentSize * 100);
                colors.push('#e5e7eb');
            }
        });

        return { values, colors };
    }

    // 获取配置选项
    getOptions() {
        const baseOptions = super.getOptions();

        return {
            ...baseOptions,
            circumference: 180,
            rotation: 270,
            cutout: '75%',
            plugins: {
                ...baseOptions.plugins,
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                },
                // 中心文本
                centerText: {
                    display: true,
                    text: Math.round(((this.value - this.min) / (this.max - this.min)) * 100) + this.suffix,
                    subText: this.label
                }
            }
        };
    }

    // 渲染后处理
    afterRender() {
        super.afterRender();

        // 绘制中心信息
        this.drawCenterInfo();

        // 绘制指针
        if (this.showNeedle) {
            this.drawNeedle();
        }

        // 绘制刻度
        if (this.config.showScale) {
            this.drawScale();
        }
    }

    // 绘制中心信息
    drawCenterInfo() {
        const chart = this.chartInstance;
        const ctx = chart.ctx;
        const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
        const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 当前值
        const percentage = Math.round(((this.value - this.min) / (this.max - this.min)) * 100);
        ctx.font = 'bold 32px Microsoft YaHei';
        ctx.fillStyle = this.getValueColor();
        ctx.fillText(percentage + this.suffix, centerX, centerY);

        // 标签
        if (this.label) {
            ctx.font = '14px Microsoft YaHei';
            ctx.fillStyle = '#6b7280';
            ctx.fillText(this.label, centerX, centerY + 25);
        }

        // 实际值
        if (this.config.showActualValue) {
            ctx.font = '12px Microsoft YaHei';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(`${this.value} / ${this.max}`, centerX, centerY + 40);
        }

        ctx.restore();
    }

    // 获取值对应的颜色
    getValueColor() {
        const percentage = (this.value - this.min) / (this.max - this.min);

        for (let i = this.thresholds.length - 1; i >= 0; i--) {
            if (percentage >= (i > 0 ? this.thresholds[i - 1].value : 0)) {
                return this.thresholds[i].color;
            }
        }

        return '#6b7280';
    }

    // 绘制指针
    drawNeedle() {
        const chart = this.chartInstance;
        const ctx = chart.ctx;
        const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
        const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

        const innerRadius = chart.innerRadius;
        const outerRadius = chart.outerRadius;

        // 计算角度
        const percentage = (this.value - this.min) / (this.max - this.min);
        const angle = Math.PI + (Math.PI * percentage);

        ctx.save();

        // 绘制指针
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(outerRadius - 10, 0);
        ctx.lineTo(0, -5);
        ctx.fillStyle = '#374151';
        ctx.fill();

        // 绘制中心圆
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#374151';
        ctx.fill();

        ctx.restore();
    }

    // 绘制刻度
    drawScale() {
        const chart = this.chartInstance;
        const ctx = chart.ctx;
        const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
        const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

        const innerRadius = chart.innerRadius - 10;
        const outerRadius = chart.outerRadius + 10;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '10px Microsoft YaHei';
        ctx.fillStyle = '#9ca3af';

        // 绘制刻度标签
        const labels = this.config.scaleLabels || [this.min, Math.round((this.max + this.min) / 2), this.max];

        labels.forEach((label, index) => {
            const angle = Math.PI + (Math.PI * index / (labels.length - 1));
            const x = centerX + Math.cos(angle) * (outerRadius + 15);
            const y = centerY + Math.sin(angle) * (outerRadius + 15);

            ctx.fillText(label.toString(), x, y);
        });

        ctx.restore();
    }

    // 更新值
    updateValue(newValue, animate = true) {
        const oldValue = this.value;
        this.value = Math.max(this.min, Math.min(this.max, newValue));

        if (animate && this.chartInstance) {
            this.animateValueChange(oldValue, this.value);
        } else {
            this.render(this.prepareData());
        }
    }

    // 动画更新值
    animateValueChange(fromValue, toValue) {
        const steps = 30;
        let currentStep = 0;
        const increment = (toValue - fromValue) / steps;

        const animate = () => {
            currentStep++;
            this.value = fromValue + (increment * currentStep);

            // 更新数据并重绘
            const newData = this.prepareData();
            this.chartInstance.data = newData;
            this.chartInstance.update('none');

            // 重绘中心信息和指针
            this.drawCenterInfo();
            if (this.showNeedle) {
                this.drawNeedle();
            }

            if (currentStep < steps) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    // 设置目标线
    setTarget(target) {
        this.config.target = target;
        if (this.chartInstance) {
            this.render(this.prepareData());
        }
    }
}

// 注册到工厂
window.GaugeChart = GaugeChart;