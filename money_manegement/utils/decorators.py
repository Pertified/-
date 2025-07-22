"""
装饰器工具
包含各种功能装饰器
"""

from functools import wraps
from flask import request, jsonify
from utils.api_response import APIResponse
import time


# ... 保留现有的装饰器代码 ...

def api_endpoint(f):
    """API端点装饰器，处理通用的API功能"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 记录请求开始时间
        start_time = time.time()

        try:
            # 执行原函数
            result = f(*args, **kwargs)

            # 记录响应时间
            elapsed_time = time.time() - start_time

            # 如果返回的是元组，说明已经包含了状态码
            if isinstance(result, tuple):
                response, status_code = result
                if isinstance(response, dict):
                    response['response_time'] = f"{elapsed_time:.3f}s"

            return result

        except Exception as e:
            # 统一的错误处理
            return APIResponse.error(
                message="请求处理失败",
                code=500,
                details=str(e) if request.args.get('debug') else None
            )

    return decorated_function


def validate_params(*required_params):
    """参数验证装饰器"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            missing_params = []

            for param in required_params:
                if param not in request.args and param not in request.json:
                    missing_params.append(param)

            if missing_params:
                return APIResponse.error(
                    message="缺少必需参数",
                    code=400,
                    error_code="MISSING_PARAMS",
                    details={"missing": missing_params}
                )

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def rate_limit(max_calls=60, time_window=60):
    """速率限制装饰器"""

    def decorator(f):
        call_times = []

        @wraps(f)
        def decorated_function(*args, **kwargs):
            now = time.time()

            # 清理过期的调用记录
            call_times[:] = [t for t in call_times if now - t < time_window]

            if len(call_times) >= max_calls:
                return APIResponse.error(
                    message="请求过于频繁，请稍后再试",
                    code=429,
                    error_code="RATE_LIMIT_EXCEEDED"
                )

            call_times.append(now)
            return f(*args, **kwargs)

        return decorated_function

    return decorator