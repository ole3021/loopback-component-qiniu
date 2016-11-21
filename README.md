# loopback-component-storage-qiniu [Beta]
Loopback Storage for QiNiu Implementation

Loopback的七牛存储实现

## Usage

```json
  ...
  "storage": {
    "name": "storage",
    "connector": "loopback-component-storage-qiniu",
    "accessKey": "YourAccessToken",
    "secretKey": "YourSecret",
    "bucket": "wcn2-dev",
    "domain": "domain"
  }
```

`bucket` and `domain` are optional, `domain` is optional for `bucket`.

if `bucket` is set, will use the specific `bucket` only, and will similuate forlder as suggest in Qiniu.

if `bucket` is not set will use buckets as folders.

`domain` is optional for specific `bucket`, if not `domain` will use the default domain name.

---

`bucket` 和 `domain` 都是可选配置项，其中`domain`是`bucket`的从属性

如果设置了`bucket`，就会只使用指定的`bucket`进行存储，并按照七牛推荐方式模拟文件夹系统.

如果没有设置`bucket`, 会使用`bucket`作为文件夹存储

`domain`是指定`bucket`的可选属性，如果没有设置`domain`会使用默认的domain

## TODO
- [ ] Integration Test
