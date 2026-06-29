package com.drawing.diagramai.aop;

import com.alibaba.fastjson.JSON;
import com.drawing.diagramai.common.exception.BizException;
import com.drawing.diagramai.common.model.ResponseVo;
import com.drawing.diagramai.common.util.ResponseUtil;
import com.drawing.diagramai.enums.BizCodeEnum;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * controller异常和日志切面
 */
@Slf4j
@Aspect
@Component
public class ExceptionAndLogAspect {

    @Pointcut(value = "execution(public * com.drawing.diagramai.controller..*.*(..))")
    private void pointcut() {
    }

    @Around("pointcut()")
    public Object doAround(ProceedingJoinPoint joinPoint) {
        String traceId = UUID.randomUUID().toString();
        MDC.put("traceId", traceId);
        Object object = null;
        String methodName = joinPoint.getSignature().getName();
        String className = joinPoint.getTarget().getClass().getName();
        String interfaceName = String.format("%s#%s", className, methodName);
        try {
            object = joinPoint.proceed();
        } catch (BizException b) {
            ResponseVo<Object> responseVo = ResponseUtil.setCodeAndMessageAndData(b.getCode(), b.getMessage(), null);
            log.info("{}|发生业务异常:{}", interfaceName, JSON.toJSONString(responseVo));
            return responseVo;
        } catch (IllegalArgumentException i) {
            ResponseVo responseVo = ResponseUtil.whiteoutDataMsg(BizCodeEnum._PARAMS_INVALID_, i.getMessage());
            log.info("{}|发生参数异常:{}", interfaceName, JSON.toJSONString(responseVo));
            return responseVo;
        } catch (Exception e) {
            ResponseVo responseVo = ResponseUtil.whiteoutData(BizCodeEnum._SERVER_BUSY_);
            log.info("{}|发生系统异常:{}", interfaceName, JSON.toJSONString(responseVo), e);
            return responseVo;
        } catch (Throwable throwable) {
            throwable.printStackTrace();
        } finally {
            MDC.remove("traceId");
        }
        log.info("{}|{}", interfaceName, JSON.toJSONString(object));
        return object;
    }
}
