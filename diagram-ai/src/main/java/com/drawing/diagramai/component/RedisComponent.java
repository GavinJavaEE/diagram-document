package com.drawing.diagramai.component;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.JdkSerializationRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;

import javax.annotation.Resource;
import java.io.UnsupportedEncodingException;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * @author Json.Zheng
 * @version V1.0
 * @Title: RedisUtils.java
 * @Package com.ryx.global.util
 * @Description: redis操作类
 * @date 2017/12/18 17:59
 */
@Component
@Order(1)
public class RedisComponent {

    @Value("${diagramai.redis.key-prefix:DIAGRAM}")
    private String keyPrefix;

    @Resource
    private RedisTemplate<String, Object> redisTemplate;
    //=============================common============================

    /**
     * 指定缓存失效时间
     *
     * @param key  键
     * @param time 时间(秒)
     * @return
     */
    public boolean expire(String key, long time) {
        try {
            if (time > 0) {
                redisTemplate.expire(key, time, TimeUnit.SECONDS);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 根据key 获取过期时间
     *
     * @param key 键 不能为null
     * @return 时间(秒) 返回0代表为永久有效
     */
    public long getExpire(String key) {
        return redisTemplate.getExpire(key, TimeUnit.SECONDS);
    }

    /**
     * 判断key是否存在
     *
     * @param key 键
     * @return true 存在 false不存在
     */
    public boolean hasKey(String key) {
        try {
            return redisTemplate.hasKey(key);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    //获取key
    public String getKey(String key) {
        if (key == null) {
            return null;
        }
        return redisTemplate.execute(new RedisCallback<String>() {
            @Override
            public String doInRedis(RedisConnection redisConnection) throws DataAccessException {
                StringRedisSerializer jdkSerializer = new StringRedisSerializer();
                byte[] serValue = redisConnection.get(key.getBytes());
                return jdkSerializer.deserialize(serValue);
            }
        });
    }

    public void setKey(String key, String value) {
        redisTemplate.execute(new RedisCallback<Boolean>() {
            @Override
            public Boolean doInRedis(RedisConnection redisConnection) throws DataAccessException {
                StringRedisSerializer jdkSerializer = new StringRedisSerializer();
                byte[] serValue = jdkSerializer.serialize(value);
                redisConnection.set(key.getBytes(), serValue);
                return null;
            }
        });
    }

    public boolean setNX(String key, Object value) {
        boolean isTrue = redisTemplate.execute(new RedisCallback<Boolean>() {
            @Override
            public Boolean doInRedis(RedisConnection redisConnection) throws DataAccessException {
                StringRedisSerializer jdkSerializer = new StringRedisSerializer();
                byte[] serValue = jdkSerializer.serialize(value.toString());
                return redisConnection.setNX(key.getBytes(), serValue);
            }
        });
        return isTrue;
    }

    /**
     * 删除缓存
     *
     * @param key 可以传一个值 或多个
     */
    @SuppressWarnings("unchecked")
    public void del(String... key) {
        try {
            if (key != null && key.length > 0) {
                if (key.length == 1) {
                    redisTemplate.delete(key[0]);
                } else {
                    redisTemplate.delete(Arrays.asList(key));
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    //============================String=============================

    /**
     * 普通缓存获取
     *
     * @param key 键
     * @return 值
     */
    public Object get(String key) {
        return key == null ? null : redisTemplate.opsForValue().get(key);
    }

    /**
     * 普通缓存获取
     *
     * @param key 键
     * @return 值
     */
    public String getString(String key) {
        return key == null ? null : (String) redisTemplate.opsForValue().get(key);
    }

    /**
     * 设置字符串
     *
     * @param key
     * @param value
     * @param time
     * @return
     */
    public boolean setString(String key, String value, long time) {
        return set(key,value, time);
    }

    /**
     * 普通缓存放入
     *
     * @param key   键
     * @param value 值
     * @return true成功 false失败
     */
    public boolean set(String key, Object value) {
        try {
            redisTemplate.opsForValue().set(key, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }

    }

    /**
     * 普通缓存放入并设置时间
     *
     * @param key   键
     * @param value 值
     * @param time  时间(秒) time要大于0 如果time小于等于0 将设置无限期
     * @return true成功 false 失败
     */
    public boolean set(String key, Object value, long time) {
        try {
            if (time > 0) {
                redisTemplate.opsForValue().set(key, value, time, TimeUnit.SECONDS);
            } else {
                set(key, value);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 递增
     *
     * @param key   键
     * @param delta 要增加几(大于0)
     * @return
     */
    public long incr(String key, long delta) {
        if (delta < 0) {
            throw new RuntimeException("递增因子必须大于0");
        }
        return redisTemplate.opsForValue().increment(key, delta);
    }

    /**
     * 递减
     *
     * @param key   键
     * @param delta 要减少几(小于0)
     * @return
     */
    public long decr(String key, long delta) {
        if (delta < 0) {
            throw new RuntimeException("递减因子必须大于0");
        }
        return redisTemplate.opsForValue().increment(key, -delta);
    }

    //================================Map=================================

    /**
     * HashGet
     *
     * @param key  键 不能为null
     * @param item 项 不能为null
     * @return 值
     */
    public Object hget(String key, String item) {
        return redisTemplate.opsForHash().get(key, item);
    }

    /**
     * 获取hashKey对应的所有键值
     *
     * @param key 键
     * @return 对应的多个键值
     */
    public Map<Object, Object> hmget(String key) {
        return redisTemplate.opsForHash().entries(key);
    }

    /**
     * HashSet
     *
     * @param key 键
     * @param map 对应多个键值
     * @return true 成功 false 失败
     */
    public boolean hmset(String key, Map<String, Object> map) {
        try {
            redisTemplate.opsForHash().putAll(key, map);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * HashSet 并设置时间
     *
     * @param key  键
     * @param map  对应多个键值
     * @param time 时间(秒)
     * @return true成功 false失败
     */
    public boolean hmset(String key, Map<String, Object> map, long time) {
        try {
            redisTemplate.opsForHash().putAll(key, map);
            if (time > 0) {
                expire(key, time);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 向一张hash表中放入数据,如果不存在将创建
     *
     * @param key   键
     * @param item  项
     * @param value 值
     * @return true 成功 false失败
     */
    public boolean hset(String key, String item, Object value) {
        try {
            redisTemplate.opsForHash().put(key, item, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 向一张hash表中放入数据,如果不存在将创建
     *
     * @param key   键
     * @param item  项
     * @param value 值
     * @param time  时间(秒)  注意:如果已存在的hash表有时间,这里将会替换原有的时间
     * @return true 成功 false失败
     */
    public boolean hset(String key, String item, Object value, long time) {
        try {
            redisTemplate.opsForHash().put(key, item, value);
            if (time > 0) {
                expire(key, time);
            }
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 删除hash表中的值
     *
     * @param key  键 不能为null
     * @param item 项 可以使多个 不能为null
     */
    public void hdel(String key, Object... item) {
        redisTemplate.opsForHash().delete(key, item);
    }

    /**
     * 判断hash表中是否有该项的值
     *
     * @param key  键 不能为null
     * @param item 项 不能为null
     * @return true 存在 false不存在
     */
    public boolean hHasKey(String key, String item) {
        return redisTemplate.opsForHash().hasKey(key, item);
    }

    /**
     * hash递增 如果不存在,就会创建一个 并把新增后的值返回
     *
     * @param key  键
     * @param item 项
     * @param by   要增加几(大于0)
     * @return
     */
    public double hincr(String key, String item, double by) {
        return redisTemplate.opsForHash().increment(key, item, by);
    }

    /**
     * hash递减
     *
     * @param key  键
     * @param item 项
     * @param by   要减少记(小于0)
     * @return
     */
    public double hdecr(String key, String item, double by) {
        return redisTemplate.opsForHash().increment(key, item, -by);
    }

    //============================set=============================

    /**
     * 根据key获取Set中的所有值
     *
     * @param key 键
     * @return
     */
    public Set<Object> sGet(String key) {
        try {
            return redisTemplate.opsForSet().members(key);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 根据value从一个set中查询,是否存在
     *
     * @param key   键
     * @param value 值
     * @return true 存在 false不存在
     */
    public boolean sHasKey(String key, Object value) {
        try {
            return redisTemplate.opsForSet().isMember(key, value);
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将数据放入set缓存
     *
     * @param key    键
     * @param values 值 可以是多个
     * @return 成功个数
     */
    public long sSet(String key, Object... values) {
        try {
            return redisTemplate.opsForSet().add(key, values);
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 将set数据放入缓存
     *
     * @param key    键
     * @param time   时间(秒)
     * @param values 值 可以是多个
     * @return 成功个数
     */
    public long sSetAndTime(String key, long time, Object... values) {
        try {
            Long count = redisTemplate.opsForSet().add(key, values);
            if (time > 0) expire(key, time);
            return count;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 获取set缓存的长度
     *
     * @param key 键
     * @return
     */
    public long sGetSetSize(String key) {
        try {
            return redisTemplate.opsForSet().size(key);
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 移除值为value的
     *
     * @param key    键
     * @param values 值 可以是多个
     * @return 移除的个数
     */
    public long setRemove(String key, Object... values) {
        try {
            Long count = redisTemplate.opsForSet().remove(key, values);
            return count;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 获取两个key的不同value
     *
     * @param key1 键
     * @param key2 键
     * @return 返回key1中和key2的不同数据
     */
    public Set<Object> setDiff(String key1, String key2) {
        try {
            return redisTemplate.opsForSet().difference(key1, key2);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 获取两个key的不同数据，放到key3中
     *
     * @param key1 键
     * @param key2 键
     * @param key3 键
     * @return 返回成功数据
     */
    public Boolean setDifferenceAndStore(String key1, String key2, String key3) {
        try {
            redisTemplate.opsForSet().differenceAndStore(key1, key2, key3);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 获取两个key的所有数据，放到key3中
     *
     * @param key1 键
     * @param key2 键
     * @param key3 键
     * @return 返回成功数据
     */
    public Boolean setUnionAndStore(String key1, String key2, String key3) {
        try {
            redisTemplate.opsForSet().unionAndStore(key1, key2, key3);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 随机获取指定数量的元素,同一个元素可能会选中两次
     *
     * @param key
     * @param count
     * @return
     */
    public List<Object> setRandomSet(String key, long count) {
        return redisTemplate.opsForSet().randomMembers(key, count);
    }

    /**
     * 随机获取指定数量的元素,去重(同一个元素只能选择一次)
     *
     * @param key
     * @param count
     * @return
     */
    public Set<Object> setRandomSetDistinct(String key, long count) {
        return redisTemplate.opsForSet().distinctRandomMembers(key, count);
    }

    //===============================list=================================

    /**
     * 获取list缓存的内容
     *
     * @param key   键
     * @param start 开始
     * @param end   结束  0 到 -1代表所有值
     * @return
     */
    public List<Object> lGet(String key, long start, long end) {
        try {
            return redisTemplate.opsForList().range(key, start, end);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 获取list缓存的长度
     *
     * @param key 键
     * @return
     */
    public long lGetListSize(String key) {
        try {
            return redisTemplate.opsForList().size(key);
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    /**
     * 通过索引 获取list中的值
     *
     * @param key   键
     * @param index 索引  index>=0时， 0 表头，1 第二个元素，依次类推；index<0时，-1，表尾，-2倒数第二个元素，依次类推
     * @return
     */
    public Object lGetIndex(String key, long index) {
        try {
            return redisTemplate.opsForList().index(key, index);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @return
     */
    public boolean lSet(String key, Object value) {
        try {
            redisTemplate.opsForList().rightPush(key, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将元素放到list左边
     *
     * @param key   键
     * @param value 值
     * @return
     */
    public boolean leftSet(String key, Object value) {
        try {
            redisTemplate.opsForList().leftPush(key, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @param time  时间(秒)
     * @return
     */
    public boolean lSet(String key, Object value, long time) {
        try {
            redisTemplate.opsForList().rightPush(key, value);
            if (time > 0) expire(key, time);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @return
     */
    public boolean lSet(String key, List<Object> value) {
        try {
            redisTemplate.opsForList().rightPushAll(key, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 将list放入缓存
     *
     * @param key   键
     * @param value 值
     * @param time  时间(秒)
     * @return
     */
    public boolean lSet(String key, List<Object> value, long time) {
        try {
            redisTemplate.opsForList().rightPushAll(key, value);
            if (time > 0) expire(key, time);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 根据索引修改list中的某条数据
     *
     * @param key   键
     * @param index 索引
     * @param value 值
     * @return
     */
    public boolean lUpdateIndex(String key, long index, Object value) {
        try {
            redisTemplate.opsForList().set(key, index, value);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * 移除N个值为value
     *
     * @param key   键
     * @param count 移除多少个
     * @param value 值
     * @return 移除的个数
     */
    public long lRemove(String key, long count, Object value) {
        try {
            Long remove = redisTemplate.opsForList().remove(key, count, value);
            return remove;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    public boolean lRemoveAll(String key, int start, int end) {
        try {
            redisTemplate.opsForList().trim(key, start, end);
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    //模糊匹配缓存中的key
    public Set<String> getVagueKey(String pattern) {
        return redisTemplate.keys("*" + pattern + "*");
    }


    /**
     * 获取redis服务器时间
     * 保证集群环境下时间一致
     *
     * @return
     */
    public long currtTimeFromRedis() {
        return redisTemplate.execute(new RedisCallback<Long>() {
            @Override
            public Long doInRedis(RedisConnection connection) throws DataAccessException {
                return connection.time();
            }
        });
    }

    /**
     * redis分布式加锁
     *
     * @param lockKey   锁的key值
     * @param lockValue 锁的value
     * @param lockTime  锁时间(毫秒)
     * @return 是否成功加锁
     */
    public boolean lock(String lockKey, long lockValue, long lockTime) {

        boolean isLock = false;

        //循环10次获得锁
        for (int i = 0; i < 10; i++) {

            boolean isTrue = redisTemplate.execute(new RedisCallback<Boolean>() {
                @Override
                public Boolean doInRedis(RedisConnection redisConnection) throws DataAccessException {
                    final Jackson2JsonRedisSerializer serializer = new Jackson2JsonRedisSerializer(Object.class);
                    byte[] value = serializer.serialize(lockValue);
                    return redisConnection.setNX(lockKey.getBytes(), value);
                }
            });
            if (isTrue) {
                Boolean expire = redisTemplate.expire(lockKey, lockTime, TimeUnit.MILLISECONDS);
                isLock = true;
                return isLock;
            }
            try {
                TimeUnit.MILLISECONDS.sleep(100);//睡眠100毫秒
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
        return isLock;
    }

    /**
     * 分布式锁解锁
     * 加锁者可解锁，非加锁者等待过期 不可解锁
     *
     * @param lockKey
     * @param lockValue
     */
    public void unlock(String lockKey, long lockValue) {
        Long oldLockValue = Long.valueOf(redisTemplate.opsForValue().get(lockKey).toString());
        if (null != oldLockValue && lockValue == oldLockValue) {
            del(lockKey);
        }
    }

    /**
     * reids查询用户附近的人
     *
     * @param channel
     * @param message
     */
    public void sendMessage(String channel, String message) {
        redisTemplate.convertAndSend(channel, message);
    }

    /**
     * push消息
     *
     * @param key
     * @param message
     */
    public void pushMessage(String key, String message) {
        redisTemplate.opsForList().leftPush(key, message);
    }

    public List<GeoResult<RedisGeoCommands.GeoLocation<Object>>> georadius(String key, double lo, double la, double radius, int limit) {
        try {
            Circle c = new Circle(new Point(lo, la), radius);
            RedisGeoCommands.GeoRadiusCommandArgs geoRadiusArgs = RedisGeoCommands.GeoRadiusCommandArgs.newGeoRadiusArgs();
            geoRadiusArgs = geoRadiusArgs.includeCoordinates().includeDistance();
            geoRadiusArgs.sortAscending();
            geoRadiusArgs.limit(limit);
            GeoResults<RedisGeoCommands.GeoLocation<Object>> geoResults = redisTemplate.boundGeoOps(key).geoRadius(c, geoRadiusArgs);
            return geoResults.getContent();
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    /**
     * Zset添加元素
     *
     * @param key
     * @param value
     * @param score
     */
    public Double addZsetScore(String key, String value, double score) {
        return redisTemplate.opsForZSet().incrementScore(key, value, score);
    }

    public Boolean updateZsetScore(String key, String value, double score) {
        return redisTemplate.opsForZSet().add(key, value, score);
    }

    /**
     * 获取指定key的scores正序，指定start-end位置的元素
     *
     * @param key
     * @param start
     * @param end
     * @return
     */
    public Set<ZSetOperations.TypedTuple<Object>> reverseRangeWithScores(String key, Integer start, Integer end) {
        return redisTemplate.opsForZSet().reverseRangeWithScores(key, start, end);
    }

    /**
     * 通过分数返回有序集合指定区间内的成员个数
     *
     * @param key
     * @param min
     * @param max
     */
    public Long zsetCountByscores(String key, double min, double max) {
        return redisTemplate.opsForZSet().count(key, min, max);
    }

    /**
     * 移除zset中的元素
     *
     * @param key
     * @param value
     */
    public Long removeZsetValue(String key, Object... value) {
        return redisTemplate.opsForZSet().remove(key, value);
    }

    /**
     * 移除分数区间内的元素
     *
     * @param key
     * @param min
     * @param max
     */
    public void removeZetRangeByScore(String key, double min, double max) {
        redisTemplate.opsForZSet().removeRangeByScore(key, min, max);
    }

    public Double getZscore(String key, Object value) {
        return redisTemplate.opsForZSet().score(key, value);
    }

    public Long reverseRank(String key, Object value) {
        return redisTemplate.opsForZSet().reverseRank(key, value);
    }

    public Long getZcard(String key) {
        return redisTemplate.opsForZSet().zCard(key);
    }

    public Set<Object> getZrevrange(String key, int start, int end) {
        return redisTemplate.opsForZSet().reverseRange(key, start, end);
    }

    public byte[] getSerializeKeyBytes(String str) {
        RedisSerializer<String> stringSerializer = new StringRedisSerializer();
        return stringSerializer.serialize(str);
    }

    public byte[] getSerializeValueBytes(String str) {
        RedisSerializer<Object> stringSerializer = new JdkSerializationRedisSerializer();
        return stringSerializer.serialize(str);
    }

    public List<Object> executePipelined(RedisCallback<List<Object>> action) {
        return redisTemplate.executePipelined(action);
    }

    public Set<String> getValueKeyByPrefix(String prefixPattern) {
        return redisTemplate.keys(prefixPattern + "*");
    }

    /**
     * 序列表字节存储redis
     *
     * @param bkey
     * @param bvalue
     * @return
     */
    public boolean setEx(byte[] bkey, byte[] bvalue) {
        return redisTemplate.execute(new RedisCallback<Boolean>() {
            @Override
            public Boolean doInRedis(RedisConnection connection) throws DataAccessException {
                connection.set(bkey, bvalue);
                return true;
            }
        });
    }

    public boolean delEx(byte[] bkey, byte[] bvalue) {
        return redisTemplate.execute(new RedisCallback<Boolean>() {
            @Override
            public Boolean doInRedis(RedisConnection connection) throws DataAccessException {
                connection.del(bkey, bvalue);
                return true;
            }
        });
    }

    /**
     * 设置有过期时间的key
     *
     * @param bkey
     * @param bvalue
     * @param time
     * @return
     */
    public boolean setExByExpiredTime(byte[] bkey, byte[] bvalue, long time) {
        return redisTemplate.execute(new RedisCallback<Boolean>() {
            @Override
            public Boolean doInRedis(RedisConnection connection) throws DataAccessException {
                connection.setEx(bkey, time, bvalue);
                return true;
            }
        });
    }

    /**
     * 获取value的字节形式值
     *
     * @param args
     * @return
     */
    public byte[] getKeyByteArr(String... args) {
        byte[] bytes = null;
        try {
            bytes = getKeyStr(args).getBytes("utf-8");
        } catch (UnsupportedEncodingException e) {
            //log.error(e.getMessage());
        }
        return bytes;
    }

    public String getKeyStr(String... args) {
        StringBuilder tempKey = new StringBuilder(keyPrefix);
        for (String s : args) {
            if (args.length > 0) {
                tempKey.append("_");
            }
            tempKey.append(s);
        }
        return tempKey.toString();
    }

    public byte[] getByteValue(byte[] bkey) {
        return redisTemplate.execute(new RedisCallback<byte[]>() {
            @Override
            public byte[] doInRedis(RedisConnection connection) throws DataAccessException {
                return connection.get(bkey);
            }
        });
    }

    public Set<Object> getZetRangeByScore(String key, double min, double max) {
        return redisTemplate.opsForZSet().rangeByScore(key, min, max);
    }

}