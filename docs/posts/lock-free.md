---
title: lock-free Queue 学习
description: 学习lock free 队列实现的核心思想
date: 2026-06-11
tags:
  - VitePress
  - GitHub Pages
categories:
  - 博客
---

# Lock-free 队列

## 动机&基本思路

首先，所有的lock-free数据结构，都是为了提高在高并发下的性能。因为传统的有锁实现，在获取锁时，当另一个线程持有锁，当前线程会陷入“悲观的”等待，导致CPU中上下文切换（这才是真正锁的性能消耗的地方）。

这里有句话说的非常好, 揭示了lock-free的本质

> Lock free programming is really about replacing pessimistic blocking with optimistic retrying.

同时这里也提到了，在现代的实现中mutex的实现会自动进行几次自旋，从而提高性能，这里不做展开，后续会在另一篇中详细研究下。

lock-free的数据结构一般都是通过atomic原子变量结合 **CAS**实现。例如下面的例子：

```C++
std::atomic<int> value{42}
int expected=42；
int desired=100;
if (value.compare_exchange_strong(expected, desired)) {
		//success
} else {
	// failure, maybe need process the 
}
```

### CAS的CPU实现

这里插个题外话，CAS在CPU指令集上是如何实现的。

以x86为例，CAS通常对应指令：

```C++
lock cmpchg [mem], reg   // 比较 mem值与eax寄存器中的值是否相等，如果相等就将reg写入 mem，否则将mem写入eax
```

lock前缀代表这个指令是原子的不会被打断， 这是通过总线锁或MESI（缓存一致性协议）实现。

arm架构上没有单条CAS指令通常借助LDREX和STREX实现

## 简单实现

​    
