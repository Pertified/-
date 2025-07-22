"""
API管理器
统一管理所有API请求的处理和分发
"""

from flask import request, current_app
from datetime import datetime
from utils.api_response import APIResponse
from utils.chart_config import ChartConfig
from services.chart_service import ChartService
import functools
import time


class APIManager:
    """API管理器类，负责处理所有API请求"""

    def __init__(self):
        self.chart_service = None
        self._cache = {}
        self._cache_timestamps = {}

    def get_chart_service(self):
        """延迟初始化图表服务"""
        if not self.chart_service:
            self.chart_service = ChartService()
        return self.chart_service

    def handle_chart_request(self, chart_name):
        """
        处理图表数据请求
        :param chart_name: 图表名称
        :return: API响应
        """
        try:
            # 验证图表类型
            if not ChartConfig.is_valid_chart(chart_name):
                return APIResponse.error(
                    message=f"不支持的图表类型: {chart_name}",
                    code=404,
                    error_code="INVALID_CHART_TYPE"
                )

            # 获取图表配置
            config = ChartConfig.get_config(chart_name)

            # 构建参数
            params = self._build_params(config)

            # 检查缓存
            cache_key = self._generate_cache_key(chart_name, params)
            cached_data = self._get_cached_data(cache_key, config['cache_duration'])
            if cached_data is not None:
                return APIResponse.chart_data(
                    chart_type=config['type'],
                    data=cached_data,
                    metadata={'from_cache': True}
                )

            # 调用服务方法获取数据
            service = self.get_chart_service()
            method = getattr(service, config['service_method'])
            data = method(**params)

            # 缓存数据
            self._cache_data(cache_key, data)

            # 返回响应
            return APIResponse.chart_data(
                chart_type=config['type'],
                data=data,
                metadata={'from_cache': False}
            )

        except AttributeError as e:
            return APIResponse.error(
                message="服务方法未实现",
                code=500,
                error_code="SERVICE_METHOD_NOT_FOUND",
                details=str(e)
            )
        except Exception as e:
            current_app.logger.error(f"图表数据请求失败: {str(e)}")
            return APIResponse.error(
                message="获取图表数据失败",
                code=500,
                error_code="CHART_DATA_ERROR",
                details=str(e) if current_app.debug else None
            )

    def _build_params(self, config):
        """构建请求参数"""
        params = config['default_params'].copy()

        # 从请求中获取参数
        for key in params.keys():
            if key in request.args:
                # 类型转换
                value = request.args.get(key)
                if value.lower() in ['true', 'false']:
                    params[key] = value.lower() == 'true'
                elif value.isdigit():
                    params[key] = int(value)
                else:
                    params[key] = value

        # 特殊处理某些参数
        if 'month' in params and params['month'] is None:
            params['month'] = datetime.now().strftime('%Y-%m')

        # 添加用户ID（假设从session或token中获取）
        params['user_id'] = self._get_current_user_id()

        return params

    def _get_current_user_id(self):
        """获取当前用户ID"""
        # 这里应该从session或JWT token中获取
        # 暂时返回默认值1
        return 1

    def _generate_cache_key(self, chart_name, params):
        """生成缓存键"""
        param_str = "_".join(f"{k}={v}" for k, v in sorted(params.items()))
        return f"{chart_name}_{param_str}"

    def _get_cached_data(self, cache_key, duration):
        """获取缓存数据"""
        if cache_key in self._cache:
            timestamp = self._cache_timestamps.get(cache_key, 0)
            if time.time() - timestamp < duration:
                return self._cache[cache_key]
        return None

    def _cache_data(self, cache_key, data):
        """缓存数据"""
        self._cache[cache_key] = data
        self._cache_timestamps[cache_key] = time.time()

    def clear_cache(self, chart_name=None):
        """清除缓存"""
        if chart_name:
            # 清除特定图表的缓存
            keys_to_remove = [k for k in self._cache.keys() if k.startswith(chart_name)]
            for key in keys_to_remove:
                del self._cache[key]
                del self._cache_timestamps[key]
        else:
            # 清除所有缓存
            self._cache.clear()
            self._cache_timestamps.clear()

    def get_api_info(self):
        """获取API信息"""
        charts = []
        for chart_name in ChartConfig.get_all_charts():
            info = ChartConfig.get_chart_info(chart_name)
            if info:
                charts.append(info)

        return {
            'version': '1.0',
            'endpoints': {
                'charts': '/api/charts/<chart_name>',
                'api_info': '/api/info'
            },
            'available_charts': charts
        }


# 创建全局API管理器实例
api_manager = APIManager()