// Inspired by
// - https://github.com/google/zx
// - https://github.com/antfu/unplugin-auto-import
import { writeFileSync } from 'fs';
import { join } from 'path';
import { IApi } from '../../types';
import babelPlugin from './babelPlugin';

interface ILib {
  // 通常是包名
  importFrom: string;
  // 成员列表
  members?: string[];
  // 如有配置，用 obj.prop 的方式使用，比如 techui
  withObj?: string;
  // 是否是 import * as xx from 'xx'; 的方式
  namespaceImport?: string;
  // 是否是 import xx from 'xx'; 的方式
  defaultImport?: string;
}

export interface IOpts {
  withObjs: Record<string, any>;
  identifierToLib: Record<string, string>;
  defaultToLib: Record<string, string>;
  namespaceToLib: Record<string, string>;
}

export default (api: IApi) => {
  api.describe({
    key: 'lowImport',
    config: {
      schema(Joi) {
        return Joi.object({
          libs: Joi.array(),
        });
      },
    },
    enableBy: api.EnableBy.config,
  });

  api.modifyAppData(async (memo) => {
    memo.lowImport = [
      await api.applyPlugins({
        key: 'addLowImportLibs',
        initialValue: [],
      }),
      ...(api.config.lowImport.libs || []),
    ];
  });

  api.onStart(() => {
    // generate dts
    const dts = api.appData.lowImport.map((lib: ILib) => {
      if (lib.withObj) {
        const memberDts = (lib.members || [])
          .map(
            (member) =>
              `${member}: typeof import('${lib.importFrom}')['${member}'],`,
          )
          .join('\n');
        return `const ${lib.withObj} = {\n${memberDts}\n};`;
      } else if (lib.namespaceImport) {
        return `const ${lib.namespaceImport}: typeof import('${lib.importFrom}');`;
      } else if (lib.defaultImport) {
        return `const ${lib.defaultImport}: typeof import('${lib.importFrom}')['default'];`;
      } else {
        return (lib.members || [])
          .map(
            (member) =>
              `const ${member}: typeof import('${lib.importFrom}')['${member}'];`,
          )
          .join('\n');
      }
    });
    const content =
      `
// generate by umi
declare global {
${dts}
}
export {}
    `.trim() + `\n`;
    writeFileSync(join(api.paths.cwd, 'lowImport.d.ts'), content, 'utf-8');
  });

  api.addBeforeBabelPresets(() => {
    const opts = normalizeLibs(api.appData.lowImport);
    return [
      {
        plugins: [[babelPlugin, { opts }]],
      },
    ];
  });
};

function normalizeLibs(libs: ILib[]): IOpts {
  const withObjs: Record<string, any> = {};
  const identifierToLib: Record<string, string> = {};
  const defaultToLib: Record<string, string> = {};
  const namespaceToLib: Record<string, string> = {};
  for (const lib of libs) {
    if (lib.withObj) {
      withObjs[lib.withObj] = lib;
    } else if (lib.namespaceImport) {
      namespaceToLib[lib.namespaceImport] = lib.importFrom;
    } else if (lib.defaultImport) {
      defaultToLib[lib.defaultImport] = lib.importFrom;
    } else {
      for (const member of lib.members || []) {
        identifierToLib[member] = lib.importFrom;
      }
    }
  }
  return {
    withObjs,
    identifierToLib,
    defaultToLib,
    namespaceToLib,
  };
}
