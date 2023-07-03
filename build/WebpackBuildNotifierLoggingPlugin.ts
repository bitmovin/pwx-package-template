import type { Compiler, WebpackPluginInstance } from 'webpack';

export default class WebpackBuildNotifierLoggingPlugin implements WebpackPluginInstance {
  apply(compiler: Compiler) {
    compiler.hooks.watchRun.tap('Notifier', () => console.info('Build started...'));
    compiler.hooks.done.tap('Notifier', ({ compilation: { assets } }) => {
      const assetSummary = Object.keys(assets).map(assetName => ({ asset: assetName, size: assets[assetName].size() }));

      console.info('Build finished, generated assets:');
      console.table(assetSummary);
    });
  }
}
