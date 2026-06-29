package com.drawing.diagramai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * RestTemplate 配置
 */
@Configuration
public class RestTemplateConfig {

    @Value("${diagramai.doubao.timeout-seconds:60}")
    private int timeoutSeconds;

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int timeoutMs = timeoutSeconds * 1000;
        factory.setConnectTimeout(Math.min(timeoutMs, 10000));
        factory.setReadTimeout(timeoutMs);
        return new RestTemplate(factory);
    }
}
