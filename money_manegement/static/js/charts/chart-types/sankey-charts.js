/**
 * 桑基图实现
 * 用于展示资金流向、分类转换等流程数据
 */

class SankeyChart extends BaseChart {
    constructor(config) {
        super(config);
        this.nodeWidth = config.nodeWidth || 15;
        this.nodePadding = config.nodePadding || 10;
        this.linkOpacity = config.linkOpacity || 0.5;
        this.highlightOpacity = config.highlightOpacity || 0.8;
    }

    // 获取图表类型
    getChartType() {
        return 'sankey'; // 自定义类型
    }

    // 准备数据
    prepareData(data) {
        // 桑基图数据格式：nodes 和 links
        if (data.nodes && data.links) {
            return this.enhanceData(data);
        }

        // 从简单格式转换
        return this.convertToSankeyData(data);
    }

    // 转换为桑基图数据格式
    convertToSankeyData(data) {
        const nodes = [];
        const nodeMap = new Map();
        const links = [];

        // 处理收入支出流向数据
        if (data.flows) {
            data.flows.forEach(flow => {
                // 添加源节点
                if (!nodeMap.has(flow.from)) {
                    nodeMap.set(flow.from, nodes.length);
                    nodes.push({
                        name: flow.from,
                        category: flow.fromCategory || 'source'
                    });
                }

                // 添加目标节点
                if (!nodeMap.has(flow.to)) {
                    nodeMap.set(flow.to, nodes.length);
                    nodes.push({
                        name: flow.to,
                        category: flow.toCategory || 'target'
                    });
                }

                // 添加连接
                links.push({
                    source: nodeMap.get(flow.from),
                    target: nodeMap.get(flow.to),
                    value: flow.value,
                    label: flow.label || `${flow.from} → ${flow.to}`
                });
            });
        }

        return { nodes, links };
    }

    // 增强数据
    enhanceData(data) {
        // 为节点分配颜色
        const categoryColors = new Map();
        let colorIndex = 0;

        data.nodes = data.nodes.map(node => {
            if (!categoryColors.has(node.category)) {
                categoryColors.set(node.category, ColorPalette.getColor(colorIndex++));
            }

            return {
                ...node,
                color: node.color || categoryColors.get(node.category)
            };
        });

        // 为连接设置颜色
        data.links = data.links.map(link => ({
            ...link,
            color: link.color || ColorPalette.getColorWithAlpha(0, this.linkOpacity)
        }));

        return data;
    }

