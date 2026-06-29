package com.drawing.diagramai.component;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.drawing.diagramai.dto.ChatMessage;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class DoubaoClient {

    @Value("${diagramai.doubao.api-key:}")
    private String apiKey;

    @Value("${diagramai.doubao.endpoint:}")
    private String endpoint;

    @Value("${diagramai.doubao.model:doubao-seed-1-6-250615}")
    private String model;

    @Value("${diagramai.doubao.timeout-seconds:60}")
    private int timeoutSeconds;

    @Resource
    private RestTemplate restTemplate;

    private static final String SYSTEM_PROMPT_GENERATE = "你是一个专业的Mermaid图表生成助手，擅长将用户的自然语言描述转化为清晰、规范的Mermaid图表。"
            + "用户可能是非技术人员，描述可能口语化、不完整，你需要理解其真实意图并补全合理细节。"
            + "请严格按照以下规则输出："
            + "1. 只输出Mermaid代码，不要输出任何解释、说明或Markdown代码块标记"
            + "2. 确保生成的代码是完整可运行的Mermaid图表"
            + "3. 根据描述内容自动选择最合适的图表类型（flowchart, sequence, class, state, er, gantt, pie, journey等）"
            + "4. 节点标签使用简洁中文，避免过长（建议单行不超过8个字），必要时拆分为多个节点"
            + "5. 确保语法正确：flowchart 使用 TD/LR 方向，箭头用 -->，判断用 {}，子流程用 subgraph"
            + "6. 保持图表结构清晰：层次不超过4层，同级节点对齐，避免交叉连线"
            + "7. 对于口语化描述，主动补全隐含的流程节点（如开始、结束、异常分支）"
            + "8. 如果用户描述含「如果/当...时/否则」等条件词，使用判断节点({})和分支箭头-->|是|/-->|否|";

    private static final String SYSTEM_PROMPT_FIX = "你是一个专业的Mermaid语法修复专家。"
            + "你的任务是分析用户提供的有错误的Mermaid代码，并生成修复后的正确版本。"
            + "请严格按照以下规则输出："
            + "1. 只输出修复后的Mermaid代码，不要输出任何解释或Markdown代码块标记"
            + "2. 保持原有图表的语义和结构不变"
            + "3. 修复所有语法错误，包括缺少的括号、引号、箭头等"
            + "4. 如果有无法理解的部分，请用合理的默认值替换";

    private static final String SYSTEM_PROMPT_CHAT = "你是一个专业的Mermaid图表编辑助手，帮助用户通过自然语言对话修改图表。"
            + "【核心原则】先理解，再修改：在修改前，你必须先分析当前Mermaid代码所表达的图表意图——"
            + "它描述的是什么业务流程、系统架构或数据关系，各节点和连线在其中扮演什么角色。"
            + "只有理解了图表的整体意图，你的修改才能精准且不破坏原有结构。"
            + "用户可能是非技术人员，修改请求可能口语化（如「把那个红色的框去掉」、「加一个支付失败的分支」），"
            + "你需要结合当前代码理解其指代，并准确执行修改。"
            + "请严格按照以下规则输出JSON格式（只输出JSON，不要任何额外内容或Markdown标记）：\n"
            + "{\n"
            + "  \"reply\": \"对用户问题的简短中文回复说明你做了什么修改\",\n"
            + "  \"mermaidCode\": \"修改后的完整Mermaid代码\",\n"
            + "  \"updated\": true或false\n"
            + "}\n"
            + "规则：\n"
            + "1. mermaidCode 必须是完整可运行的Mermaid图表，不要使用代码块标记\n"
            + "2. 如果用户的请求需要修改图表，updated 为 true，并在 mermaidCode 中给出修改后的完整代码\n"
            + "3. 如果用户只是提问、不需要修改图表（如询问语法说明），updated 为 false，mermaidCode 保持为当前代码原样\n"
            + "4. reply 用简短中文说明你的修改或回答\n"
            + "5. 理解口语化指代：'那个'/'这个'指最近修改的节点，'分支'指判断节点的某条路径\n"
            + "6. 修改后保持图表整体结构清晰，节点标签简洁（中文单行不超过8字）\n"
            + "7. 【最小改动原则】修复语法错误时，只修改导致错误的具体行或节点，不得重构整个图表、不得随意增删节点、不得改变连线方向或层级关系，修改后代码行数应与原代码接近\n"
            + "8. 【意图保持】修改时保持图表原有的业务意图不变。如果用户的修改请求会导致图表意图发生根本性变化，先在 reply 中说明，并尽量以最小改动实现用户意图\n"
            + "9. 【修复优先级】当同时存在用户修改请求和语法错误时，优先修复语法错误确保图表可渲染，再执行用户请求的修改。如果提供了【语法错误信息】，请结合错误信息定位问题并精准修复，避免盲目重写整个图表";

    public AiResult generateMermaid(String description, String chartType) {
        return generateMermaid(description, chartType, false);
    }

    public AiResult generateMermaid(String description, String chartType, boolean autoDetect) {
        String userPrompt = buildGeneratePrompt(description, chartType, autoDetect);
        return callDoubao(SYSTEM_PROMPT_GENERATE, userPrompt);
    }

    public AiResult fixMermaid(String mermaidCode, String errorMessage) {
        String userPrompt = buildFixPrompt(mermaidCode, errorMessage);
        return callDoubao(SYSTEM_PROMPT_FIX, userPrompt);
    }

    public ChatAiResult chatUpdateMermaid(String currentCode, List<ChatMessage> history, String userMessage) {
        return chatUpdateMermaid(currentCode, history, userMessage, null);
    }

    /**
     * 多轮对话修改 Mermaid。
     *
     * @param errorMessage 可选，当前代码的语法错误信息（来自前端预览区解析）。
     *                     非空时会注入到 user prompt，让 LLM 在修改时一并修复语法错误。
     */
    public ChatAiResult chatUpdateMermaid(String currentCode, List<ChatMessage> history, String userMessage, String errorMessage) {
        String userPrompt = buildChatPrompt(currentCode, userMessage, errorMessage);
        AiResult base = callDoubao(SYSTEM_PROMPT_CHAT, userPrompt, history);
        ChatAiResult result = new ChatAiResult();
        result.setPromptTokens(base.getPromptTokens());
        result.setCompletionTokens(base.getCompletionTokens());
        result.setTotalTokens(base.getTotalTokens());
        result.setProcessingTimeMs(base.getProcessingTimeMs());
        result.setProvider(base.getProvider());
        parseChatJson(result, base.getMermaidCode(), currentCode);
        return result;
    }

    private String buildGeneratePrompt(String description, String chartType, boolean autoDetect) {
        StringBuilder sb = new StringBuilder();
        sb.append("请根据以下描述生成Mermaid图表代码。\n\n");
        if (autoDetect) {
            sb.append("【图表类型】自动选择（请根据描述内容选择最合适的图表类型）\n\n");
        } else {
            sb.append("【图表类型】").append(chartType).append("\n\n");
        }
        sb.append("【描述内容】\n").append(description).append("\n\n");
        sb.append("【要求】\n");
        sb.append("- 理解用户的真实意图，对口语化描述进行合理补全（如补充开始/结束节点、异常分支）\n");
        sb.append("- 节点标签简洁，中文单行不超过8字\n");
        sb.append("- 输出必须是可直接运行的Mermaid代码，不含代码块标记\n");
        return sb.toString();
    }

    private String buildFixPrompt(String mermaidCode, String errorMessage) {
        StringBuilder sb = new StringBuilder();
        sb.append("请修复以下Mermaid代码中的语法错误。\n\n");
        sb.append("【错误代码】\n```\n").append(mermaidCode).append("\n```\n\n");
        if (StringUtils.isNotBlank(errorMessage)) {
            sb.append("【错误信息】\n").append(errorMessage).append("\n\n");
        }
        sb.append("请直接输出修复后的Mermaid代码，不要添加任何额外内容。");
        return sb.toString();
    }

    private String buildChatPrompt(String currentCode, String userMessage) {
        return buildChatPrompt(currentCode, userMessage, null);
    }

    /**
     * 构建多轮对话的 user prompt。errorMessage 非空时追加"语法错误信息"段落，
     * 让 LLM 在响应用户请求时一并修复语法错误。
     */
    private String buildChatPrompt(String currentCode, String userMessage, String errorMessage) {
        StringBuilder sb = new StringBuilder();
        sb.append("【当前Mermaid代码】\n```\n").append(currentCode).append("\n```\n\n");
        if (StringUtils.isNotBlank(errorMessage)) {
            sb.append("【语法错误信息】\n").append(errorMessage).append("\n\n");
            sb.append("注意：当前代码存在上述语法错误，请在响应用户请求时一并修复。\n\n");
        }
        sb.append("【用户请求】\n").append(userMessage).append("\n\n");
        sb.append("请按照系统要求的JSON格式输出。");
        return sb.toString();
    }

    private void parseChatJson(ChatAiResult result, String content, String currentCode) {
        String reply = "";
        String mermaidCode = currentCode;
        boolean updated = false;

        if (StringUtils.isNotBlank(content)) {
            String json = content.trim();
            if (json.startsWith("```")) {
                json = json.replaceAll("^```[a-zA-Z]*\\s*", "").replaceAll("\\s*```$", "").trim();
            }
            try {
                JSONObject obj = JSON.parseObject(json);
                if (obj != null) {
                    reply = obj.getString("reply");
                    String code = obj.getString("mermaidCode");
                    if (StringUtils.isNotBlank(code)) {
                        mermaidCode = cleanMermaidCode(code);
                    }
                    Boolean upd = obj.getBoolean("updated");
                    updated = upd != null && upd;
                }
            } catch (Exception e) {
                log.warn("[Doubao] 解析聊天JSON失败，使用原始内容: {}", e.getMessage());
                reply = content;
                mermaidCode = cleanMermaidCode(content);
                updated = !mermaidCode.equals(currentCode);
            }
        }

        if (StringUtils.isBlank(reply)) {
            reply = updated ? "已根据你的要求修改图表。" : "已收到你的消息。";
        }
        result.setReply(reply);
        result.setMermaidCode(mermaidCode);
        result.setUpdated(updated);
    }

    private AiResult callDoubao(String systemPrompt, String userPrompt) {
        return callDoubao(systemPrompt, userPrompt, null);
    }

    private AiResult callDoubao(String systemPrompt, String userPrompt, List<ChatMessage> history) {
        long startTime = System.currentTimeMillis();
        AiResult result = new AiResult();

        if (StringUtils.isBlank(apiKey) || StringUtils.isBlank(endpoint)) {
            log.warn("[Doubao] API配置缺失，使用模拟模式");
            result.setMermaidCode(generateMockCode(userPrompt));
            result.setPromptTokens(0);
            result.setCompletionTokens(0);
            result.setTotalTokens(0);
            result.setProcessingTimeMs((int) (System.currentTimeMillis() - startTime));
            result.setProvider("doubao-mock");
            return result;
        }

        String requestUrl = endpoint;
        log.info("[Doubao] 请求URL: {}, model: {}", requestUrl, model);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            JSONObject requestBody = new JSONObject();
            requestBody.put("model", model);

            JSONArray messages = new JSONArray();
            JSONObject systemMsg = new JSONObject();
            systemMsg.put("role", "system");
            systemMsg.put("content", systemPrompt);
            messages.add(systemMsg);

            if (history != null) {
                for (ChatMessage msg : history) {
                    if (msg == null || StringUtils.isBlank(msg.getRole()) || StringUtils.isBlank(msg.getContent())) {
                        continue;
                    }
                    JSONObject hMsg = new JSONObject();
                    hMsg.put("role", msg.getRole());
                    hMsg.put("content", msg.getContent());
                    messages.add(hMsg);
                }
            }

            JSONObject userMsg = new JSONObject();
            userMsg.put("role", "user");
            userMsg.put("content", userPrompt);
            messages.add(userMsg);

            requestBody.put("messages", messages);

            HttpEntity<String> entity = new HttpEntity<>(requestBody.toJSONString(), headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    requestUrl,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JSONObject responseJson = JSON.parseObject(response.getBody());
            String content = extractContent(responseJson);
            int promptTokens = extractTokenCount(responseJson, "prompt_tokens");
            int completionTokens = extractTokenCount(responseJson, "completion_tokens");
            int totalTokens = extractTokenCount(responseJson, "total_tokens");

            result.setMermaidCode(cleanMermaidCode(content));
            result.setPromptTokens(promptTokens);
            result.setCompletionTokens(completionTokens);
            result.setTotalTokens(totalTokens);
            result.setProcessingTimeMs((int) (System.currentTimeMillis() - startTime));
            result.setProvider("doubao");

            log.info("[Doubao] 调用成功, url={}, model={}, tokens={}, time={}ms",
                    requestUrl, model, totalTokens, result.getProcessingTimeMs());

        } catch (Exception e) {
            log.error("[Doubao] 调用失败, url={}, error: {}", requestUrl, e.getMessage(), e);
            result.setMermaidCode(generateMockCode(userPrompt));
            result.setPromptTokens(0);
            result.setCompletionTokens(0);
            result.setTotalTokens(0);
            result.setProcessingTimeMs((int) (System.currentTimeMillis() - startTime));
            result.setProvider("doubao-mock");
        }

        return result;
    }

    private String extractContent(JSONObject response) {
        try {
            JSONArray choices = response.getJSONArray("choices");
            if (choices != null && !choices.isEmpty()) {
                JSONObject first = choices.getJSONObject(0);
                JSONObject message = first.getJSONObject("message");
                if (message != null) {
                    return message.getString("content");
                }
            }
        } catch (Exception e) {
            log.warn("[Doubao] 解析响应失败: {}", e.getMessage());
        }
        return "";
    }

    private int extractTokenCount(JSONObject response, String key) {
        try {
            JSONObject usage = response.getJSONObject("usage");
            if (usage != null && usage.containsKey(key)) {
                return usage.getIntValue(key);
            }
        } catch (Exception e) {
        }
        return 0;
    }

    private String cleanMermaidCode(String content) {
        if (content == null) {
            return "";
        }
        String cleaned = content.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceAll("^```[a-zA-Z]*\\s*", "");
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.replaceAll("^```mermaid\\s*", "");
        cleaned = cleaned.replaceAll("^```\\s*", "");
        cleaned = cleaned.replaceAll("\\s*```$", "");
        // AI 模型在 JSON 中输出 mermaid 代码时，可能把换行符双重转义为字面量 \n（两字符），
        // 导致 fastjson 解析后仍为字面量字符串而非实际换行。
        // mermaid 语法中换行用 <br/>，不会用到字面量 \n，因此可安全替换为实际换行符。
        cleaned = cleaned.replace("\\n", "\n");
        cleaned = cleaned.replace("\\t", "\t");
        return cleaned.trim();
    }

    private String generateMockCode(String prompt) {
        String lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.contains("sequence") || lowerPrompt.contains("时序")) {
            return "sequenceDiagram\n"
                    + "    participant 用户\n"
                    + "    participant 系统\n"
                    + "    participant 数据库\n"
                    + "    用户->>系统: 发起请求\n"
                    + "    系统->>数据库: 查询数据\n"
                    + "    数据库-->>系统: 返回结果\n"
                    + "    系统-->>用户: 展示内容";
        }
        if (lowerPrompt.contains("class") || lowerPrompt.contains("类")) {
            return "classDiagram\n"
                    + "    class User {\n"
                    + "        +String userId\n"
                    + "        +String email\n"
                    + "        +login()\n"
                    + "    }\n"
                    + "    class Document {\n"
                    + "        +String documentId\n"
                    + "        +String title\n"
                    + "        +save()\n"
                    + "    }\n"
                    + "    User --> Document : 拥有";
        }
        return "flowchart TD\n"
                + "    A[开始] --> B{判断条件}\n"
                + "    B -->|是| C[执行操作]\n"
                + "    B -->|否| D[其他操作]\n"
                + "    C --> E[结束]\n"
                + "    D --> E";
    }

    public static class AiResult {
        private String mermaidCode;
        private int promptTokens;
        private int completionTokens;
        private int totalTokens;
        private int processingTimeMs;
        private String provider;

        public String getMermaidCode() { return mermaidCode; }
        public void setMermaidCode(String mermaidCode) { this.mermaidCode = mermaidCode; }
        public int getPromptTokens() { return promptTokens; }
        public void setPromptTokens(int promptTokens) { this.promptTokens = promptTokens; }
        public int getCompletionTokens() { return completionTokens; }
        public void setCompletionTokens(int completionTokens) { this.completionTokens = completionTokens; }
        public int getTotalTokens() { return totalTokens; }
        public void setTotalTokens(int totalTokens) { this.totalTokens = totalTokens; }
        public int getProcessingTimeMs() { return processingTimeMs; }
        public void setProcessingTimeMs(int processingTimeMs) { this.processingTimeMs = processingTimeMs; }
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
    }

    public static class ChatAiResult extends AiResult {
        private String reply;
        private boolean updated;

        public String getReply() { return reply; }
        public void setReply(String reply) { this.reply = reply; }
        public boolean isUpdated() { return updated; }
        public void setUpdated(boolean updated) { this.updated = updated; }
    }
}
