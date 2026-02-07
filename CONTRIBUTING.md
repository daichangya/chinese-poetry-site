# 贡献指南

欢迎参与诗词内容的纠错与完善。

## 数据来源

本站诗词原始数据来源于开源仓库 [chinese-poetry](https://github.com/daichangya/chinese-poetry)，最全中华古诗词数据库（唐诗、宋诗、宋词等）。

## 如何贡献

- 在**诗词详情页**右侧栏点击「纠错与完善/内容贡献」按钮，可跳转到该首诗的源文件（Markdown）进行编辑。
- 每首诗对应一个 `poems/作者slug/诗题slug.md` 文件，可增补或修改正文、译文、注释、赏析、拼音等。
- 修改后执行站点的构建流程（如 `npm run build`）即可更新站点与搜索索引。

## 仓库与文档

诗词 Markdown 内容托管于 [chinese-poetry-md](https://github.com/daichangya/chinese-poetry-md)，可通过该仓库的 [Pull Requests](https://github.com/daichangya/chinese-poetry-md/pulls) 参与编辑与讨论。本站代码仓库为 [chinese-poetry-site](https://github.com/daichangya/chinese-poetry-site)。

更多说明见 [README](README.md) 与 [docs/README.md](docs/README.md)。