    // 渲染图表（重写）
    render(data) {
        this.showLoading();

        try {
            // 清空容器
            this.container.innerHTML = '';

            // 创建SVG容器
            const { width, height } = this.container.getBoundingClientRect();
            const margin = { top: 20, right: 20, bottom: 20, left: 20 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            // 使用D3.js创建桑基图
            this.createSankeyDiagram(data, innerWidth, innerHeight, margin);

            this.hideLoading();
            this.afterRender();
        } catch (error) {
            console.error('渲染桑基图失败:', error);
            this.showError('图表渲染失败');
        }
    }

    // 创建桑基图
    createSankeyDiagram(data, width, height, margin) {
        // 这里使用简化的实现，实际项目中应使用D3.js的sankey插件
        const canvas = document.createElement('canvas');
        canvas.width = width + margin.left + margin.right;
        canvas.height = height + margin.top + margin.bottom;
        this.container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        this.canvas = canvas;
        this.ctx = ctx;

        // 计算节点位置
        const nodePositions = this.calculateNodePositions(data.nodes, width, height);

        // 绘制连接
        this.drawLinks(ctx, data.links, nodePositions, margin);

        // 绘制节点
        this.drawNodes(ctx, data.nodes, nodePositions, margin);

        // 添加交互
        this.setupInteractions(canvas, data, nodePositions, margin);
    }

    // 计算节点位置
    calculateNodePositions(nodes, width, height) {
        const positions = new Map();
        const levels = this.calculateNodeLevels(nodes);
        const levelCount = Math.max(...levels.values()) + 1;
        const levelWidth = width / (levelCount - 1);

        // 按层级分组
        const nodesByLevel = new Map();
        nodes.forEach((node, index) => {
            const level = levels.get(index) || 0;
            if (!nodesByLevel.has(level)) {
                nodesByLevel.set(level, []);
            }
            nodesByLevel.get(level).push(index);
        });

        // 计算每个节点的位置
        nodesByLevel.forEach((nodeIndices, level) => {
            const x = level * levelWidth;
            const nodeHeight = (height - (nodeIndices.length - 1) * this.nodePadding) / nodeIndices.length;

            nodeIndices.forEach((nodeIndex, i) => {
                const y = i * (nodeHeight + this.nodePadding);
                positions.set(nodeIndex, {
                    x: x,
                    y: y,
                    width: this.nodeWidth,
                    height: nodeHeight
                });
            });
        });

        return positions;
    }

    // 计算节点层级
    calculateNodeLevels(nodes) {
        // 简化实现：源节点在左，目标节点在右
        const levels = new Map();
        nodes.forEach((node, index) => {
            if (node.category === 'source') {
                levels.set(index, 0);
            } else if (node.category === 'target') {
                levels.set(index, 2);
            } else {
                levels.set(index, 1);
            }
        });
        return levels;
    }

    // 绘制连接
    drawLinks(ctx, links, nodePositions, margin) {
        ctx.save();
        ctx.translate(margin.left, margin.top);

        links.forEach(link => {
            const sourcePos = nodePositions.get(link.source);
            const targetPos = nodePositions.get(link.target);

            if (!sourcePos || !targetPos) return;

            // 计算连接的粗细（基于值）
            const maxValue = Math.max(...links.map(l => l.value));
            const thickness = (link.value / maxValue) * 50;

            // 绘制贝塞尔曲线
            ctx.beginPath();
            ctx.moveTo(sourcePos.x + sourcePos.width, sourcePos.y + sourcePos.height / 2);

            const controlPoint1X = sourcePos.x + sourcePos.width + (targetPos.x - sourcePos.x - sourcePos.width) / 3;
            const controlPoint2X = targetPos.x - (targetPos.x - sourcePos.x - sourcePos.width) / 3;

            ctx.bezierCurveTo(
                controlPoint1X, sourcePos.y + sourcePos.height / 2,
                controlPoint2X, targetPos.y + targetPos.height / 2,
                targetPos.x, targetPos.y + targetPos.height / 2
            );

            ctx.strokeStyle = link.color || 'rgba(0, 0, 0, 0.2)';
            ctx.lineWidth = thickness;
            ctx.stroke();

            // 保存连接路径用于交互
            link.path = {
                sourceX: sourcePos.x + sourcePos.width,
                sourceY: sourcePos.y + sourcePos.height / 2,
                targetX: targetPos.x,
                targetY: targetPos.y + targetPos.height / 2,
                thickness: thickness
            };
        });

        ctx.restore();
    }

    // 绘制节点
    drawNodes(ctx, nodes, nodePositions, margin) {
        ctx.save();
        ctx.translate(margin.left, margin.top);

        nodes.forEach((node, index) => {
            const pos = nodePositions.get(index);
            if (!pos) return;

            // 绘制节点矩形
            ctx.fillStyle = node.color || '#3b82f6';
            ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

            // 绘制节点标签
            ctx.fillStyle = '#374151';
            ctx.font = '12px Microsoft YaHei';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const labelX = node.category === 'source' ? pos.x - 5 : pos.x + pos.width + 5;
            const textAlign = node.category === 'source' ? 'right' : 'left';
            ctx.textAlign = textAlign;

            ctx.fillText(node.name, labelX, pos.y + pos.height / 2);
        });

        ctx.restore();
    }

    // 设置交互
    setupInteractions(canvas, data, nodePositions, margin) {
        let hoveredElement = null;

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - margin.left;
            const y = e.clientY - rect.top - margin.top;

            // 检查是否悬停在节点上
            let hovered = null;
            data.nodes.forEach((node, index) => {
                const pos = nodePositions.get(index);
                if (x >= pos.x && x <= pos.x + pos.width &&
                    y >= pos.y && y <= pos.y + pos.height) {
                    hovered = { type: 'node', index: index, node: node };
                }
            });

            // 检查是否悬停在连接上
            if (!hovered) {
                data.links.forEach((link, index) => {
                    if (this.isPointOnLink(x, y, link.path)) {
                        hovered = { type: 'link', index: index, link: link };
                    }
                });
            }

            if (hovered !== hoveredElement) {
                hoveredElement = hovered;
                this.handleHover(hovered);
            }
        });

        canvas.addEventListener('mouseleave', () => {
            hoveredElement = null;
            this.handleHover(null);
        });

        canvas.addEventListener('click', (e) => {
            if (hoveredElement) {
                this.handleClick(hoveredElement);
            }
        });
    }

    // 判断点是否在连接上
    isPointOnLink(x, y, path) {
        // 简化判断：检查点到贝塞尔曲线的距离
        const distance = 10; // 容差
        // 这里应该实现准确的贝塞尔曲线点距离计算
        return false; // 简化实现
    }

    // 处理悬停
    handleHover(element) {
        if (element) {
            this.canvas.style.cursor = 'pointer';
            this.showTooltip(element);
        } else {
            this.canvas.style.cursor = 'default';
            this.hideTooltip();
        }
    }

    // 显示提示框
    showTooltip(element) {
        let content = '';

        if (element.type === 'node') {
            const totalIn = this.calculateNodeTotal(element.index, 'in');
            const totalOut = this.calculateNodeTotal(element.index, 'out');
            content = `${element.node.name}\n流入: ${DataFormatter.formatCurrency(totalIn)}\n流出: ${DataFormatter.formatCurrency(totalOut)}`;
        } else if (element.type === 'link') {
            content = `${element.link.label}\n金额: ${DataFormatter.formatCurrency(element.link.value)}`;
        }

        // 显示提示框（需要实现提示框UI）
        console.log(content);
    }

    // 隐藏提示框
    hideTooltip() {
        // 隐藏提示框UI
    }

    // 计算节点总额
    calculateNodeTotal(nodeIndex, direction) {
        // 实现节点流入/流出总额计算
        return 0;
    }

    // 处理点击
    handleClick(element) {
        if (this.config.onClick) {
            this.config.onClick(element);
        }
    }

    // 高亮路径
    highlightPath(sourceNode, targetNode) {
        // 实现路径高亮逻辑
    }

    // 更新数据
    update(newData) {
        this.render(this.prepareData(newData));
    }

    // 导出桑基图数据
    exportData() {
        return {
            nodes: this.data.nodes,
            links: this.data.links.map(link => ({
                from: this.data.nodes[link.source].name,
                to: this.data.nodes[link.target].name,
                value: link.value
            }))
        };
    }
}

// 注册到工厂
window.SankeyChart = SankeyChart;