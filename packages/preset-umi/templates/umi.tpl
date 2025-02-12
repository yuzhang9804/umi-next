{{{ polyfillImports }}}
{{{ importsAhead }}}
import { renderClient } from '{{{ rendererPath }}}';
import { getRoutes } from './core/route';
import { getPlugins, getValidKeys } from './core/plugin';
import { PluginManager } from 'umi';
{{{ imports }}}

async function render() {
  const context = {
    ...await getRoutes(),
    pluginManager: PluginManager.create({
      plugins: getPlugins(),
      validKeys: getValidKeys(),
    }),
  };
  return renderClient(context);
}

{{{ entryCodeAhead }}}
render();
{{{ entryCode }}}
