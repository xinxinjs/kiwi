/**
 * @author linhuiw
 * @desc 项目配置文件配置信息
 */

export const KIWI_CONFIG_FILE = 'kiwi-config.json';

export const PROJECT_CONFIG = {
  dir: './.kiwi',
  configFile: `./.kiwi/${KIWI_CONFIG_FILE}`,
  defaultConfig: {
    kiwiDir: './.kiwi',
    configFile: `./.kiwi/${KIWI_CONFIG_FILE}`,
    srcLang: 'zh-CN',
    distLangs: ['en-US'],
    googleApiKey: '',
    baiduApiKey: {
      appId: '',
      appKey: ''
    },
    baiduLangMap: {
      ['en-US']: 'en'
    },
    bingLangMap: {
      ['en-US']: 'en'
    },
    translateOptions: {
      concurrentLimit: 10,
      requestOptions: {}
    },
    importI18N: `import I18N from 'src/utils/I18N';`,
    ignoreDir: '',
    ignoreFile: ''
  },
  langMap: {
    ['en-US']: 'en'
  },
  zhIndexFile: `import common from './common';

export default Object.assign({}, {
  common
});`,
  zhTestFile: `export default {
    test: '测试'
  }`
};
