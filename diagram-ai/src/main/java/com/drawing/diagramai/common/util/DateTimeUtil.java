package com.drawing.diagramai.common.util;

import com.drawing.diagramai.enums.DateTimeEnum;
import org.apache.commons.lang3.StringUtils;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.DateTimeException;
import java.util.Calendar;
import java.util.Date;
import java.util.concurrent.TimeUnit;

/**
 * 支付换算
 * @author Json.Zheng
 * @date 2019/08/20
 * @version
 */
public class DateTimeUtil {

    /**
     * Date时间转指定字符串时间格式
     * @param date
     * @param dateTimeEnum
     * @throws DateTimeException
     * @return
     */
    public static String dateConvertString(Date date, DateTimeEnum dateTimeEnum) {
        checkParams(date,dateTimeEnum);
        SimpleDateFormat dformat = new SimpleDateFormat(dateTimeEnum.getFormatType());
        return dformat.format(date);
    }

    /**
     * 转换成默认的时间格式
     *
     * @param date
     * @return
     */
    public static String dateConvertDefaultString(Date date){
        return dateConvertString(date, DateTimeEnum.year_month_day_hour_min_sce);
    }

    /**
     * 字符串格式的时间转换成指定格式下的date
     * @param dateTimeString
     * @param dateTimeEnum
     * @throws DateTimeException,ParseException
     * @return
     */
    public static Date stringConvertDate(String dateTimeString, DateTimeEnum dateTimeEnum) throws ParseException{
        checkParams(dateTimeString,dateTimeEnum);
        SimpleDateFormat dformat = new SimpleDateFormat(dateTimeEnum.getFormatType());
        return dformat.parse(dateTimeString);
    }

    /**
     * 获取指定日期下的年份
     * @param date
     * @return
     * @throws DateTimeException
     */
    public static int getCurrentYear(Date date) {
        checkParams(date);
        Calendar calendar = calendarSetDate(date);
        return calendar.get(Calendar.YEAR);
    }

    /**
     * 获取指定日期下的月份
     * @param date
     * @return
     * @throws DateTimeException
     */
    public static int getCurrentMonth(Date date) {
        checkParams(date);
        Calendar calendar = calendarSetDate(date);
        return calendar.get(Calendar.MONTH)+1;
    }

    /**
     * 获取指定日期下的天(月中几号)
     * @param date
     * @return
     * @throws DateTimeException
     */
    public static int getCurrentDay(Date date) {
        checkParams(date);
        Calendar calendar = calendarSetDate(date);
        return calendar.get(Calendar.DAY_OF_MONTH);
    }

    /**
     * 获取指定日期的小时
     * @param date
     * @return
     * @throws DateTimeException
     */
    public static int getCurrentHour(Date date) {
        checkParams(date);
        Calendar calendar = calendarSetDate(date);
        return calendar.get(Calendar.HOUR_OF_DAY);
    }

    /**
     * 获取指定日期的分钟数
     * @param date
     * @return
     * @throws DateTimeException
     */
    public static int getCurrentMinute(Date date) {
        checkParams(date);
        Calendar calendar = calendarSetDate(date);
        return calendar.get(Calendar.MINUTE);
    }

    /**
     * 获取指定日期的秒数
     * @param date
     * @return
     * @throws DateTimeException
     */
    public static int getCurrentSecond(Date date) {
        checkParams(date);
        Calendar calendar = calendarSetDate(date);
        return calendar.get(Calendar.SECOND);
    }

    /**
     * 给Calendar设置Date
     * @param date
     * @return
     */
    private static Calendar calendarSetDate(Date date) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTime(date);
        return calendar;
    }

    /**
     * 校验时间参数
     * @param date
     * @param dateTimeEnum
     * @throws DateTimeException
     */
    private static void checkParams(Date date, DateTimeEnum dateTimeEnum) {
        if (null == date){
            throw new DateTimeException("指定时间Date为null,不合法");
        }
        if (null == dateTimeEnum){
            throw new DateTimeException("指定时间DateTimeEnum为null,不合法");
        }
    }

    /**
     * 校验时间参数
     * @param dateTimeString
     * @param dateTimeEnum
     * @throws DateTimeException
     */
    private static void checkParams(String dateTimeString, DateTimeEnum dateTimeEnum){
        if (StringUtils.isBlank(dateTimeString)){
            throw new DateTimeException("指定时间字符串为null或者为\"\",不合法");
        }
        if (null == dateTimeEnum){
            throw new DateTimeException("指定时间DateTimeEnum为null,不合法");
        }
    }

    /**
     * 校验时间参数
     * @param date
     * @throws DateTimeException
     */
    private static void checkParams(Date date){
        if (null == date){
            throw new DateTimeException("指定时间Date为null,不合法");
        }
    }

    /**
     * 校验时间参数
     * @param dateTimeString
     * @throws DateTimeException
     */
    private static void checkParams(String dateTimeString){
        if (StringUtils.isBlank(dateTimeString)){
            throw new DateTimeException("指定时间字符串为null或者为\"\",不合法");
        }
    }

    /**
     * 校验时间参数
     * @param dateTimeEnum
     * @throws DateTimeException
     */
    private static void checkParams(DateTimeEnum dateTimeEnum){
        if (null == dateTimeEnum){
            throw new DateTimeException("指定时间DateTimeEnum为null,不合法");
        }
    }

    /**
     * 获取指定时间，指定分钟数的后时间
     * @param date
     * @param afterMinute
     * @return
     */
    public static Date getAfterDate(Date date,int afterMinute){
        Calendar cal = Calendar.getInstance();
        cal.setTime(date);
        cal.add(Calendar.MINUTE, afterMinute);
        return cal.getTime();
    }

    /**
     * 计算两个日期的天数
     *
     * @param fromDate
     * @param toDate
     * @return
     */
    public static long betweenDays(Date fromDate, Date toDate){
        // 计算日期之间的毫秒差值
        long differenceInMilliseconds = toDate.getTime() - fromDate.getTime();

        // 转换毫秒差值为天数
        return TimeUnit.MILLISECONDS.toDays(differenceInMilliseconds);
    }
}
