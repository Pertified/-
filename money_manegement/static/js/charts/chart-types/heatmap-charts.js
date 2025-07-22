/**
 * 热力图实现
 * 用于展示数据密度、时间模式等二维数据
 */

class HeatmapChart extends BaseChart {
    constructor(config) {
        super(config);
        this.colorScale = config.colorScale || 'default';
        this.showValues = config.showValues !== false;
        this.cellBorderWidth = config.cellBorderWidth || 1;
        this.cellBorderColor = config.cellBorderColor || '#ffffff';
    }

    // 获取图表类型
    getChartType() {
        return 'heatmap'; // 自定义类型
    }

    // 准备数据
    prepareData(data) {
        // 热力图数据格式：二维数组或对象数组
        if (Array.isArray(data) && Array.isArray(data[0])) {
            return this.convertMatrixData(data);
        }

        return this.convertObjectData(data);
    }

    // 转换矩阵数据
    convertMatrixData(matrix) {
        const xLabels = this.config.xLabels || Array.from({ length: matrix[0].length }, (_, i) => `列${i + 1}`);
        const yLabels = this.config.yLabels || Array.from({ length: matrix.length }, (_, i) => `行${i + 1}`);

        const cells = [];
        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                cells.push({
                    x: x,
                    y: y,
                    value: value,
                    xLabel: xLabels[x],
                    yLabel: yLabels[y]
                });
            });
        });

        return {
            xLabels,
            yLabels,
            cells,
            minValue: Math.min(...cells.map(c => c.value)),
            maxValue: Math.max(...cells.map(c => c.value))
        };
    }

    // 转换对象数据
    convertObjectData(data) {
        // 处理时间序列热力图数据
        if (data.timeData) {
            return this.convertTimeSeriesData(data.timeData);
        }

        // 处理分类热力图数据
        if (data.categories) {
            return this.convertCategoryData(data.categories);
        }

        return data;
    }

    // 转换时间序列数据
    convertTimeSeriesData(timeData) {
        const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

        const cells = [];
        let minValue = Infinity;
        let maxValue = -Infinity;

        timeData.forEach(item => {
            const dayIndex = item.dayOfWeek;
            const hour = item.hour;
            const value = item.value;

            cells.push({
                x: hour,
                y: dayIndex,
                value: value,
                xLabel: hours[hour],
                yLabel: days[dayIndex]
            });

            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
        });

        return {
            xLabels: hours,
            yLabels: days,
            cells,
            minValue,
            maxValue
        };
    }

    // 渲染图表（重写）
    render(data) {
        this.showLoading();

        try {
            // 准备数据
            const heatmapData = this.prepareData(data);

            // 清空容器
            this.container.innerHTML = '';

            // 创建画布
            const { width, height } = this.container.getBoundingClientRect();
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            this.container.appendChild(canvas);

            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.data = heatmapData;

            // 绘制热力图
            this.drawHeatmap(heatmapData, width, height);

            this.hideLoading();
            this.afterRender();
        } catch (error) {
            console.error('渲染热力图失败:', error);
            this.showError('图表渲染失败');
        }
    }

    // 绘制热力图
    drawHeatmap(data, width, height) {
        const margin = { top: 50, right: 100, bottom: 50, left: 80 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const cellWidth = innerWidth / data.xLabels.length;
        const cellHeight = innerHeight / data.yLabels.length;

        // 获取颜色比例尺
        const colorScale = this.getColorScale(data.minValue, data.maxValue);

        // 保存绘图参数
        this.drawParams = {
            margin,
            cellWidth,
            cellHeight,
            colorScale
        };

        // 绘制单元格
        this.drawCells(data.cells, cellWidth, cellHeight, colorScale, margin);

        // 绘制坐标轴标签
        this.drawAxisLabels(data, margin, cellWidth, cellHeight);

        // 绘制色阶图例
        this.drawColorLegend(colorScale, data.minValue, data.maxValue, width, margin);

        // 添加交互
        this.setupHeatmapInteractions(data);
    }

    // 获取颜色比例尺
    getColorScale(minValue, maxValue) {
        const colors = this.getColorScheme();

        return (value) => {
            const normalized = (value - minValue) / (maxValue - minValue);
            const index = Math.floor(normalized * (colors.length - 1));
            const remainder = normalized * (colors.length - 1) - index;

            if (index >= colors.length - 1) {
                return colors[colors.length - 1];
            }

            // 颜色插值
            const color1 = this.hexToRgb(colors[index]);
            const color2 = this.hexToRgb(colors[index + 1]);

            const r = Math.round(color1.r + (color2.r - color1.r) * remainder);
            const g = Math.round(color1.g + (color2.g - color1.g) * remainder);
            const b = Math.round(color1.b + (color2.b - color1.b) * remainder);

            return `rgb(${r}, ${g}, ${b})`;
        };
    }

    // 获取颜色方案
    getColorScheme() {
        const schemes = {
            default: ['#eff6ff', '#bfdbfe', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
            heat: ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706'],
            cool: ['#ecfdf5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669'],
            diverging: ['#dc2626', '#f87171', '#fecaca', '#e0e7ff', '#a5b4fc', '#6366f1', '#4338ca']
        };

        return schemes[this.colorScale] || schemes.default;
    }

    // 十六进制转RGB
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // 绘制单元格
    drawCells(cells, cellWidth, cellHeight, colorScale, margin) {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(margin.left, margin.top);

        cells.forEach(cell => {
            const x = cell.x * cellWidth;
            const y = cell.y * cellHeight;

            // 填充颜色
            ctx.fillStyle = colorScale(cell.value);
            ctx.fillRect(x, y, cellWidth, cellHeight);

            // 绘制边框
            if (this.cellBorderWidth > 0) {
                ctx.strokeStyle = this.cellBorderColor;
                ctx.lineWidth = this.cellBorderWidth;
                ctx.strokeRect(x, y, cellWidth, cellHeight);
            }

            // 显示数值
            if (this.showValues && cellWidth > 30 && cellHeight > 20) {
                ctx.fillStyle = this.getContrastColor(colorScale(cell.value));
                ctx.font = '11px Microsoft YaHei';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const text = this.formatCellValue(cell.value);
                ctx.fillText(text, x + cellWidth / 2, y + cellHeight / 2);
            }
        });

        ctx.restore();
    }

    // 获取对比色
    getContrastColor(backgroundColor) {
        // 简单的亮度计算
        const rgb = backgroundColor.match(/\d+/g);
        if (rgb) {
            const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
            return brightness > 128 ? '#000000' : '#ffffff';
        }
        return '#000000';
    }

    // 格式化单元格值
    formatCellValue(value) {
        if (this.config.valueFormat === 'percentage') {
            return Math.round(value) + '%';
        }
        if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'k';
        }
        return value.toFixed(0);
    }

    // 绘制坐标轴标签
    drawAxisLabels(data, margin, cellWidth, cellHeight) {
        const ctx = this.ctx;

        ctx.save();
        ctx.font = '12px Microsoft YaHei';
        ctx.fillStyle = '#374151';

        // X轴标签
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        data.xLabels.forEach((label, i) => {
            const x = margin.left + i * cellWidth + cellWidth / 2;
            const y = margin.top + data.yLabels.length * cellHeight + 5;

            // 如果标签太长，旋转显示
            if (label.length > 5) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
                ctx.fillText(label, 0, 0);
                ctx.restore();
            } else {
                ctx.fillText(label, x, y);
            }
        });

        // Y轴标签
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        data.yLabels.forEach((label, i) => {
            const x = margin.left - 5;
            const y = margin.top + i * cellHeight + cellHeight / 2;
            ctx.fillText(label, x, y);
        });

        ctx.restore();
    }

    // 绘制色阶图例
    drawColorLegend(colorScale, minValue, maxValue, width, margin) {
        const ctx = this.ctx;
        const legendWidth = 20;
        const legendHeight = 200;
        const legendX = width - margin.right + 20;
        const legendY = margin.top;

        ctx.save();

        // 绘制渐变
        const gradient = ctx.createLinearGradient(0, legendY + legendHeight, 0, legendY);
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const value = minValue + (maxValue - minValue) * (i / steps);
            gradient.addColorStop(i / steps, colorScale(value));
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

        // 绘制边框
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

        // 绘制刻度
        ctx.font = '11px Microsoft YaHei';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const ticks = 5;
        for (let i = 0; i <= ticks; i++) {
            const value = minValue + (maxValue - minValue) * (i / ticks);
            const y = legendY + legendHeight * (1 - i / ticks);

            ctx.beginPath();
            ctx.moveTo(legendX + legendWidth, y);
            ctx.lineTo(legendX + legendWidth + 5, y);
            ctx.stroke();

            ctx.fillText(this.formatCellValue(value), legendX + legendWidth + 10, y);
        }

        ctx.restore();
    }

    // 设置热力图交互
    setupHeatmapInteractions(data) {
        let hoveredCell = null;

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const { margin, cellWidth, cellHeight } = this.drawParams;

            // 计算鼠标所在的单元格
            const cellX = Math.floor((x - margin.left) / cellWidth);
            const cellY = Math.floor((y - margin.top) / cellHeight);

            if (cellX >= 0 && cellX < data.xLabels.length &&
                cellY >= 0 && cellY < data.yLabels.length) {

                const cell = data.cells.find(c => c.x === cellX && c.y === cellY);
                if (cell && cell !== hoveredCell) {
                    hoveredCell = cell;
                    this.handleCellHover(cell);
                }
            } else if (hoveredCell) {
                hoveredCell = null;
                this.handleCellHover(null);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (hoveredCell && this.config.onCellClick) {
                this.config.onCellClick(hoveredCell);
            }
        });
    }

    // 处理单元格悬停
    handleCellHover(cell) {
        if (cell) {
            this.canvas.style.cursor = 'pointer';

            // 高亮当前单元格
            this.highlightCell(cell);

            // 显示提示信息
            if (this.config.showTooltip !== false) {
                const tooltip = `${cell.xLabel}, ${cell.yLabel}: ${this.formatCellValue(cell.value)}`;
                this.showHeatmapTooltip(tooltip);
            }
        } else {
            this.canvas.style.cursor = 'default';
            this.redrawHeatmap();
            this.hideHeatmapTooltip();
        }
    }

    // 高亮单元格
    highlightCell(cell) {
        this.redrawHeatmap();

        const { margin, cellWidth, cellHeight } = this.drawParams;
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(margin.left, margin.top);

        // 绘制高亮边框
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 3;
        ctx.strokeRect(
            cell.x * cellWidth,
            cell.y * cellHeight,
            cellWidth,
            cellHeight
        );

        ctx.restore();
    }

    // 重绘热力图
    redrawHeatmap() {
        if (this.data) {
            const { width, height } = this.canvas;
            this.ctx.clearRect(0, 0, width, height);
            this.drawHeatmap(this.data, width, height);
        }
    }

    // 显示热力图提示框
    showHeatmapTooltip(text) {
        // 实现提示框显示逻辑
        console.log(text);
    }

    // 隐藏热力图提示框
    hideHeatmapTooltip() {
        // 实现提示框隐藏逻辑
    }

    // 更新数据
    update(newData) {
        this.render(newData);
    }

    // 导出热力图数据
    exportData() {
        return {
            xLabels: this.data.xLabels,
            yLabels: this.data.yLabels,
            values: this.data.cells.map(cell => ({
                x: cell.xLabel,
                y: cell.yLabel,
                value: cell.value
            }))
        };
    }
}

// 注册到工厂
window.HeatmapChart = HeatmapChart;