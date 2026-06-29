package com.drawing.diagramai.config;

import com.drawing.diagramai.inter.LoginInterceptor;
import com.drawing.diagramai.inter.RateLimitInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurationSupport;

import javax.annotation.Resource;

/**
 * 拦截器配置
 */
@Configuration
public class InterceptorConfig extends WebMvcConfigurationSupport {

    @Resource
    private RateLimitInterceptor rateLimitInterceptor;

    @Resource
    private LoginInterceptor loginInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        //登录拦截器
        registry.addInterceptor(loginInterceptor).addPathPatterns("/**").excludePathPatterns("/login").excludePathPatterns("/login/github-callback")
            .excludePathPatterns("/register").excludePathPatterns("/send-verification-code").excludePathPatterns("/github")
            .excludePathPatterns("/error").excludePathPatterns("/captcha/**")
            // 公开文档分享接口：通过 shareToken 访问的只读文档，无需登录态
            .excludePathPatterns("/api/v1/documents/public/**")
            // 退出登录：未登录用户也可能因本地残留 cookie 调用，避免再次触发 1002
            .excludePathPatterns("/logout")
            // /me：应用启动时调用以探测登录态，未登录返回 null data（不弹窗），由前端 initialize 静默处理
            .excludePathPatterns("/me")
            // 模板分类：首页/编辑器首次加载即调用，公开数据无需登录
            .excludePathPatterns("/api/v1/templates/categories")
            .excludePathPatterns("/swagger-resources/**", "/webjars/**", "/v2/**", "/swagger-ui.html/**").order(1);

        //限流拦截器（先执行）
        registry.addInterceptor(rateLimitInterceptor).addPathPatterns("/**").excludePathPatterns("/error")
            .excludePathPatterns("/swagger-resources/**", "/webjars/**", "/v2/**", "/swagger-ui.html/**").order(2);
    }

    /**
     * 配置跨域支持
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
            .allowedOrigins("https://diagram.aiskillfy.com", "http://localhost:5173", "http://localhost:5174")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true)
            .maxAge(3600);
    }

    /**
     * 配置静态资源
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**").addResourceLocations("classpath:/static/");
        registry.addResourceHandler("/templates/**").addResourceLocations("classpath:/templates/");
        /*放行swagger*/
        registry.addResourceHandler("swagger-ui.html").addResourceLocations("classpath:/META-INF/resources/");
        registry.addResourceHandler("/webjars/**").addResourceLocations("classpath:/META-INF/resources/webjars/");
        super.addResourceHandlers(registry);
    }
}
