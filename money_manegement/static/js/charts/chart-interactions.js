/**
 * 图表交互功能库
 * 提供各种交互功能如缩放、拖拽、筛选等
 */

const ChartInteractions = {
    // 启用的交互功能映射
    enabledInteractions: new Map(),

    // 初始化交互功能
    initInteractions(chart, options = {}) {
        const chartId = chart.id || chart.canvas.id;

        const defaultOptions = {
            zoom: false,
            pan: false,
            drag: false,
            filter: false,
            export: true,
            fullscreen: true,
            crosshair: false,
            dataLabels: false
        };

        const config = { ...defaultOptions, ...options };
        this.enabledInteractions.set(chartId, config);

        if (config.zoom || config.pan) {
            this.enableZoomPan(chart, config);
        }

        if (config.drag) {
            this.enableDrag(chart);
        }

        if (config.filter) {
            this.enableFilter(chart);
        }

        if (config.export) {
            this.enableExport(chart);
        }

        if (config.fullscreen) {
            this.enableFullscreen(chart);
        }

        if (config.crosshair) {
            this.enableCrosshair(chart);
        }

        if (config.dataLabels) {
            this.enableDataLabels(chart);
        }

        this.setupContextMenu(chart);
    },

    // 启用缩放和平移
    enableZoomPan(chart, config) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentTransform = { x: 0, y: 0, scale: 1 };

        const canvas = chart.canvas;

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = currentTransform.scale * delta;

            if (newScale >= 0.5 && newScale <= 3) {
                currentTransform.scale = newScale;
                this.applyTransform(chart, currentTransform);
            }
        });

        if (config.pan) {
            canvas.addEventListener('mousedown', (e) => {
                isDragging = true;
                startX = e.clientX - currentTransform.x;
                startY = e.clientY - currentTransform.y;
                canvas.style.cursor = 'grabbing';
            });

            canvas.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                currentTransform.x = e.clientX - startX;
                currentTransform.y = e.clientY - startY;

                this.applyTransform(chart, currentTransform);
            });

            canvas.addEventListener('mouseup', () => {
                isDragging = false;
                canvas.style.cursor = 'grab';
            });

            canvas.addEventListener('mouseleave', () => {
                isDragging = false;
                canvas.style.cursor = 'default';
            });
        }

        this.addResetButton(chart, () => {
            currentTransform = { x: 0, y: 0, scale: 1 };
            this.applyTransform(chart, currentTransform);
        });
    },

    // 应用变换
    applyTransform(chart, transform) {
        const ctx = chart.ctx;

        ctx.save();
        ctx.clearRect(0, 0, chart.width, chart.height);
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.scale, transform.scale);

        chart.draw();

        ctx.restore();
    },

    // 添加重置按钮
    addResetButton(chart, callback) {
        const container = chart.canvas.parentElement;
        const resetBtn = document.createElement('button');
        resetBtn.className = 'chart-reset-btn';
        resetBtn.innerHTML = '<i class="fas fa-undo"></i>';
        resetBtn.title = '重置视图';
        resetBtn.onclick = callback;

        container.style.position = 'relative';
        container.appendChild(resetBtn);
    },

    // 启用拖拽功能
    enableDrag(chart) {
        if (chart.config.type !== 'bar') return;

        let draggedElement = null;
        let draggedDatasetIndex = null;
        let draggedIndex = null;

        chart.options.onHover = (event, activeElements) => {
            chart.canvas.style.cursor = activeElements.length > 0 ? 'move' : 'default';
        };

        chart.canvas.addEventListener('mousedown', (e) => {
            const canvasPosition = Chart.helpers.getRelativePosition(e, chart);
            const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);
            const dataY = chart.scales.y.getValueForPixel(canvasPosition.y);

            const elements = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);

            if (elements.length > 0) {
                draggedElement = elements[0];
                draggedDatasetIndex = draggedElement.datasetIndex;
                draggedIndex = draggedElement.index;
            }
        });

        chart.canvas.addEventListener('mousemove', (e) => {
            if (!draggedElement) return;

            const canvasPosition = Chart.helpers.getRelativePosition(e, chart);
            const dataY = chart.scales.y.getValueForPixel(canvasPosition.y);

            chart.data.datasets[draggedDatasetIndex].data[draggedIndex] = Math.max(0, dataY);
            chart.update('none');
        });

        chart.canvas.addEventListener('mouseup', () => {
            if (draggedElement) {
                this.onDataChange(chart, {
                    datasetIndex: draggedDatasetIndex,
                    dataIndex: draggedIndex,
                    newValue: chart.data.datasets[draggedDatasetIndex].data[draggedIndex]
                });
            }
            draggedElement = null;
        });
    },

    // 启用筛选功能
    enableFilter(chart) {
        const container = chart.canvas.parentElement;
        const filterContainer = document.createElement('div');
        filterContainer.className = 'chart-filter-container';

        const filterHtml = `
            <div class="chart-filter-header">
                <span>数据筛选</span>
                <button class="filter-toggle"><i class="fas fa-filter"></i></button>
            </div>
            <div class="chart-filter-body" style="display: none;">
                <div class="filter-options"></div>
                <button class="filter-apply">应用筛选</button>
            </div>
        `;

        filterContainer.innerHTML = filterHtml;
        container.appendChild(filterContainer);

        this.setupFilterHandlers(chart, filterContainer);
    },

    // 设置筛选处理器
    setupFilterHandlers(chart, filterContainer) {
        const toggleBtn = filterContainer.querySelector('.filter-toggle');
        const filterBody = filterContainer.querySelector('.chart-filter-body');
        const filterOptions = filterContainer.querySelector('.filter-options');
        const applyBtn = filterContainer.querySelector('.filter-apply');

        toggleBtn.addEventListener('click', () => {
            filterBody.style.display = filterBody.style.display === 'none' ? 'block' : 'none';
        });

        chart.data.datasets.forEach((dataset, index) => {
            const option = document.createElement('label');
            option.className = 'filter-option';
            option.innerHTML = `
                <input type="checkbox" checked data-dataset="${index}">
                <span>${dataset.label}</span>
            `;
            filterOptions.appendChild(option);
        });

        applyBtn.addEventListener('click', () => {
            const checkboxes = filterOptions.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach((checkbox) => {
                const datasetIndex = parseInt(checkbox.dataset.dataset);
                const meta = chart.getDatasetMeta(datasetIndex);
                meta.hidden = !checkbox.checked;
            });
            chart.update();
        });
    },

    // 启用导出功能
    enableExport(chart) {
        const container = chart.canvas.parentElement;
        const exportBtn = document.createElement('button');
        exportBtn.className = 'chart-export-btn';
        exportBtn.innerHTML = '<i class="fas fa-download"></i>';
        exportBtn.title = '导出图表';

        const menu = document.createElement('div');
        menu.className = 'chart-export-menu';
        menu.style.display = 'none';
        menu.innerHTML = `
            <button data-format="png">导出为 PNG</button>
            <button data-format="jpg">导出为 JPG</button>
            <button data-format="svg">导出为 SVG</button>
            <button data-format="csv">导出数据 (CSV)</button>
            <button data-format="json">导出数据 (JSON)</button>
        `;

        container.appendChild(exportBtn);
        container.appendChild(menu);

        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        menu.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const format = e.target.dataset.format;
                this.exportChart(chart, format);
                menu.style.display = 'none';
            }
        });

        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    },

    // 导出图表
    exportChart(chart, format) {
        switch (format) {
            case 'png':
            case 'jpg':
                this.exportAsImage(chart, format);
                break;
            case 'svg':
                this.exportAsSVG(chart);
                break;
            case 'csv':
                this.exportAsCSV(chart);
                break;
            case 'json':
                this.exportAsJSON(chart);
                break;
        }
    },

    // 导出为图片
    exportAsImage(chart, format) {
        const url = chart.toBase64Image(format === 'jpg' ? 'image/jpeg' : 'image/png');
        const link = document.createElement('a');
        link.download = `chart-${Date.now()}.${format}`;
        link.href = url;
        link.click();
    },

    // 导出为CSV
    exportAsCSV(chart) {
        let csv = 'Label';

        chart.data.datasets.forEach(dataset => {
            csv += `,${dataset.label}`;
        });
        csv += '\n';

        chart.data.labels.forEach((label, index) => {
            csv += label;
            chart.data.datasets.forEach(dataset => {
                csv += `,${dataset.data[index] || ''}`;
            });
            csv += '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `chart-data-${Date.now()}.csv`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    },

    // 导出为JSON
    exportAsJSON(chart) {
        const data = {
            labels: chart.data.labels,
            datasets: chart.data.datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `chart-data-${Date.now()}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    },

    // 启用全屏功能
    enableFullscreen(chart) {
        const container = chart.canvas.parentElement;
        const fullscreenBtn = document.createElement('button');
        fullscreenBtn.className = 'chart-fullscreen-btn';
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.title = '全屏';

        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                container.requestFullscreen().then(() => {
                    fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    container.classList.add('fullscreen');
                    chart.resize();
                });
            } else {
                document.exitFullscreen().then(() => {
                    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    container.classList.remove('fullscreen');
                    chart.resize();
                });
            }
        });

        container.appendChild(fullscreenBtn);
    },

    // 启用十字准线
    enableCrosshair(chart) {
        const crosshair = {
            x: null,
            y: null,
            draw: function(ctx) {
                if (this.x === null || this.y === null) return;

                ctx.save();
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);

                ctx.beginPath();
                ctx.moveTo(this.x, 0);
                ctx.lineTo(this.x, chart.height);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, this.y);
                ctx.lineTo(chart.width, this.y);
                ctx.stroke();

                ctx.restore();
            }
        };

        chart.canvas.addEventListener('mousemove', (e) => {
            const rect = chart.canvas.getBoundingClientRect();
            crosshair.x = e.clientX - rect.left;
            crosshair.y = e.clientY - rect.top;
            chart.render();
        });

        chart.canvas.addEventListener('mouseleave', () => {
            crosshair.x = null;
            crosshair.y = null;
            chart.render();
        });

        const originalDraw = chart.draw;
        chart.draw = function() {
            originalDraw.call(this);
            crosshair.draw(this.ctx);
        };
    },

    // 启用数据标签
    enableDataLabels(chart) {
        chart.options.plugins.datalabels = {
            display: true,
            color: '#374151',
            font: {
                weight: 'bold',
                size: 10
            },
            formatter: (value) => {
                if (typeof value === 'number') {
                    return value.toLocaleString();
                }
                return value;
            }
        };
        chart.update();
    },

    // 设置右键菜单
    setupContextMenu(chart) {
        const menu = document.createElement('div');
        menu.className = 'chart-context-menu';
        menu.style.display = 'none';
        menu.innerHTML = `
            <div class="menu-item" data-action="copy">复制图表</div>
            <div class="menu-item" data-action="save">保存图片</div>
            <div class="menu-item" data-action="print">打印图表</div>
            <div class="menu-separator"></div>
            <div class="menu-item" data-action="reset">重置视图</div>
        `;

        document.body.appendChild(menu);

        chart.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            menu.style.left = e.pageX + 'px';
            menu.style.top = e.pageY + 'px';
            menu.style.display = 'block';
        });

        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextMenuAction(chart, action);
            }
            menu.style.display = 'none';
        });

        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    },

    // 处理右键菜单动作
    handleContextMenuAction(chart, action) {
        switch (action) {
            case 'copy':
                this.copyChartToClipboard(chart);
                break;
            case 'save':
                this.exportAsImage(chart, 'png');
                break;
            case 'print':
                this.printChart(chart);
                break;
            case 'reset':
                chart.reset();
                chart.update();
                break;
        }
    },

    // 复制图表到剪贴板
    async copyChartToClipboard(chart) {
        try {
            const blob = await new Promise(resolve => {
                chart.canvas.toBlob(resolve);
            });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);

            this.showNotification('图表已复制到剪贴板');
        } catch (err) {
            console.error('复制失败:', err);
            this.showNotification('复制失败，请重试', 'error');
        }
    },

    // 打印图表
    printChart(chart) {
        const printWindow = window.open('', '_blank');
        const imageUrl = chart.toBase64Image();

        printWindow.document.write(`
            <html>
                <head>
                    <title>打印图表</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                        img { max-width: 100%; max-height: 100%; }
                    </style>
                </head>
                <body>
                    <img src="${imageUrl}" onload="window.print(); window.close();">
                </body>
            </html>
        `);
    },

    // 显示通知
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `chart-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },

    // 数据变化回调
    onDataChange(chart, changeInfo) {
        if (window.ChartFactory) {
            const event = new CustomEvent('chartDataChanged', {
                detail: {
                    chartId: chart.id || chart.canvas.id,
                    ...changeInfo
                }
            });
            document.dispatchEvent(event);
        }
    }
};

window.ChartInteractions = ChartInteractions;