/**
 * 数据格式化工具
 * 处理财务数据的格式化和转换
 */

const DataFormatter = {
    // 格式化货币
    formatCurrency(value, options = {}) {
        const defaultOptions = {
            style: 'currency',
            currency: 'CNY',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        };

        const formatOptions = { ...defaultOptions, ...options };

        return new Intl.NumberFormat('zh-CN', formatOptions).format(value);
    },

    // 格式化百分比
    formatPercentage(value, decimals = 1) {
        return `${(value * 100).toFixed(decimals)}%`;
    },

    // 格式化大数字（千、万、亿）
    formatLargeNumber(value) {
        if (value >= 100000000) {
            return (value / 100000000).toFixed(2) + '亿';
        } else if (value >= 10000) {
            return (value / 10000).toFixed(2) + '万';
        } else if (value >= 1000) {
            return (value / 1000).toFixed(2) + '千';
        }
        return value.toString();
    },

    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        const formats = {
            'YYYY-MM-DD': `${year}-${month}-${day}`,
            'YYYY/MM/DD': `${year}/${month}/${day}`,
            'DD/MM/YYYY': `${day}/${month}/${year}`,
            'MM-DD': `${month}-${day}`,
            'YYYY年MM月': `${year}年${month}月`,
            'MM月DD日': `${month}月${day}日`
        };

        return formats[format] || formats['YYYY-MM-DD'];
    },

    // 格式化时间范围
    formatDateRange(startDate, endDate) {
        const start = this.formatDate(startDate, 'MM月DD日');
        const end = this.formatDate(endDate, 'MM月DD日');
        return `${start} - ${end}`;
    },

    // 准备图表数据
    prepareChartData(rawData, type) {
        switch (type) {
            case 'pie':
                return this.preparePieData(rawData);
            case 'line':
                return this.prepareLineData(rawData);
            case 'bar':
                return this.prepareBarData(rawData);
            case 'radar':
                return this.prepareRadarData(rawData);
            default:
                return rawData;
        }
    },

    // 准备饼图数据
    preparePieData(data) {
        const labels = [];
        const values = [];
        const colors = [];

        data.forEach((item, index) => {
            labels.push(item.name || item.label);
            values.push(item.value || item.amount);
            colors.push(item.color || ChartOptions.colorSchemes.default[index % 10]);
        });

        return {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };
    },

    // 准备折线图数据
    prepareLineData(data) {
        const labels = data.labels || data.map(d => d.date);
        const datasets = [];

        if (data.series) {
            data.series.forEach((series, index) => {
                datasets.push({
                    label: series.name,
                    data: series.data,
                    borderColor: ChartOptions.colorSchemes.default[index],
                    backgroundColor: ChartOptions.colorSchemes.default[index] + '20',
                    tension: 0.3,
                    fill: series.fill !== false
                });
            });
        } else {
            datasets.push({
                label: '金额',
                data: data.map(d => d.value || d.amount),
                borderColor: ChartOptions.colorSchemes.default[0],
                backgroundColor: ChartOptions.colorSchemes.default[0] + '20',
                tension: 0.3,
                fill: true
            });
        }

        return {
            labels: labels,
            datasets: datasets
        };
    },

    // 准备柱状图数据
    prepareBarData(data) {
        const labels = data.labels || data.map(d => d.name || d.category);
        const values = data.values || data.map(d => d.value || d.amount);

        return {
            labels: labels,
            datasets: [{
                label: data.label || '金额',
                data: values,
                backgroundColor: ChartOptions.colorSchemes.default[0],
                borderColor: ChartOptions.colorSchemes.default[0],
                borderWidth: 1
            }]
        };
    },

    // 准备雷达图数据
    prepareRadarData(data) {
        const labels = data.dimensions || data.map(d => d.dimension);
        const datasets = [];

        if (data.series) {
            data.series.forEach((series, index) => {
                datasets.push({
                    label: series.name,
                    data: series.values,
                    borderColor: ChartOptions.colorSchemes.default[index],
                    backgroundColor: ChartOptions.colorSchemes.default[index] + '40',
                    pointBackgroundColor: ChartOptions.colorSchemes.default[index],
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: ChartOptions.colorSchemes.default[index]
                });
            });
        }

        return {
            labels: labels,
            datasets: datasets
        };
    },

    // 聚合数据
    aggregateData(data, groupBy, aggregateField = 'amount') {
        const grouped = {};

        data.forEach(item => {
            const key = item[groupBy];
            if (!grouped[key]) {
                grouped[key] = 0;
            }
            grouped[key] += item[aggregateField] || 0;
        });

        return Object.entries(grouped).map(([key, value]) => ({
            name: key,
            value: value
        }));
    },

    // 计算百分比分布
    calculatePercentages(data) {
        const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

        return data.map(item => ({
            ...item,
            percentage: total > 0 ? (item.value / total) * 100 : 0
        }));
    },

    // 获取时间段数据
    getTimeSeriesData(data, period = 'month') {
        const grouped = {};

        data.forEach(item => {
            const date = new Date(item.date);
            let key;

            switch (period) {
                case 'day':
                    key = this.formatDate(date, 'YYYY-MM-DD');
                    break;
                case 'week':
                    key = this.getWeekKey(date);
                    break;
                case 'month':
                    key = this.formatDate(date, 'YYYY年MM月');
                    break;
                case 'year':
                    key = date.getFullYear() + '年';
                    break;
                default:
                    key = this.formatDate(date, 'YYYY-MM-DD');
            }

            if (!grouped[key]) {
                grouped[key] = 0;
            }
            grouped[key] += item.amount || 0;
        });

        return Object.entries(grouped).map(([date, amount]) => ({
            date: date,
            amount: amount
        }));
    },

    // 获取周标识
    getWeekKey(date) {
        const year = date.getFullYear();
        const firstDay = new Date(year, 0, 1);
        const weekNumber = Math.ceil(((date - firstDay) / 86400000 + firstDay.getDay() + 1) / 7);
        return `${year}年第${weekNumber}周`;
    }
};

// 导出工具
window.DataFormatter = DataFormatter;