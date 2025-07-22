/**
 * 图表动画效果库
 * 提供各种动画效果和过渡效果
 */

const ChartAnimations = {
    // 动画缓动函数
    easingFunctions: {
        linear: (t) => t,
        easeInQuad: (t) => t * t,
        easeOutQuad: (t) => t * (2 - t),
        easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        easeInCubic: (t) => t * t * t,
        easeOutCubic: (t) => (--t) * t * t + 1,
        easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
        easeInQuart: (t) => t * t * t * t,
        easeOutQuart: (t) => 1 - (--t) * t * t * t,
        easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
        easeInElastic: (t) => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
        },
        easeOutElastic: (t) => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        },
        easeOutBounce: (t) => {
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) {
                return n1 * t * t;
            } else if (t < 2 / d1) {
                return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
                return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
                return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
        }
    },

    // 应用动画到图表
    applyAnimation(chart, animationType, options = {}) {
        const defaultOptions = {
            duration: 1000,
            easing: 'easeOutQuart',
            onComplete: null
        };

        const config = { ...defaultOptions, ...options };

        switch (animationType) {
            case 'fadeIn':
                return this.fadeIn(chart, config);
            case 'slideIn':
                return this.slideIn(chart, config);
            case 'grow':
                return this.grow(chart, config);
            case 'rotate':
                return this.rotate(chart, config);
            case 'wave':
                return this.wave(chart, config);
            case 'bounce':
                return this.bounce(chart, config);
            case 'pulse':
                return this.pulse(chart, config);
            default:
                return this.fadeIn(chart, config);
        }
    },

    // 淡入动画
    fadeIn(chart, config) {
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easedProgress = this.easingFunctions[config.easing](progress);

            chart.options.plugins.legend.labels.color = `rgba(55, 65, 81, ${easedProgress})`;

            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.ticks) {
                        scale.ticks.color = `rgba(55, 65, 81, ${easedProgress})`;
                    }
                });
            }

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 滑入动画
    slideIn(chart, config) {
        const originalData = chart.data.datasets.map(dataset => [...dataset.data]);
        const startTime = Date.now();

        chart.data.datasets.forEach(dataset => {
            dataset.data = dataset.data.map(() => 0);
        });
        chart.update('none');

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easedProgress = this.easingFunctions[config.easing](progress);

            chart.data.datasets.forEach((dataset, i) => {
                dataset.data = originalData[i].map(value => value * easedProgress);
            });

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 增长动画
    grow(chart, config) {
        if (chart.config.type === 'bar') {
            return this.growBars(chart, config);
        } else if (chart.config.type === 'line') {
            return this.growLine(chart, config);
        } else if (chart.config.type === 'pie' || chart.config.type === 'doughnut') {
            return this.growPie(chart, config);
        }
    },

    // 柱状图增长动画
    growBars(chart, config) {
        const originalData = chart.data.datasets.map(dataset => [...dataset.data]);
        const startTime = Date.now();

        chart.data.datasets.forEach(dataset => {
            dataset.data = dataset.data.map(() => 0);
        });
        chart.update('none');

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easedProgress = this.easingFunctions[config.easing](progress);

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                dataset.data = originalData[datasetIndex].map((value, index) => {
                    const delay = index * 50;
                    const adjustedElapsed = Math.max(0, elapsed - delay);
                    const adjustedProgress = Math.min(adjustedElapsed / config.duration, 1);
                    const adjustedEasedProgress = this.easingFunctions[config.easing](adjustedProgress);
                    return value * adjustedEasedProgress;
                });
            });

            chart.update('none');

            if (progress < 1 || chart.data.datasets[0].data.some((_, index) =>
                elapsed - index * 50 < config.duration)) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 折线图增长动画
    growLine(chart, config) {
        const originalData = chart.data.datasets.map(dataset => [...dataset.data]);
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easedProgress = this.easingFunctions[config.easing](progress);

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const originalDataset = originalData[datasetIndex];
                const visiblePoints = Math.floor(originalDataset.length * easedProgress);

                dataset.data = originalDataset.slice(0, visiblePoints);

                if (visiblePoints < originalDataset.length && visiblePoints > 0) {
                    const nextValue = originalDataset[visiblePoints];
                    const prevValue = originalDataset[visiblePoints - 1];
                    const pointProgress = (originalDataset.length * easedProgress) % 1;
                    const interpolatedValue = prevValue + (nextValue - prevValue) * pointProgress;
                    dataset.data.push(interpolatedValue);
                }
            });

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 饼图增长动画
    growPie(chart, config) {
        const startTime = Date.now();
        const originalRotation = chart.options.rotation || -90;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easedProgress = this.easingFunctions[config.easing](progress);

            chart.options.circumference = 360 * easedProgress;
            chart.options.rotation = originalRotation + (360 * (1 - easedProgress));

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 波浪动画
    wave(chart, config) {
        if (chart.config.type !== 'line') return;

        const originalData = chart.data.datasets.map(dataset => [...dataset.data]);
        const startTime = Date.now();
        const waveFrequency = config.waveFrequency || 0.1;
        const waveAmplitude = config.waveAmplitude || 0.1;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                dataset.data = originalData[datasetIndex].map((value, index) => {
                    const waveOffset = Math.sin((index * waveFrequency + elapsed * 0.002) * Math.PI) *
                                      waveAmplitude * (1 - progress);
                    return value * (1 + waveOffset);
                });
            });

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 弹跳动画
    bounce(chart, config) {
        const originalData = chart.data.datasets.map(dataset => [...dataset.data]);
        const startTime = Date.now();

        chart.data.datasets.forEach(dataset => {
            dataset.data = dataset.data.map(() => 0);
        });
        chart.update('none');

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const easedProgress = this.easingFunctions.easeOutBounce(progress);

            chart.data.datasets.forEach((dataset, i) => {
                dataset.data = originalData[i].map(value => value * easedProgress);
            });

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 脉冲动画
    pulse(chart, config) {
        const startTime = Date.now();
        const pulseCount = config.pulseCount || 3;
        const pulseDuration = config.duration / pulseCount;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / config.duration, 1);
            const pulseProgress = (elapsed % pulseDuration) / pulseDuration;
            const scale = 1 + Math.sin(pulseProgress * Math.PI) * 0.1 * (1 - progress);

            if (chart.options.scales) {
                Object.values(chart.options.scales).forEach(scale => {
                    if (scale.ticks) {
                        scale.ticks.font = scale.ticks.font || {};
                        scale.ticks.font.size = 12 * scale;
                    }
                });
            }

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (config.onComplete) {
                config.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },

    // 数据更新动画
    animateDataUpdate(chart, newData, config = {}) {
        const defaultConfig = {
            duration: 750,
            easing: 'easeInOutQuart'
        };

        const animConfig = { ...defaultConfig, ...config };
        const oldData = chart.data.datasets.map(dataset => [...dataset.data]);
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / animConfig.duration, 1);
            const easedProgress = this.easingFunctions[animConfig.easing](progress);

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                dataset.data = dataset.data.map((_, dataIndex) => {
                    const oldValue = oldData[datasetIndex][dataIndex] || 0;
                    const newValue = newData.datasets[datasetIndex].data[dataIndex] || 0;
                    return oldValue + (newValue - oldValue) * easedProgress;
                });
            });

            chart.update('none');

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                chart.data = newData;
                chart.update('none');
                if (animConfig.onComplete) {
                    animConfig.onComplete();
                }
            }
        };

        requestAnimationFrame(animate);
    },

    // 创建加载动画
    createLoadingAnimation(container) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chart-loading-animation';
        loadingDiv.innerHTML = `
            <div class="loading-spinner">
                <svg viewBox="0 0 50 50" class="circular">
                    <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="3"></circle>
                </svg>
            </div>
            <p class="loading-text">加载图表中...</p>
        `;

        container.appendChild(loadingDiv);

        return {
            remove: () => {
                loadingDiv.classList.add('fade-out');
                setTimeout(() => loadingDiv.remove(), 300);
            }
        };
    },

    // 数字滚动动画
    animateNumber(element, startValue, endValue, duration = 1000) {
        const startTime = Date.now();
        const isInteger = Number.isInteger(endValue);

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = this.easingFunctions.easeOutQuart(progress);

            const currentValue = startValue + (endValue - startValue) * easedProgress;

            if (isInteger) {
                element.textContent = Math.round(currentValue).toLocaleString();
            } else {
                element.textContent = currentValue.toFixed(2).toLocaleString();
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
};

window.ChartAnimations = ChartAnimations;