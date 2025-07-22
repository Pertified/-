/**
 * 图表配置管理器
 * 处理主题切换、响应式调整和图表实例管理
 */

class ChartConfig {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.charts = new Map();
        this.initThemeColors();
        this.setupEventListeners();
    }

    // 初始化主题颜色
    initThemeColors() {
        this.themes = {
            light: {
                textColor: '#374151',
                gridColor: 'rgba(0, 0, 0, 0.05)',
                backgroundColor: '#ffffff',
                borderColor: '#e5e7eb',
                tooltipBackground: 'rgba(0, 0, 0, 0.8)',
                tooltipText: '#ffffff'
            },
            dark: {
                textColor: '#e5e7eb',
                gridColor: 'rgba(255, 255, 255, 0.1)',
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                tooltipBackground: 'rgba(255, 255, 255, 0.9)',
                tooltipText: '#1f2937'
            }
        };
    }

    // 设置事件监听器
    setupEventListeners() {
        // 监听主题切换
        document.addEventListener('themeChanged', (e) => {
            this.updateTheme(e.detail.theme);
        });

        // 监听窗口大小变化
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    // 注册图表实例
    registerChart(id, chartInstance) {
        this.charts.set(id, chartInstance);
        this.applyTheme(chartInstance);
    }

    // 注销图表实例
    unregisterChart(id) {
        if (this.charts.has(id)) {
            const chart = this.charts.get(id);
            chart.destroy();
            this.charts.delete(id);
        }
    }

    // 更新主题
    updateTheme(theme) {
        this.currentTheme = theme;
        this.charts.forEach(chart => {
            this.applyTheme(chart);
            chart.update('none');
        });
    }

    // 应用主题到图表
    applyTheme(chart) {
        const theme = this.themes[this.currentTheme];
        const options = chart.options;

        // 更新全局字体颜色
        Chart.defaults.color = theme.textColor;

        // 更新图例颜色
        if (options.plugins?.legend?.labels) {
            options.plugins.legend.labels.color = theme.textColor;
        }

        // 更新坐标轴
        if (options.scales) {
            Object.values(options.scales).forEach(scale => {
                if (scale.ticks) {
                    scale.ticks.color = theme.textColor;
                }
                if (scale.grid) {
                    scale.grid.color = theme.gridColor;
                    scale.grid.borderColor = theme.borderColor;
                }
                if (scale.title) {
                    scale.title.color = theme.textColor;
                }
            });
        }

        // 更新工具提示
        if (options.plugins?.tooltip) {
            options.plugins.tooltip.backgroundColor = theme.tooltipBackground;
            options.plugins.tooltip.titleColor = theme.tooltipText;
            options.plugins.tooltip.bodyColor = theme.tooltipText;
        }
    }

    // 处理窗口大小变化
    handleResize() {
        const isMobile = window.innerWidth < 640;
        const isTablet = window.innerWidth < 1024;

        this.charts.forEach(chart => {
            const options = chart.options;

            // 调整图例位置
            if (options.plugins?.legend) {
                if (isMobile) {
                    options.plugins.legend.position = 'bottom';
                } else {
                    options.plugins.legend.position = chart.config._config.plugins?.legend?.position || 'top';
                }
            }

            // 调整字体大小
            if (isMobile) {
                this.setFontSizes(options, 10, 11);
            } else if (isTablet) {
                this.setFontSizes(options, 11, 12);
            } else {
                this.setFontSizes(options, 12, 14);
            }

            chart.update('none');
        });
    }

    // 设置字体大小
    setFontSizes(options, baseSize, titleSize) {
        if (options.plugins?.legend?.labels?.font) {
            options.plugins.legend.labels.font.size = baseSize;
        }
        if (options.plugins?.tooltip) {
            options.plugins.tooltip.bodyFont = { size: baseSize };
            options.plugins.tooltip.titleFont = { size: titleSize };
        }
        if (options.scales) {
            Object.values(options.scales).forEach(scale => {
                if (scale.ticks?.font) {
                    scale.ticks.font.size = baseSize;
                }
            });
        }
    }

    // 获取当前主题
    getCurrentTheme() {
        return this.themes[this.currentTheme];
    }

    // 获取响应式配置
    getResponsiveConfig() {
        const width = window.innerWidth;

        if (width < 640) {
            return {
                maintainAspectRatio: true,
                aspectRatio: 1.5
            };
        } else if (width < 1024) {
            return {
                maintainAspectRatio: false,
                aspectRatio: 2
            };
        } else {
            return {
                maintainAspectRatio: false
            };
        }
    }

    // 销毁所有图表
    destroyAll() {
        this.charts.forEach((chart, id) => {
            chart.destroy();
        });
        this.charts.clear();
    }
}

// 创建全局实例
window.chartConfig = new ChartConfig();