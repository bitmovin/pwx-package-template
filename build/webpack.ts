import * as path from 'path';
import type { Configuration, StatsOptions } from 'webpack';
import { webpack } from 'webpack';

import { createWebpackConfig } from './createWebpackConfig';
import { getPackages } from './packages';

enum WebpackBuilds {
  BUILD = 'build',
  SERVE = 'serve',
}

type WebpackBuildOptions = {
  [key in WebpackBuilds]: Configuration;
};

function getWebpackConfigs(): WebpackBuildOptions {
  const outputDir = path.resolve('./out');
  const sourceDir = path.resolve('./src');
  const packages = getPackages(sourceDir);

  const defaultStats: StatsOptions = {
    all: false,
    errors: true,
    warnings: true,
    timings: true,
  };

  const watchOptions = {
    aggregateTimeout: 600,
    ignored: ['/node_modules/', '/tooling/', '/lib'],
  };

  return {
    [WebpackBuilds.BUILD]: createWebpackConfig({
      entryPoints: packages,
      outputDir: outputDir,
      suffix: '.package',
      additionalConfiguration: {
        devtool: 'source-map',
        stats: { ...defaultStats, chunks: true },
      },
      serve: false,
      root: ['bitmovin', 'phoenix', '[name]'],
    }),
    [WebpackBuilds.SERVE]: createWebpackConfig({
      entryPoints: packages,
      outputDir: outputDir,
      suffix: '.package',
      additionalConfiguration: {
        devtool: 'source-map',
        stats: defaultStats,
        watch: true,
        watchOptions,
      },
      serve: true,
      root: ['bitmovin', 'phoenix', '[name]'],
    }),
  };
}

const target = ((process.env.TARGET as WebpackBuilds) || WebpackBuilds.BUILD).trim();
const webpackConfig = getWebpackConfigs()[target];

webpack(webpackConfig, (err, _stats) => {
  if (err) {
    console.error(err);
  }
});
