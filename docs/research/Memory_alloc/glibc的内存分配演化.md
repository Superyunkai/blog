# 初衷

内存管理一直是C++的优势，一直以来对于C++内存管理都局限于应用层面，没有深入到系统层面。趁最近的时间比较多，借鉴前人的经验，好好整理下相关的知识。总体路线分为：演进路线了解 和源码分析



# 演进路线

总体演进可以分为4个阶段：

Dlmalloc ---> ptmalloc --->ptmalloc2---> 现代glibc内存管理

## Dlmalloc时代

万丈高楼平地起，伟大的实现总是从简单的模型开始。dlmalloc提出在90年代，当时的多核并发并未普及，因此dlmalloc 主要是一个单堆模型，整个进程只有一个heap，每个heap被分为多个chunk, 每个chunk结构如下：

```shell
+------------------- +
|  Header(size|flag) |
+--------------------+
| User PayLoad       |
+--------------------+
|. Footer(边界信息)   |
+--------------------+
```

> 现代分配器中分配的chunk不一定保留footer，本文仅做理论分析，所以保留了Footer

**Bins：提高chunk查找效率**

现在我们有成千上万的chunk，每次malloc都需要找到未使用的chunk，这就跟在全校里找一个叫张三的学生，大海捞针，效率显然无法接受，但是如果已经知道张三是高二不一班的就快很多了。

dlmalloc也是同样引入了Bin机制，按照chunk的大小进行分类，分配时按目标去快速检索即可。这也是后来Fast Bin、Small Bin、Large Bin的雏形。

**内存碎片**

内存分配不仅要快，更要避免碎片问题。这时前面的Footer信息就派上用场了，当两个相邻Chunk释放时，就可以进行合并

## Ptmalloc时代

随着多线程的普及，dlmalloc的单堆模型迎来了挑战。由于每个进程只有一个堆，当多个线程都需要申请内存时，只能加一个全局锁，造成的结果就是 卡。

为了解决这个问题，Wolfram Gloger 开发了P tmalloc( Pthreads Malloc)

**核心创建：Arena（分配区）**

每个Arena都维护自己独立的：

+ 空闲Chunk
+ Top Chunk
+ Arena Chunk

这样不同线程可以在不同的Arena上完成分配，从而减少锁的竞争。

```shell
                     Process
                        │
        ┌───────────────┼───────────────┐
        │               │               │
     Arena 0         Arena 1         Arena 2
    (Main)          (Non-main)      (Non-main)
        │               │               │
      Heap        Heap Segments    Heap Segments
```

这里可以看到，区分了Main Arena 和 Non-Main Arena, 两者的内存管理的方式略有不同，Main Arena使用传统的 `brk/sbrk` 扩展，而Non-Arena通过mmap。

**Arena分配**

线程执行Malloc时，不是永久绑定一个Arena，而是优先复用最近使用的Arena，如果该Arena正在使用，则申请新Arena或者分配已有的Arena

**Arena数量限制**

不能无限制的创建Arena，那样的话内存很快就会炸裂的，GLIBC对Arena的限制如下：

```
#define NARENAS_FROM_NCORES(n) \ ((sizeof(long) == 4) ? 2 *(n) : 8*n)
```

也就是 64位系统： Arena 上限 = CPU核数 * 8

​            32 位系统： Arena上限 = CPU核数*2

## ptmalloc2与多级缓存

随着高并发的持续发展，Arena也已经不够看了。需要进一步优化多线程场景下的分配锁冲突。因此在Arena的基础上ptmalloc建立了一套复杂的缓存系统，尽可能让内存分配在用户态完成。

**多级缓存架构**

```shell
malloc()
  |
  |
TCache
  |
  |
Fast Bins
	|
	|
Unsorted Bin
	|
	|
Small Bin/ Large Bins
	|
	|
Top Chunk
	|
	|
brk/ mmp
```

设计目标非常明确：

> 尽可能复用已申请的内存快

**TCache**

TCache是线程级的内存缓存，它的特点是每个线程自己维护，完全无锁

**Fast Bin**

FastBin 缓存一组较小的Chunk，它的特点是：不会做碎片合并，不做复杂的链表修改，从而获取最大的性能。释放时直接插入头部，分配时也直接从头部去除，时间复杂度接近O（1）

**Unsorted Bin**

最近释放的一级缓存，当一个chunk被释放时，优先会进入这里

**Samll Bins和Large Bins**

两者分别管理不同尺寸的chunk，无非大小之分

**Top Chunk**

如果前面的缓存都无法满足需求，就会想TopChunk 申请Arena





