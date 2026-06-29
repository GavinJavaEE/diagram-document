package com.drawing.diagramai.common.util;


import com.drawing.diagramai.enums.DateTimeEnum;

import java.util.Date;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 序列号工具
 */
public class SerialIdUtil {

    private static AtomicInteger counter = new AtomicInteger(1);

    /**
     * 获取序列号
     *
     * @return
     */
    public static String generateSerialNumber() {
        String currDateTimeStr = DateTimeUtil.dateConvertString(new Date(), DateTimeEnum.yearmonthdayhourminsce);
        int count = counter.getAndIncrement();
        return currDateTimeStr + String.format("%05d", count % 100000);
    }

}
