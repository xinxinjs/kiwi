/**
 * @author doubledream
 * @desc 提取指定文件夹下的中文
 */

import * as _ from 'lodash';
import * as randomstring from 'randomstring';
import * as slash from 'slash2';
import * as path from 'path';
import { getSpecifiedFiles, readFile, writeFile } from './file';
import { findChineseText } from './findChineseText';
import { getSuggestLangObj } from './getLangData';
import { translateText, findMatchKey, findMatchValue, translateTextByBaidu } from '../utils';
import { replaceAndUpdate, hasImportI18N, createImportI18N } from './replace';
import { getProjectConfig } from '../utils';

const CONFIG = getProjectConfig();

/**
 * 递归匹配项目中所有的代码的中文
 */
function findAllChineseText(dir: string) {
  const dirPath = path.resolve(process.cwd(), dir);
  const files = getSpecifiedFiles(dirPath, CONFIG.ignoreDir, CONFIG.ignoreFile);
  const filterFiles = files.filter(file => {
    return file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.vue');
  });
  const allTexts = filterFiles.reduce((pre, file) => {
    const code = readFile(file);
    const texts = findChineseText(code, file);
    // 调整文案顺序，保证从后面的文案往前替换，避免位置更新导致替换出错
    const sortTexts = _.sortBy(texts, obj => -obj.range.start);

    if (texts.length > 0) {
      console.log(`${file} 发现中文文案`);
    }

    return texts.length > 0 ? pre.concat({ file, texts: sortTexts }) : pre;
  }, []);

  return allTexts;
}

/**
 * 递归匹配项目中所有的代码的中文
 * @param {dirPath} 文件夹路径
 */
function extractAll(dirPath?: string) {
  const {
    baiduApiKey: { appId, appKey },
    baiduLangMap
  } = CONFIG;
  if (!CONFIG.googleApiKey && (!appId || !appKey)) {
    console.log('请配置googleApiKey或baiduApiKey');
    return;
  }

  const dir = dirPath || './';
  const allTargetStrs = findAllChineseText(dir);
  if (allTargetStrs.length === 0) {
    console.log('没有发现可替换的文案！');
    return;
  }

  allTargetStrs.forEach(item => {
    const currentFilename = item.file;
    const targetStrs = item.texts;
    const suggestPageRegex = /\/pages\/\w+\/([^\/]+)\/([^\/\.]+)/;

    let suggestion = [];
    const finalLangObj = getSuggestLangObj();
    const virtualMemory = {};

    if (currentFilename.includes('/pages/')) {
      suggestion = currentFilename.match(suggestPageRegex);
    }
    if (suggestion) {
      suggestion.shift();
    }
    /** 如果没有匹配到 Key */
    if (!(suggestion && suggestion.length)) {
      const names = slash(currentFilename).split('/');
      const fileName = _.last(names) as any;
      const fileKey = fileName.split('.')[0].replace(new RegExp('-', 'g'), '_');
      const dir = names[names.length - 2].replace(new RegExp('-', 'g'), '_');
      if (dir === fileKey) {
        suggestion = [dir];
      } else {
        suggestion = [dir, fileKey];
      }
    }

    let allTranslateTexts: any = [] // 翻译之后的文案数组

    // 使用Google翻译或者百度翻译翻译中文的前四位
    if (CONFIG.googleApiKey) {
      const translatePromises = targetStrs.reduce((prev, curr) => {
        // 避免翻译的字符里包含数字或者特殊字符等情况
        const reg = /[^a-zA-Z\x00-\xff]+/g;
        const findText = curr.text.match(reg);
        const transText = findText ? findText.join('').slice(0, 4) : '中文符号';
        return prev.concat(translateText(transText, 'en_US'));
      }, []);

      allTranslateTexts = Promise.all(translatePromises);
    }else if (appId && appKey) {
      allTranslateTexts = extractKeyByBaidu(targetStrs);
    }

    allTranslateTexts.then(([...translateTexts]) => {
      const replaceableStrs = targetStrs.reduce((prev, curr, i) => {
        const key = findMatchKey(finalLangObj, curr.text);
        if (!virtualMemory[curr.text]) {
          if (key) {
            virtualMemory[curr.text] = key;
            return prev.concat({
              target: curr,
              key
            });
          }
          const uuidKey = `${randomstring.generate({
            length: 4,
            charset: 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'
          })}`;
          const handleText = translateTexts[i] ? _.camelCase(translateTexts[i] as string) : uuidKey;
          const reg = /[a-zA-Z]+/;
          // 对于翻译后的英文再次过滤，只保留英文字符
          const purifyText = handleText
            .split('')
            .filter(letter => reg.test(letter))
            .join('');
          const transText = purifyText || 'chineseSymbols';
          let transKey = `${suggestion.length ? suggestion.join('.') + '.' : ''}${transText}`;
          let occurTime = 1;
          // 防止出现前四位相同但是整体文案不同的情况
          while (
            findMatchValue(finalLangObj, transKey) !== curr.text &&
            _.keys(finalLangObj).includes(`${transKey}${occurTime >= 2 ? occurTime : ''}`)
          ) {
            occurTime++;
          }
          if (occurTime >= 2) {
            transKey = `${transKey}${occurTime}`;
          }
          virtualMemory[curr.text] = transKey;
          finalLangObj[transKey] = curr.text;
          return prev.concat({
            target: curr,
            key: transKey
          });
        } else {
          return prev.concat({
            target: curr,
            key: virtualMemory[curr.text]
          });
        }
      }, []);

      replaceableStrs
        .reduce((prev, obj) => {
          return prev.then(() => {
            return replaceAndUpdate(currentFilename, obj.target, `I18N.${obj.key}`, false);
          });
        }, Promise.resolve())
        .then(() => {
          // 添加 import I18N
          if (!hasImportI18N(currentFilename)) {
            console.log(123)
            const code = createImportI18N(currentFilename);

            writeFile(currentFilename, code);
          }
          console.log(`${currentFilename}替换完成！`);
        })
        .catch(e => {
          console.log(e.message);
        });
    })
    .catch(err => {
      if (err) {
        console.log('google或百度翻译出问题了...');
      }
    });
  });
}

