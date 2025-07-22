/**
 * 图表工厂类
 * 统一管理所有图表类型的创建和配置
 */

class ChartFactory {
    constructor() {
        this.chartTypes = new Map();
        this.defaultOptions = ChartOptions;
        this.registerDefaultTypes();
    }

    // 注册默认图表类型
    registerDefaultTypes() {
        // 基础图表类型将在各自的文件中自动注册
        this.chartTypes.set('pie', 'PieChart');
        this.chartTypes.set('line', 'LineChart');
        this.chartTypes.set('bar', 'BarChart');
        this.chartTypes.set('gauge', 'GaugeChart');
        this.chartTypes.set('radar', 'RadarChart');
        this.chartTypes.set('sankey', 'SankeyChart');
        this.chartTypes.set('heatmap', 'HeatmapChart');
    }

    // 注册新的图表类型
    registerChartType(type, chartClass) {
        this.chartTypes.set(type, chartClass);
    }

    // 创建图表实例
    createChart(type, config) {
        if (!this.chartTypes.has(type)) {
            throw new Error(`未知的图表类型: ${type}`);
        }

        const chartClassName = this.chartTypes.get(type);

        // 动态获取图表类
        const ChartClass = window[chartClassName];
        if (!ChartClass) {
            throw new Error(`图表类 ${chartClassName} 未定义`);
        }

        // 合并配置
        const mergedConfig = this.mergeConfig(type, config);

        // 创建图表实例
        const chart = new ChartClass(mergedConfig);

        // 注册到全局配置管理器
        if (window.chartConfig && mergedConfig.id) {
            window.chartConfig.registerChart(mergedConfig.id, chart.chartInstance);
        }

        return chart;
    }

    // 合并配置
    mergeConfig(type, userConfig) {
        // 获取该类型的默认配置
        const defaultConfig = this.defaultOptions.getConfig(type);

        // 获取响应式配置
        const responsiveConfig = window.chartConfig ?
            window.chartConfig.getResponsiveConfig() : {};

        // 生成唯一ID
        const id = userConfig.id || ChartUtils.generateChartId(type);

        // 合并所有配置
        return {
            id: id,
            type: type,
            ...defaultConfig,
            ...responsiveConfig,
            ...userConfig
        };
    }

    // 批量创建图表
    createCharts(configs) {
        const charts = new Map();

        configs.forEach(config => {
            try {
                const chart = this.createChart(config.type, config);
                charts.set(config.id || chart.id, chart);
            } catch (error) {
                console.error('创建图表失败:', error);
            }
        });

        return charts;
    }

    // 更新图表
    updateChart(chartId, newData, options = {}) {
        const chart = this.getChart(chartId);
        if (chart) {
            chart.update(newData, options);
        }
    }

    // 获取图表实例
    getChart(chartId) {
        if (window.chartConfig) {
            return window.chartConfig.charts.get(chartId);
        }
        return null;
    }

    // 销毁图表
    destroyChart(chartId) {
        if (window.chartConfig) {
            window.chartConfig.unregisterChart(chartId);
        }
    }

    // 销毁所有图表
    destroyAllCharts() {
        if (window.chartConfig) {
            window.chartConfig.destroyAll();
        }
    }

    // 导出图表
    exportChart(chartId, format = 'png') {
        const chart = this.getChart(chartId);
        if (chart) {
            if (format === 'png' || format === 'jpg') {
                ChartUtils.downloadChart(chart, `chart-${chartId}.${format}`);
            } else if (format === 'data') {
                ChartUtils.exportChartData(chart, 'csv');
            }
        }
    }

    // 全屏显示
    fullscreenChart(chartId) {
        const chart = this.getChart(chartId);
        if (chart && chart.canvas) {
            ChartUtils.fullscreenChart(chart.canvas.parentElement);
        }
    }
}

// 基础图表类
class BaseChart {
    constructor(config) {
        this.config = config;
        this.id = config.id;
        this.type = config.type;
        this.container = null;
        this.canvas = null;
        this.chartInstance = null;
        this.isLoading = false;

        this.init();
    }

    // 初始化
    init() {
        this.setupContainer();
        if (this.config.data) {
            this.render(this.config.data);
        }
    }

    // 设置容器
    setupContainer() {
        if (typeof this.config.container === 'string') {
            this.container = document.querySelector(this.config.container);
        } else {
            this.container = this.config.container;
        }

        if (!this.container) {
            throw new Error('图表容器未找到');
        }

        // 创建canvas元素
        this.canvas = ChartUtils.createChartContainer(this.container);
        this.canvas.id = this.id;
    }

    // 渲染图表
    render(data) {
        this.showLoading();

        try {
            // 准备数据
            const chartData = this.prepareData(data);

            // 创建图表配置
            const chartConfig = {
                type: this.getChartType(),
                data: chartData,
                options: this.getOptions()
            };

            // 创建或更新图表实例
            if (this.chartInstance) {
                this.chartInstance.data = chartData;
                this.chartInstance.options = chartConfig.options;
                this.chartInstance.update();
            } else {
                this.chartInstance = new Chart(this.canvas, chartConfig);
            }

            this.hideLoading();
            this.afterRender();
        } catch (error) {
            console.error('渲染图表失败:', error);
            this.showError('图表渲染失败');
        }
    }

    // 获取图表类型
    getChartType() {
        return this.type;
    }

    // 准备数据（子类重写）
    prepareData(data) {
        return data;
    }

    // 获取配置选项（子类可重写）
    getOptions() {
        return this.config;
    }

    // 渲染后处理
    afterRender() {
        // 触发渲染完成事件
        this.container.dispatchEvent(new CustomEvent('chartRendered', {
            detail: { chart: this, id: this.id }
        }));
    }

    // 更新图表
    update(newData, options = {}) {
        if (this.chartInstance) {
            if (newData) {
                const preparedData = this.prepareData(newData);
                this.chartInstance.data = preparedData;
            }

            if (options.animation !== false) {
                ChartUtils.animateChartUpdate(this.chartInstance, this.chartInstance.data, options.duration);
            } else {
                this.chartInstance.update('none');
            }
        } else {
            this.render(newData);
        }
    }

    // 显示加载状态
    showLoading() {
        if (!this.isLoading) {
            this.isLoading = true;
            this.loadingElement = ChartUtils.createLoadingState(this.container);
        }
    }

    // 隐藏加载状态
    hideLoading() {
        if (this.isLoading && this.loadingElement) {
            ChartUtils.removeLoadingState(this.loadingElement);
            this.isLoading = false;
        }
    }

    // 显示错误
    showError(message) {
        this.hideLoading();
        ChartUtils.createEmptyState(this.container, message);
    }

    // 显示空数据状态
    showEmpty(message = '暂无数据') {
        this.hideLoading();
        ChartUtils.createEmptyState(this.container, message);
    }

    // 调整大小
    resize() {
        if (this.chartInstance) {
            this.chartInstance.resize();
        }
    }

    // 销毁图表
    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }

        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // 导出图表
    export(format = 'png') {
        if (this.chartInstance) {
            ChartUtils.downloadChart(this.chartInstance, `${this.type}-${this.id}.${format}`);
        }
    }

    // 全屏显示
    fullscreen() {
        ChartUtils.fullscreenChart(this.container);
    }
}

// 创建全局实例
window.ChartFactory = new ChartFactory();
window.BaseChart = BaseChart;