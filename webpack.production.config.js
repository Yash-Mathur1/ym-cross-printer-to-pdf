const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  mode: "production",
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
    libraryTarget: "umd",
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ["ts-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({ patterns: [{ from: "./src/SumatraPDF-3.4.6-32.exe" }] }),
  ],
  optimization: {
    minimizer: [
      new TerserPlugin({
        // Consumers read error.name and constructor.name when logging; mangled
        // class names would surface as single letters.
        terserOptions: { keep_classnames: true, keep_fnames: true },
      }),
    ],
  },
  target: "node",
  node: {
    __dirname: false,
  },
};
