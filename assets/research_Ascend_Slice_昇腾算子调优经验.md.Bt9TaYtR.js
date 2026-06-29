import{j as s,b as n,c as p,ae as e}from"./chunks/framework.CFYg4X4w.js";const h=JSON.parse('{"title":"硬件架构介绍","description":"","frontmatter":{},"headers":[],"relativePath":"research/Ascend_Slice/昇腾算子调优经验.md","filePath":"research/Ascend_Slice/昇腾算子调优经验.md","lastUpdated":1782724353000}'),l={name:"research/Ascend_Slice/昇腾算子调优经验.md"};function i(t,a,c,r,o,d){return n(),p("div",{"data-pagefind-body":!0,"data-pagefind-meta":"date:1782724353000"},[...a[0]||(a[0]=[e(`<h1 id="硬件架构介绍" tabindex="-1">硬件架构介绍 <a class="header-anchor" href="#硬件架构介绍" aria-label="Permalink to “硬件架构介绍”">​</a></h1><p>达芬奇架构是华为昇腾 AI 芯片的核心架构，其设计目标是高效执行深度学习中的矩阵、向量和标量计算。它以 AI Core 为基本计算核心，在 AI Core 内部配置：</p><div class="language-"><button title="Copy Code" class="copy"></button><span class="lang"></span><pre class="shiki shiki-themes github-light github-dark" style="--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e;" tabindex="0" dir="ltr"><code><span class="line"><span>Da Vinci 架构核心组件</span></span>
<span class="line"><span>┌─────────────────────────────────────────────┐</span></span>
<span class="line"><span>│            Host CPU (x86/ARM)              │</span></span>
<span class="line"><span>│                    ↓ PCIe                   │</span></span>
<span class="line"><span>├─────────────────────────────────────────────┤</span></span>
<span class="line"><span>│             昇腾 NPU 芯片                   │</span></span>
<span class="line"><span>│  ┌─────────────────────────────────────┐   │</span></span>
<span class="line"><span>│  │       多个AI Core（计算核心）          │   │</span></span>
<span class="line"><span>│  │  ┌─────────────────────────────┐    │   │</span></span>
<span class="line"><span>│  │  │  Cube Unit（矩阵计算单元）    │    │   │</span></span>
<span class="line"><span>│  │  ├─────────────────────────────┤    │   │</span></span>
<span class="line"><span>│  │  │  Vector Unit（向量计算单元）  │    │   │</span></span>
<span class="line"><span>│  │  ├─────────────────────────────┤    │   │</span></span>
<span class="line"><span>│  │  │  Scalar Unit（标量计算单元）  │    │   │</span></span>
<span class="line"><span>│  │  └─────────────────────────────┘    │   │</span></span>
<span class="line"><span>│  │  ┌─────────────────────────────┐    │   │</span></span>
<span class="line"><span>│  │  │  Local Memory（片上SRAM）   │    │   │</span></span>
<span class="line"><span>│  │  │  - Buffer L1（输入缓存）    │    │   │</span></span>
<span class="line"><span>│  │  │  - Buffer L0（计算缓存）    │    │   │</span></span>
<span class="line"><span>│  │  │  - Buffer L0out（输出缓存） │    │   │</span></span>
<span class="line"><span>│  │  └─────────────────────────────┘    │   │</span></span>
<span class="line"><span>│  └─────────────────────────────────────┘   │</span></span>
<span class="line"><span>│                    ↓                         │</span></span>
<span class="line"><span>│  ┌─────────────────────────────────────┐   │</span></span>
<span class="line"><span>│  │      HBM（高带宽内存，32GB/s）      │   │</span></span>
<span class="line"><span>│  └─────────────────────────────────────┘   │</span></span>
<span class="line"><span>└─────────────────────────────────────────────┘</span></span></code></pre></div><ul><li>Cube Unit：负责矩阵乘法、卷积等张量计算，是主要算力来源。</li><li>Vector Unit：负责激活、归一化、逐元素运算、类型转换等向量计算。</li><li>Scalar Unit：负责循环、地址、分支和控制逻辑。</li><li>MTE：负责数据搬运、数据重排和格式转换。</li><li>片上 Buffer：减少 HBM/GM 访问，提高数据复用。</li></ul><p>它的编程和优化重点不是“启动大量线程”，而是：</p><p>切块 tiling 显式搬运 片上复用 流水线并行 事件同步 算子融合 低精度和稀疏优化</p><p>总结：</p><p>▎ 达芬奇架构是一种面向 AI 计算的数据流式 NPU 架构，通过 Cube、Vector、Scalar、MTE 和片上缓存的协同，将神经网络中的矩阵计算、向量计算和数据搬运组织成高吞吐、低功耗的流水线。</p><h1 id="tiling调优经验" tabindex="-1">tiling调优经验 <a class="header-anchor" href="#tiling调优经验" aria-label="Permalink to “tiling调优经验”">​</a></h1><p>tiling是SIMD编程模型中决定性能的关键因素，</p>`,10)])])}const f=s(l,[["render",i]]);export{h as __pageData,f as default};
