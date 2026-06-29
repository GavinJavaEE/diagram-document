package com.drawing.diagramai.common.util;

import com.alibaba.fastjson.JSONObject;
import okhttp3.Call;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.apache.commons.collections.MapUtils;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

/**
 * 网络请求类
 *
 * @author 郑航
 */
public class OkHttpUtil {

    private static OkHttpClient httpClient;

    static {
        httpClient = new OkHttpClient.Builder().connectTimeout(13, TimeUnit.SECONDS).build();
    }

    private static void createHttpClient() {
        httpClient = new OkHttpClient.Builder().connectTimeout(13, TimeUnit.SECONDS).build();
    }

    /**
     * GET 请求
     *
     * @param params
     * @return
     */
    public static String doGet(String url, Map<String, Object> params) throws IOException {

        //client为null
        if (Objects.isNull(httpClient)) {
            createHttpClient();
        }

        //构建完整的请求Url
        StringBuilder urlBuilder = new StringBuilder(url);
        if (MapUtils.isNotEmpty(params)) {
            urlBuilder.append("?");
            for (Map.Entry<String, Object> entry : params.entrySet()) {
                String mapKey = entry.getKey();
                Object mapValue = entry.getValue();
                urlBuilder.append(mapKey).append("=").append(mapValue).append("&");
            }
        }

        //通过Builder辅助类构建请求对象
        Request request = new Request.Builder().get().url(urlBuilder.toString()).build();

        final Call call = httpClient.newCall(request);

        try {
            //执行同步请求，获取Response对象
            Response response = call.execute();

            return netResponseProcess(response);
        } catch (IOException e) {
            throw e;
        }
    }

    /**
     * POST请求
     *
     * @param url
     * @param paramJson
     * @return
     */
    public static byte[] doPost(String url, JSONObject paramJson) throws IOException {
        try {
            URL fullUrl = new URL(url);
            //logger.debug("[获取小程序二维码]链接：[{}]", url);
            HttpURLConnection httpURLConnection = (HttpURLConnection) fullUrl.openConnection();
            httpURLConnection.setRequestMethod("POST");
            httpURLConnection.setConnectTimeout(30000);
            httpURLConnection.setReadTimeout(30000);
            httpURLConnection.setDoOutput(true);
            httpURLConnection.setDoInput(true);
            PrintWriter printWriter = new PrintWriter(httpURLConnection.getOutputStream());
            printWriter.write(paramJson.toString());
            printWriter.flush();
            BufferedInputStream bis = new BufferedInputStream(httpURLConnection.getInputStream());
            ByteArrayOutputStream swapStream = new ByteArrayOutputStream();
            byte[] buff = new byte[1024];
            int rc;
            while ((rc = bis.read(buff, 0, 1024)) > 0) {
                swapStream.write(buff, 0, rc);
            }
            // 微信api：如果调用成功，会直接返回图片二进制内容，如果请求失败，会返回 JSON 格式的数据。
            return swapStream.toByteArray();
        } catch (Exception e) {
            throw e;
        }
    }

    /**
     * 网络请求结果处理
     *
     * @param response
     * @return
     * @throws IOException
     */
    private static String netResponseProcess(Response response) throws IOException {
        if (!response.isSuccessful()) {
            throw new RuntimeException("request not success.");
        }

        if (Objects.isNull(response.body())) {
            throw new RuntimeException("response body is null.");
        }

        return Objects.requireNonNull(response.body()).string();
    }
}