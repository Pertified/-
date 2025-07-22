"""
API响应格式化工具
提供统一的API响应格式，确保前后端数据交互的一致性
"""

from flask import jsonify
from datetime import datetime

class APIResponse:
    """API响应类，提供标准化的响应格式"""

    @staticmethod
    def success(data=None, message="操作成功", code=200):
        """
        成功响应
        :param data: 返回的数据
        :param message: 成功消息
        :param code: HTTP状态码
        :return: Flask响应对象
        """
        response = {
            "status": "success",
            "code": code,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        return jsonify(response), code

    @staticmethod
    def error(message="操作失败", code=400, error_code=None, details=None):
        """
        错误响应
        :param message: 错误消息
        :param code: HTTP状态码
        :param error_code: 自定义错误代码
        :param details: 错误详情
        :return: Flask响应对象
        """
        response = {
            "status": "error",
            "code": code,
            "message": message,
            "error_code": error_code,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        return jsonify(response), code

    @staticmethod
    def chart_data(chart_type, data, metadata=None):
        """
        图表数据专用响应格式
        :param chart_type: 图表类型
        :param data: 图表数据
        :param metadata: 元数据（如更新时间、数据范围等）
        :return: Flask响应对象
        """
        response = {
            "status": "success",
            "code": 200,
            "chart_type": chart_type,
            "data": data,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat()
        }

        # 添加默认元数据
        if "last_updated" not in response["metadata"]:
            response["metadata"]["last_updated"] = datetime.now().isoformat()

        return jsonify(response), 200

    @staticmethod
    def paginated(data, page, per_page, total, **kwargs):
        """
        分页响应
        :param data: 当前页数据
        :param page: 当前页码
        :param per_page: 每页数量
        :param total: 总数量
        :param kwargs: 其他参数
        :return: Flask响应对象
        """
        response = {
            "status": "success",
            "code": 200,
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": (total + per_page - 1) // per_page,
                "has_prev": page > 1,
                "has_next": page < (total + per_page - 1) // per_page
            },
            "timestamp": datetime.now().isoformat()
        }
        response.update(kwargs)
        return jsonify(response), 200