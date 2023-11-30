import path from 'path';
import type { Configuration, EntryObject, RuleSetRule, WebpackPluginInstance } from 'webpack';
import WebpackBuildNotifierPlugin from 'webpack-build-notifier';
import { WebpackPluginServe } from 'webpack-plugin-serve';

import WebpackBuildNotifierLoggingPlugin from './WebpackBuildNotifierLoggingPlugin';

interface CreateWebpackConfigOptions {
  suffix: string;
  entryPoints: EntryObject;
  outputDir: string;
  additionalConfiguration: Configuration;
  serve: boolean;
  root?: string[];
}

export function createWebpackConfig(options: CreateWebpackConfigOptions): Configuration {
  const { suffix, entryPoints, outputDir, additionalConfiguration, serve, root } = options;

  const config: Configuration = {
    mode: 'development',
    entry: entryPoints,
    output: {
      path: outputDir,
      publicPath: '',
      filename: `[name]${suffix}.js`,
      library: {
        type: 'umd',
        name: {
          amd: '[name]',
          commonjs: '[name]',
          root: root ?? ['bitmovin', 'playerx'],
        },
      },
      pathinfo: false,
    },
    target: ['web', 'es6'],
    resolve: {
      extensions: ['.webpack.js', '.web.js', '.ts', '.js'],
    },
    module: {
      rules: getLoaders(),
    },
    optimization: {
      minimize: false,
      chunkIds: 'deterministic',
      moduleIds: 'deterministic',
      splitChunks: {},
      usedExports: true,
    },
    plugins: getPlugins(false, serve ? ['./static'] : []),
    performance: {
      // Disable "asset size exceeds the recommended limit (244 KiB)" warnings
      hints: false,
    },
  };

  return Object.assign(config, additionalConfiguration);
}

function getLoaders(): RuleSetRule[] {
  const defaultLoader: RuleSetRule[] = [
    {
      loader: 'ts-loader',
      options: {
        configFile: 'tsconfig.json',
      },
    },
  ];

  return [
    {
      test: /\.(tsx?|js)$/,
      use: defaultLoader,
      exclude: RegExp('(.*node_modules.*)'),
    },
    {
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
      exclude: /node_modules/,
    },
  ];
}

function getPlugins(isProduction: boolean, serveDirs = []): WebpackPluginInstance[] {
  const plugins: WebpackPluginInstance[] = [];

  plugins.push(
    new WebpackBuildNotifierPlugin({
      title: 'Player Web X Package Template',
      suppressCompileStart: false,
      showDuration: true,
    }),
  );

  plugins.push(new WebpackBuildNotifierLoggingPlugin());

  if (serveDirs.length) {
    plugins.push(
      new WebpackPluginServe({
        static: [path.join(process.cwd(), '/')],
        port: 8080,
        open: true,
        hmr: false,
        liveReload: false,
        log: { level: 'debug' },
        host: 'localhost',
        historyFallback: {
          index: 'static/index.html',
        },
      }),
    );
  }

  return plugins;
}
