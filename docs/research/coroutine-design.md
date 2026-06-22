---
title: coroutine 与 sylar 协程实现设计分析目录
description: cloudwu/coroutine 与 sylar 协程实现源码分析系列目录。
date: 2026-06-11
tags:
  - coroutine
  - ucontext
categories:
  - 源码分析
---

# coroutine 与 sylar 协程实现设计分析

本文是源码分析系列目录，围绕 [cloudwu/coroutine](https://github.com/cloudwu/coroutine) 与 [sylar-yin/sylar](https://github.com/sylar-yin/sylar) 的协程实现展开。

## 系列文章

* [cloudwu/coroutine 共享栈协程设计解析](./coroutine/cloudwu)
* [sylar Fiber/Scheduler/IOManager 协程运行时设计解析](./coroutine/sylar)
* [cloudwu/coroutine 与 sylar 协程实现对比](./coroutine/compare)

## 阅读路线

```mermaid
graph TD
  A[先理解 ucontext 上下文切换] --> B[阅读 cloudwu/coroutine]
  B --> C[掌握共享栈保存与恢复]
  C --> D[阅读 sylar Fiber]
  D --> E[理解 Scheduler 调度循环]
  E --> F[理解 IOManager + epoll 唤醒]
  F --> G[对比两种工程取舍]
```

如果你只想理解协程本质，建议先读 cloudwu/coroutine；如果你更关注服务器框架如何落地协程运行时，建议重点读 sylar。
