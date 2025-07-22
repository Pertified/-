/**
 * 颜色方案管理器
 * 提供统一的颜色管理和主题适配功能
 */

const ColorPalette = {
    // 预定义的颜色方案
    schemes: {
        // 默认配色方案 - 明亮活泼
        default: {
            primary: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'],
            secondary: ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f9a8d4', '#22d3ee', '#a3e635', '#fb923c', '#818cf8'],
            accent: ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#ea580c', '#4f46e5']
        },

        // 财务专业配色 - 稳重可信
        financial: {
            primary: ['#2563eb', '#059669', '#7c3aed', '#dc2626', '#0891b2', '#ca8a04', '#db2777', '#65a30d', '#ea580c', '#4f46e5'],
            secondary: ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f59e0b', '#ec4899', '#84cc16', '#f97316', '#6366f1'],
            accent: ['#1e40af', '#047857', '#6d28d9', '#b91c1c', '#0e7490', '#a16207', '#be185d', '#4d7c0f', '#c2410c', '#4338ca']
        },

        // 单色系配色 - 简洁优雅
        monochrome: {
            primary: ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb', '#ffffff'],
            secondary: ['#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb'],
            accent: ['#000000', '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6']
        },

        // 暖色系配色 - 温暖友好
        warm: {
            primary: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#facc15'],
            secondary: ['#f87171', '#fb923c', '#fbbf24', '#fde047', '#a3e635', '#f9a8d4', '#fb7185', '#fdba74', '#fcd34d', '#fde68a'],
            accent: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#db2777', '#e11d48', '#f97316', '#f59e0b', '#eab308']
        },

        // 冷色系配色 - 专业冷静
        cool: {
            primary: ['#3b82f6', '#06b6d4', '#0891b2', '#6366f1', '#8b5cf6', '#2563eb', '#0284c7', '#0e7490', '#4f46e5', '#7c3aed'],
            secondary: ['#60a5fa', '#22d3ee', '#06b6d4', '#818cf8', '#a78bfa', '#3b82f6', '#0ea5e9', '#14b8a6', '#6366f1', '#8b5cf6'],
            accent: ['#2563eb', '#0891b2', '#0e7490', '#4f46e5', '#7c3aed', '#1e40af', '#0369a1', '#047857', '#4338ca', '#6d28d9']
        }
    },

    // 当前使用的配色方案
    currentScheme: 'default',

    // 获取颜色
    getColor(index, type = 'primary') {
        const scheme = this.schemes[this.currentScheme];
        const colors = scheme[type] || scheme.primary;
        return colors[index % colors.length];
    },

    // 获取颜色数组
    getColors(count, type = 'primary') {
        const colors = [];
        for (let i = 0; i < count; i++) {
            colors.push(this.getColor(i, type));
        }
        return colors;
    },

    // 设置配色方案
    setScheme(schemeName) {
        if (this.schemes[schemeName]) {
            this.currentScheme = schemeName;
            this.notifyChange();
        }
    },

    // 获取渐变色
    getGradient(startIndex, endIndex, type = 'linear') {
        const startColor = this.getColor(startIndex);
        const endColor = this.getColor(endIndex || startIndex + 1);

        if (type === 'linear') {
            return `linear-gradient(135deg, ${startColor}, ${endColor})`;
        } else if (type === 'radial') {
            return `radial-gradient(circle, ${startColor}, ${endColor})`;
        }
    },

    // 获取透明度颜色
    getColorWithAlpha(index, alpha = 0.8, type = 'primary') {
        const color = this.getColor(index, type);
        return this.hexToRgba(color, alpha);
    },

    // 十六进制转RGBA
    hexToRgba(hex, alpha = 1) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        return hex;
    },

    // 生成阴影颜色
    getShadowColors(index) {
        const baseColor = this.getColor(index);
        return {
            light: this.getColorWithAlpha(index, 0.1),
            medium: this.getColorWithAlpha(index, 0.2),
            dark: this.getColorWithAlpha(index, 0.3)
        };
    },

    // 获取对比色
    getContrastColor(backgroundColor) {
        // 简单的亮度计算
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        return brightness > 128 ? '#000000' : '#ffffff';
    },

    // 生成色阶
    generateColorScale(baseColor, steps = 5) {
        const scale = [];
        const baseHex = baseColor.replace('#', '');
        const r = parseInt(baseHex.substr(0, 2), 16);
        const g = parseInt(baseHex.substr(2, 2), 16);
        const b = parseInt(baseHex.substr(4, 2), 16);

        for (let i = 0; i < steps; i++) {
            const factor = 1 - (i / (steps - 1)) * 0.8;
            const newR = Math.round(r * factor);
            const newG = Math.round(g * factor);
            const newB = Math.round(b * factor);
            scale.push(`#${this.componentToHex(newR)}${this.componentToHex(newG)}${this.componentToHex(newB)}`);
        }

        return scale;
    },

    // 组件转十六进制
    componentToHex(c) {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    },

    // 获取图表配色
    getChartColors(type, count) {
        switch (type) {
            case 'comparison':
                // 对比图表使用对比鲜明的颜色
                return this.getColors(count, 'primary');
            case 'trend':
                // 趋势图表使用渐变色系
                return this.generateColorScale(this.getColor(0), count);
            case 'category':
                // 分类图表使用多样化颜色
                return this.getColors(count, 'secondary');
            default:
                return this.getColors(count);
        }
    },

    // 通知颜色方案变化
    notifyChange() {
        document.dispatchEvent(new CustomEvent('colorSchemeChanged', {
            detail: { scheme: this.currentScheme }
        }));
    },

    // 初始化
    init() {
        // 根据主题自动选择配色方案
        const theme = localStorage.getItem('theme') || 'light';
        if (theme === 'dark') {
            this.setScheme('cool');
        }

        // 监听主题变化
        document.addEventListener('themeChanged', (e) => {
            if (e.detail.theme === 'dark') {
                this.setScheme('cool');
            } else {
                this.setScheme('default');
            }
        });
    }
};

// 初始化颜色管理器
ColorPalette.init();

// 导出
window.ColorPalette = ColorPalette;