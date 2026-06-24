---
title: LLM 与 LLVM 基础面试题
description: Agent 后端开发中常见的 LLM 基础问题，并补充 LLVM 编译器基础。
date: 2026-06-11
tags:
  - LLM
  - LLVM
  - Agent
categories:
  - 面经
---

# LLM 与 LLVM 基础面试题

Agent 后端岗位通常重点考察 `LLM 基础`，但如果岗位涉及模型编译、推理优化、AI Infra，也可能问到 `LLVM`。本篇同时整理两部分。

## 一、LLM 基础

### 1. Transformer 的核心结构是什么？

回答要点：

* Transformer 由 Attention、FFN、残差连接、LayerNorm、位置编码等组成。
* 自注意力用于建模 token 之间的依赖关系。
* Decoder-only 架构常用于 GPT 类自回归语言模型。
* 推理时按 token 逐步生成，依赖 KV Cache 降低重复计算。

### 2. Attention 的计算过程是什么？

公式：

```text
Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V
```

解释：

* `Q` 表示当前位置要查询什么。
* `K` 表示每个 token 可以被匹配的特征。
* `V` 表示被聚合的信息。
* `softmax(QK^T)` 得到注意力权重。

### 3. 为什么 LLM 推理会慢？

主要瓶颈：

* 自回归生成必须逐 token 串行。
* 长上下文导致 Attention 计算和 KV Cache 占用变大。
* 大模型参数量大，显存和内存带宽压力高。
* 工具调用、RAG、网络请求会引入额外链路延迟。

优化方向：

* KV Cache、PagedAttention、FlashAttention。
* 量化、蒸馏、小模型路由。
* Prompt 压缩、上下文裁剪。
* 流式输出、异步工具调用、缓存。

### 4. Temperature、Top-p、Top-k 分别影响什么？

* `temperature`：控制概率分布平滑程度，越高越随机。
* `top-p`：从累计概率达到 p 的候选 token 中采样。
* `top-k`：只从概率最高的 k 个 token 中采样。
* 面向严肃问答、工具调用、代码生成时通常降低随机性。

### 5. Function Calling / Tool Calling 本质是什么？

本质是让模型按约定 schema 生成结构化调用参数，再由后端执行真实工具。

关键点：

* 模型不直接调用工具，只生成工具名和参数。
* 后端负责参数校验、权限控制、执行、重试和结果注入。
* 工具结果需要再次放回上下文，让模型继续推理。

### 6. Embedding 是什么？

Embedding 是将文本映射到高维向量空间的表示。语义相近的文本向量距离更近，常用于 RAG 检索、聚类、去重、推荐等场景。

常见相似度：

* Cosine Similarity
* Dot Product
* Euclidean Distance

### 7. Fine-tuning、RAG、Prompt Engineering 如何选择？

| 方式 | 适合场景 | 优点 | 缺点 |
| --- | --- | --- | --- |
| Prompt | 规则明确、轻量定制 | 成本低、迭代快 | 稳定性有限 |
| RAG | 需要外部知识、频繁更新 | 不改模型、知识可追溯 | 检索质量决定上限 |
| Fine-tuning | 风格、格式、领域能力固化 | 输出稳定、降低 prompt 复杂度 | 成本高、知识更新慢 |

面试表达：优先 Prompt/RAG 解决知识和流程问题，只有当输出风格、格式、领域模式长期稳定且 prompt 难以约束时再考虑微调。

## 二、LLVM 基础

### 1. LLVM 是什么？

LLVM 是一套模块化编译器基础设施，包含前端、中间表示 IR、优化器和后端代码生成能力。

典型链路：

```text
Source Code -> Frontend -> LLVM IR -> Optimizer -> Backend -> Machine Code
```

### 2. LLVM IR 的特点是什么？

* 静态单赋值 SSA 形式。
* 与源语言无关，便于跨语言优化。
* 类型明确，适合做中间层分析与优化。
* 可读文本格式 `.ll` 与 bitcode 格式 `.bc`。

### 3. Pass 是什么？

Pass 是 LLVM 中的分析或优化单元。

常见 Pass：

* 常量传播
* 死代码删除
* 循环优化
* 函数内联
* 指令合并

### 4. JIT 和 AOT 的区别？

* AOT：提前编译，运行时直接执行机器码，启动快、部署稳定。
* JIT：运行时编译，可利用运行时信息优化，但有编译开销。

AI Infra 中可能用 LLVM/MLIR 做模型算子编译、图优化和硬件后端适配。

### 5. LLVM 和 Agent 后端有什么关系？

一般业务 Agent 后端不会直接使用 LLVM。但在以下场景可能相关：

* 模型推理引擎优化。
* DSL 或代码生成 Agent。
* 沙箱执行、代码分析、编译诊断 Agent。
* AI 编译器、算子优化、MLIR 相关岗位。