async function extractKeyByBaidu(targetStrs) {
    const result = [];
    const taskLists = {};
    let lastIndex = 0;
    // 由于百度api单词翻译字符长度限制，需要将待翻译的文案拆分成单个子任务
    targetStrs.reduce((pre, next, index) => {
      const currText = next.text;
      // 避免翻译的字符里包含数字或者特殊字符等情况
      const reg = /[^a-zA-Z\x00-\xff]+/g;
      const findText = next.text.match(reg);
      const transText = findText ? findText.join('').slice(0, 4) : '中文符号';

      const byteLen = Buffer.byteLength(pre, 'utf8');
      if (byteLen > 5500) {
        // 获取翻译字节数，大于5500放到单独任务里面处理
        taskLists[lastIndex] = () => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(translateTextByBaidu(pre, 'en_US'));
            }, 1500);
          });
        };
        lastIndex = index;
        return next;
      } else if (index === targetStrs.length - 1) {
        taskLists[lastIndex] = () => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(translateTextByBaidu(`${pre}\n${transText}`, 'en_US'));
            }, 1500);
          });
        };
      }
      return `${pre}\n${transText}`;
    }, '');

    // 由于百度api调用QPS只有1, 考虑网络延迟 每1.5s请求一个子任务
    const taskKeys = Object.keys(taskLists);
    if (taskKeys.length > 0) {
      for (var i = 0; i < taskKeys.length; i++) {
        const langIndexKey = taskKeys[i];
        const taskItemFun = taskLists[langIndexKey];
        const data = await taskItemFun();
        (data || []).forEach(({ dst }, index) => {
          result.push(dst);
        });
      }
    }
  return result;
}

export { extractAll };
