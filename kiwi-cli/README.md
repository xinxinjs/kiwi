# 🐤 kiwi cli

Kiwi 的 CLI 工具，基于阿里巴巴的kiwi-cli进行封装，

二次开发kiwi --extract 命令:

- 支持扫描.js文件中的中文

- 如果不配置googleApiKey，则使用Microsoft bing translate

## 如何使用

> yarn global add ca-kiwi-clis

> 推荐与[🐤 Kiwi-国际化全流程解决方案](https://github.com/alibaba/kiwi)结合使用

## CLI 参数

### ca-kiwi `--init`

初始化项目，生成 kiwi 的配置文件 `kiwi-config.json`

```js
{
  // kiwi文件根目录，用于放置提取的langs文件
  "kiwiDir": "./.kiwi",

  // 配置文件目录，若调整配置文件，此处可手动修改
  "configFile": "./.kiwi/kiwi-config.json",

  // 语言目录名，注意连线和下划线
  "srcLang": "zh-CN",
  "distLangs": ["en-US", "zh-TW"],

  // googleApiKey
  "googleApiKey": "",

  // baiduApiKey
  "baiduApiKey":
    "appId": '',
    "appKey": ''
  },

  // 百度翻译的语种代码映射 详情见官方文档 https://fanyi-api.baidu.com/doc/21
  "baiduLangMap": {
    "en-US": 'en',
    "zh-TW": 'cht'
  },

  // import 语句，不同项目请自己配置
  "importI18N": "",

  // 可跳过的文件夹名或者文加名，比如docs、mock等
  "ignoreDir": "",
  "ignoreFile": ""
}
```

### ca-kiwi `--extract`

一键批量替换指定文件夹下的所有文案，如果配置了googleApiKey，使用Google翻译生成key，如果没有配置Google，则需要配置baiduApiKey，自动使用百度翻译生成key

```shell script
ca-kiwi --extract [dirPath]
```

![批量替换](https://raw.githubusercontent.com/alibaba/kiwi/master/kiwi-cli/public/extract.gif)

### ca-kiwi `--import`

导入翻译文案，将翻译人员翻译的文案，导入到项目中

```shell script
# 导入送翻后的文案
ca-kiwi --import [filePath] en-US
```

### ca-kiwi `--export`

导出未翻译的文案

```shell script
# 导出指定语言的文案，lang取值为配置中distLangs值，如en-US导出还未翻译成英文的中文文案
ca-kiwi --export [filePath] en-US
```

### ca-kiwi `--sync`

同步各种语言的文案，同步未翻译文件

### ca-kiwi `--mock`

使用 Google 翻译，翻译未翻译的文案
如果同时配置baiduApiKey与baiduApiKey 则命令行可手动选择翻译源

### ca-kiwi `--translate`

全量翻译未翻译的中文文案，翻译结果自动导入 en-US zh-TW等目录

```shell script
ca-kiwi --translate
```

