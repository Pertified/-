/**
 * 全局图表配置选项
 * 定义所有图表类型的默认配置和主题设置
 */

const ChartOptions = {
    // 全局默认配置
    global: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    padding: 15,
                    font: {
                        size: 12,
                        family: "'Microsoft YaHei', 'Arial', sans-serif"
                    },
                    usePointStyle: true
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: {
                    size: 14,
                    family: "'Microsoft YaHei', 'Arial', sans-serif"
                },
                bodyFont: {
                    size: 13,
                    family: "'Microsoft YaHei', 'Arial', sans-serif"
                },
                padding: 12,
                cornerRadius: 6,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('zh-CN', {
                                style: 'currency',
                                currency: 'CNY'
                            }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            }
        }
    },

    // 饼图/环形图配置
    pie: {
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    generateLabels: function(chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            const dataset = data.datasets[0];
                            const total = dataset.data.reduce((a, b) => a + b, 0);
                            return data.labels.map((label, i) => {
                                const value = dataset.data[i];
                                const percentage = ((value / total) * 100).toFixed(1);
                                return {
                                    text: `${label}: ${percentage}%`,
                                    fillStyle: dataset.backgroundColor[i],
                                    hidden: isNaN(value),
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ¥${value.toLocaleString()} (${percentage}%)`;
                    }
                }
            }
        }
    },

    // 折线图配置
    line: {
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: 11
                    },
                    callback: function(value) {
                        return '¥' + value.toLocaleString();
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: true
            }
        },
        elements: {
            line: {
                tension: 0.3,
                borderWidth: 2
            },
            point: {
                radius: 3,
                hoverRadius: 5,
                backgroundColor: '#fff',
                borderWidth: 2
            }
        }
    },

    // 柱状图配置
    bar: {
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 11
                    }
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        size: 11
                    },
                    callback: function(value) {
                        return '¥' + value.toLocaleString();
                    }
                }
            }
        },
        plugins: {
            legend: {
                display: false
            }
        },
        barPercentage: 0.7,
        categoryPercentage: 0.8
    },

    // 仪表盘配置
    gauge: {
        type: 'doughnut',
        circumference: 180,
        rotation: 270,
        cutout: '75%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: false
            }
        }
    },

    // 雷达图配置
    radar: {
        scales: {
            r: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                pointLabels: {
                    font: {
                        size: 12
                    }
                },
                ticks: {
                    font: {
                        size: 10
                    },
                    stepSize: 20,
                    callback: function(value) {
                        return value + '%';
                    }
                }
            }
        },
        elements: {
            line: {
                borderWidth: 2
            },
            point: {
                radius: 3,
                hoverRadius: 5
            }
        }
    },

    // 颜色方案
    colorSchemes: {
        default: [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ],
        financial: [
            '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#7c3aed',
            '#db2777', '#0891b2', '#65a30d', '#ea580c', '#4f46e5'
        ],
        monochrome: [
            '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af',
            '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb', '#ffffff'
        ]
    },

    // 获取配置方法
    getConfig(type, customOptions = {}) {
        const baseConfig = {
            ...this.global,
            ...this[type]
        };
        return this.deepMerge(baseConfig, customOptions);
    },

    // 深度合并配置
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    },

    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
};

// 导出配置
window.ChartOptions = ChartOptions;