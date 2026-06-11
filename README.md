# Lava Blog

基于 [VitePress](https://vitepress.dev/) 与 [@sugarat/theme](https://theme.sugarat.top/) 搭建的个人博客，支持 GitHub Pages 自动部署。

## 本地开发

```sh
pnpm install
pnpm dev
```

## 构建与预览

```sh
pnpm build
pnpm serve
```

## GitHub Pages 部署

项目已内置 `.github/workflows/deploy.yml`，推送到 `main` 分支后会自动构建并部署到 GitHub Pages。

首次部署前请在 GitHub 仓库中完成：

1. 打开 `Settings -> Pages`。
2. 将 `Build and deployment -> Source` 设置为 `GitHub Actions`。
3. 如果仓库名不是 `blog`，修改 `.github/workflows/deploy.yml` 中的 `REPOSITORY_NAME`，或修改 `docs/.vitepress/config.mts` 的默认仓库名。
4. 如果仓库是 `lava.github.io` 这类用户/组织站点，将 `REPOSITORY_NAME` 设置为空字符串。

## 写作

建议把文章放在 `docs/posts/` 目录，Markdown 文件头部可添加：

```md
---
title: 文章标题
description: 文章摘要
date: 2026-06-11
tags:
  - Tag
categories:
  - 分类
---
```
